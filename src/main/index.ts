import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import * as https from 'https'
import * as http from 'http'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// 1回だけ試みる（リダイレクト対応）
function tryFetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'GenCanvas/1.0 (Desktop App)',
        'Accept': 'image/png,image/jpeg,image/*'
      }
    }, (res) => {
      // リダイレクト追跡
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        tryFetch(res.headers.location).then(resolve).catch(reject)
        return
      }

      if (res.statusCode === 402) {
        reject(new Error('RATE_LIMIT'))
        return
      }

      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`HTTP_${res.statusCode}`))
        return
      }

      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const buffer = Buffer.concat(chunks)
        if (buffer.length < 1000) {
          // 小さすぎる = エラーレスポンス
          reject(new Error(`SMALL_RESPONSE_${buffer.length}`))
          return
        }
        resolve(`data:image/png;base64,${buffer.toString('base64')}`)
      })
      res.on('error', reject)
    })

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('REQUEST_TIMEOUT'))
    })
  })
}

// レート制限は5秒ごとに最大2分間リトライ
async function downloadWithPolling(url: string): Promise<string> {
  const MAX_MS = 120_000
  const POLL_MS = 5_000
  const start = Date.now()
  let attempts = 0

  while (Date.now() - start < MAX_MS) {
    attempts++
    try {
      console.log(`[GenCanvas] 試行 #${attempts} (経過 ${Math.round((Date.now() - start) / 1000)}s)`)
      const result = await tryFetch(url)
      console.log(`[GenCanvas] 成功 (試行 #${attempts})`)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[GenCanvas] エラー: ${msg}`)

      if (msg === 'RATE_LIMIT') {
        const elapsed = Date.now() - start
        if (elapsed + POLL_MS < MAX_MS) {
          console.log(`[GenCanvas] レート制限 - ${POLL_MS / 1000}秒後に再試行`)
          await sleep(POLL_MS)
          continue
        }
        throw new Error('RATE_LIMIT_TIMEOUT')
      }

      // レート制限以外のエラーは即throw
      throw err
    }
  }

  throw new Error('TIMEOUT_2MIN')
}

ipcMain.handle('generate-image', async (_event, url: string): Promise<string> => {
  console.log(`[GenCanvas] 生成開始: ${url.slice(0, 100)}...`)
  return downloadWithPolling(url)
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.gencanvas.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

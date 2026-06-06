import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import * as https from 'https'
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

// Node.js https モジュールで画像をダウンロードして base64 で返す
function downloadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 90000 }, (res) => {
      // リダイレクト対応
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location
        if (location) {
          downloadImage(location).then(resolve).catch(reject)
          return
        }
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
        const base64 = buffer.toString('base64')
        resolve(`data:image/png;base64,${base64}`)
      })
      res.on('error', reject)
    })

    request.on('error', reject)
    request.on('timeout', () => {
      request.destroy()
      reject(new Error('TIMEOUT'))
    })
  })
}

ipcMain.handle('generate-image', async (_event, url: string): Promise<string> => {
  const MAX_RETRIES = 3

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`[GenCanvas] 生成リクエスト (試行 ${attempt + 1}/${MAX_RETRIES}): ${url.slice(0, 80)}...`)
      const result = await downloadImage(url)
      console.log(`[GenCanvas] 生成成功`)
      return result
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[GenCanvas] エラー: ${errMsg}`)

      if (errMsg === 'RATE_LIMIT') {
        console.log(`[GenCanvas] レート制限 - ${6 * (attempt + 1)}秒待機`)
        await new Promise(r => setTimeout(r, 6000 * (attempt + 1)))
        continue
      }

      if (errMsg === 'TIMEOUT' || attempt === MAX_RETRIES - 1) {
        throw new Error(errMsg)
      }

      await new Promise(r => setTimeout(r, 3000))
    }
  }

  throw new Error('MAX_RETRIES_EXCEEDED')
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

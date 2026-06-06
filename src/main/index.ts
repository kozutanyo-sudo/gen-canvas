import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import * as https from 'https'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

interface Settings {
  hfToken: string
}

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function loadSettings(): Settings {
  try {
    const data = fs.readFileSync(getSettingsPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return { hfToken: '' }
  }
}

function saveSettings(settings: Settings): void {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2))
}

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

function generateWithHuggingFace(
  prompt: string,
  width: number,
  height: number,
  token: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      inputs: prompt,
      parameters: { width, height, num_inference_steps: 4, guidance_scale: 3.5 }
    })

    const options = {
      hostname: 'router.huggingface.co',
      path: '/hf-inference/models/black-forest-labs/FLUX.1-schnell',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 120000
    }

    const req = https.request(options, (res) => {
      console.log(`[GenCanvas] HF Response: ${res.statusCode}`)

      if (res.statusCode === 503) {
        reject(new Error('MODEL_LOADING'))
        return
      }
      if (res.statusCode === 401 || res.statusCode === 403) {
        reject(new Error('INVALID_TOKEN'))
        return
      }
      if (res.statusCode === 429) {
        reject(new Error('RATE_LIMIT'))
        return
      }
      if (!res.statusCode || res.statusCode >= 400) {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          const body2 = Buffer.concat(chunks).toString()
          console.error(`[GenCanvas] HF Error body: ${body2.slice(0, 200)}`)
          reject(new Error(`HTTP_${res.statusCode}`))
        })
        return
      }

      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const buffer = Buffer.concat(chunks)
        if (buffer.length < 1000) {
          reject(new Error(`SMALL_RESPONSE_${buffer.length}`))
          return
        }
        const ct = res.headers['content-type'] || 'image/png'
        const mime = ct.startsWith('image/') ? ct.split(';')[0].trim() : 'image/png'
        resolve(`data:${mime};base64,${buffer.toString('base64')}`)
      })
      res.on('error', reject)
    })

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('REQUEST_TIMEOUT'))
    })
    req.write(body)
    req.end()
  })
}

async function generateWithRetry(
  prompt: string,
  width: number,
  height: number,
  token: string
): Promise<string> {
  const MAX_ATTEMPTS = 4
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    console.log(`[GenCanvas] 試行 #${i}: ${prompt.slice(0, 60)}...`)
    try {
      return await generateWithHuggingFace(prompt, width, height, token)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[GenCanvas] エラー: ${msg}`)

      if (msg === 'MODEL_LOADING' && i < MAX_ATTEMPTS) {
        console.log(`[GenCanvas] モデルロード中 - 15秒後に再試行`)
        await sleep(15000)
        continue
      }
      if (msg === 'RATE_LIMIT' && i < MAX_ATTEMPTS) {
        console.log(`[GenCanvas] レート制限 - 10秒後に再試行`)
        await sleep(10000)
        continue
      }
      throw err
    }
  }
  throw new Error('MAX_ATTEMPTS')
}

ipcMain.handle('get-settings', () => loadSettings())

ipcMain.handle('set-settings', (_event, settings: Settings) => {
  saveSettings(settings)
  return true
})

ipcMain.handle(
  'generate-image',
  async (_event, prompt: string, width: number, height: number): Promise<string> => {
    const settings = loadSettings()
    if (!settings.hfToken) {
      throw new Error('NO_TOKEN')
    }
    return generateWithRetry(prompt, width, height, settings.hfToken)
  }
)

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

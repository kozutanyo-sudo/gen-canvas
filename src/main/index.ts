import { app, shell, BrowserWindow, ipcMain, clipboard, nativeImage, dialog } from 'electron'
import archiver from 'archiver'
import { join } from 'path'
import * as https from 'https'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

interface Settings {
  hfToken: string
}

interface GenerateOptions {
  numSteps?: number
  guidanceScale?: number
  seed?: number
  refImage?: string
  strength?: number
  negativePrompt?: string
}

interface HistoryMetaItem {
  id: string
  filename: string
  prompt: string
  englishPrompt?: string
  style: string
  type: string
  createdAt: number
  params?: { steps: number; guidance: number; seed: number }
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
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2))
  } catch (e) {
    console.error('[GenCanvas] saveSettings failed:', e)
  }
}

function getHistoryDir(): string {
  return join(app.getPath('userData'), 'history')
}

function getHistoryMetaPath(): string {
  return join(getHistoryDir(), 'metadata.json')
}

function loadHistoryMeta(): HistoryMetaItem[] {
  const metaPath = getHistoryMetaPath()
  try {
    const raw = fs.readFileSync(metaPath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('metadata is not an array')
    return parsed
  } catch (e) {
    // Preserve corrupted file as a backup rather than silently losing all history
    if (fs.existsSync(metaPath)) {
      const backupPath = metaPath + '.bak'
      try { fs.copyFileSync(metaPath, backupPath) } catch { /* ignore backup failure */ }
      console.error('[GenCanvas] Corrupted metadata.json — backed up to .bak, resetting:', e)
    }
    return []
  }
}

function saveHistoryMeta(meta: HistoryMetaItem[]): void {
  try {
    fs.writeFileSync(getHistoryMetaPath(), JSON.stringify(meta))
  } catch (e) {
    console.error('[GenCanvas] saveHistoryMeta failed:', e)
  }
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
  token: string,
  options: GenerateOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const { numSteps = 4, guidanceScale = 3.5, seed, refImage, strength = 0.75, negativePrompt } = options
    const parameters: Record<string, unknown> = { width, height, num_inference_steps: numSteps, guidance_scale: guidanceScale }
    if (seed !== undefined && seed >= 0) parameters.seed = seed
    if (refImage) parameters.strength = strength
    if (negativePrompt?.trim()) parameters.negative_prompt = negativePrompt.trim()

    const bodyObj: Record<string, unknown> = { inputs: prompt, parameters }
    if (refImage) bodyObj.image = refImage.replace(/^data:image\/\w+;base64,/, '')

    const body = JSON.stringify(bodyObj)

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
  token: string,
  options: GenerateOptions = {}
): Promise<string> {
  const MAX_ATTEMPTS = 4
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    console.log(`[GenCanvas] 試行 #${i}: ${prompt.slice(0, 60)}...`)
    try {
      return await generateWithHuggingFace(prompt, width, height, token, options)
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

// 日本語→英語翻訳（Helsinki-NLP/opus-mt-ja-en）
function translateJaToEn(text: string, token: string): Promise<string> {
  return new Promise((resolve) => {
    const body = JSON.stringify({ inputs: text })
    const options = {
      hostname: 'router.huggingface.co',
      path: '/hf-inference/models/Helsinki-NLP/opus-mt-ja-en',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 30000
    }
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString())
          const translated = data[0]?.translation_text || data?.translation_text || ''
          console.log(`[GenCanvas] 翻訳: "${text}" → "${translated}"`)
          resolve(translated || text)
        } catch {
          resolve(text)
        }
      })
      res.on('error', () => resolve(text))
    })
    req.on('error', () => resolve(text))
    req.on('timeout', () => { req.destroy(); resolve(text) })
    req.write(body)
    req.end()
  })
}

ipcMain.handle('translate-text', async (_event, text: string): Promise<string> => {
  const settings = loadSettings()
  if (!settings.hfToken) return text
  return translateJaToEn(text, settings.hfToken)
})

ipcMain.handle('get-settings', () => {
  const settings = loadSettings()
  console.log(`[GenCanvas] get-settings: path=${getSettingsPath()} token=${settings.hfToken ? settings.hfToken.slice(0,8)+'...' : '(empty)'}`)
  return settings
})

ipcMain.handle('set-settings', (_event, settings: Settings) => {
  saveSettings(settings)
  return true
})

ipcMain.handle(
  'generate-image',
  async (_event, prompt: string, width: number, height: number, options?: GenerateOptions): Promise<string> => {
    const settings = loadSettings()
    if (!settings.hfToken) {
      throw new Error('NO_TOKEN')
    }
    return generateWithRetry(prompt, width, height, settings.hfToken, options)
  }
)

ipcMain.handle('save-history-item', (_event, item: {
  id: string; url: string; prompt: string; englishPrompt?: string;
  style: string; type: string; createdAt: number;
  params?: { steps: number; guidance: number; seed: number }
}): boolean => {
  try {
    const dir = getHistoryDir()
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const match = item.url.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!match) return false
    const [, ext, data] = match
    const filename = `${item.id}.${ext}`
    fs.writeFileSync(join(dir, filename), Buffer.from(data, 'base64'))

    let meta = loadHistoryMeta()
    meta = meta.filter(m => m.id !== item.id)
    meta.unshift({ id: item.id, filename, prompt: item.prompt, englishPrompt: item.englishPrompt, style: item.style, type: item.type, createdAt: item.createdAt, params: item.params })
    if (meta.length > 200) meta = meta.slice(0, 200)
    saveHistoryMeta(meta)
    return true
  } catch (e) {
    console.error('[GenCanvas] save-history-item error:', e)
    return false
  }
})

ipcMain.handle('load-history', (): object[] => {
  const dir = getHistoryDir()
  const meta = loadHistoryMeta()
  return meta.map(item => {
    try {
      const buffer = fs.readFileSync(join(dir, item.filename))
      const ext = item.filename.split('.').pop() || 'png'
      return {
        id: item.id,
        url: `data:image/${ext};base64,${buffer.toString('base64')}`,
        prompt: item.prompt,
        englishPrompt: item.englishPrompt || '',
        style: item.style,
        type: item.type,
        createdAt: item.createdAt,
        params: item.params,
      }
    } catch {
      return null
    }
  }).filter(Boolean)
})

ipcMain.handle('delete-history-item', (_event, id: string): boolean => {
  try {
    const meta = loadHistoryMeta()
    const item = meta.find(m => m.id === id)
    if (item) {
      try { fs.unlinkSync(join(getHistoryDir(), item.filename)) } catch { /* ファイルが既にない場合は無視 */ }
    }
    saveHistoryMeta(meta.filter(m => m.id !== id))
    return true
  } catch (e) {
    console.error('[GenCanvas] delete-history-item error:', e)
    return false
  }
})

ipcMain.handle('export-history-zip', async (_event, ids: string[]): Promise<boolean> => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'ZIP保存先を選択',
    defaultPath: `gencanvas-export-${Date.now()}.zip`,
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
  })
  if (!filePath) return false

  const dir = getHistoryDir()
  const meta = loadHistoryMeta()
  const targets = ids.length ? meta.filter(m => ids.includes(m.id)) : meta

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(filePath)
    const archive = archiver('zip', { zlib: { level: 6 } })
    output.on('close', resolve)
    output.on('error', reject)  // catch write-stream errors (disk full, permissions)
    archive.on('error', reject)
    archive.pipe(output)
    for (const item of targets) {
      const imgPath = join(dir, item.filename)
      if (fs.existsSync(imgPath)) {
        const label = item.prompt.slice(0, 30).replace(/[^\w぀-鿿]/g, '_')
        const ext = item.filename.split('.').pop() || 'png'
        archive.file(imgPath, { name: `${item.createdAt}-${label}.${ext}` })
      }
    }
    archive.finalize()
  })
  return true
})

ipcMain.handle('copy-to-clipboard', (_event, dataUrl: string): boolean => {
  try {
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
    return true
  } catch {
    return false
  }
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

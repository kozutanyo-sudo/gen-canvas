import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// settings.json をプリロード時に同期読み込み（ポート番号に依存しない）
function readTokenSync(): string {
  try {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    const settingsPath = path.join(appData, 'gen-canvas', 'settings.json')
    const data = fs.readFileSync(settingsPath, 'utf-8')
    return JSON.parse(data).hfToken || ''
  } catch {
    return ''
  }
}

function writeTokenSync(token: string): void {
  try {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    const dir = path.join(appData, 'gen-canvas')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ hfToken: token }, null, 2))
  } catch {
    // ignore
  }
}

const initialToken = readTokenSync()

const api = {
  // 同期でトークンを返す（Reactの初期stateに使用）
  getInitialToken: (): string => initialToken,
  saveToken: (token: string): void => writeTokenSync(token),

  generateImage: (prompt: string, width: number, height: number): Promise<string> =>
    ipcRenderer.invoke('generate-image', prompt, width, height),
  getSettings: (): Promise<{ hfToken: string }> => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: { hfToken: string }): Promise<boolean> =>
    ipcRenderer.invoke('set-settings', settings)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}

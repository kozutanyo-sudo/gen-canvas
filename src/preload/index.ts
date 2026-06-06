import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
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

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', {
      generateImage: (url: string): Promise<string> =>
        ipcRenderer.invoke('generate-image', url)
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = {
    generateImage: (url: string): Promise<string> =>
      ipcRenderer.invoke('generate-image', url)
  }
}

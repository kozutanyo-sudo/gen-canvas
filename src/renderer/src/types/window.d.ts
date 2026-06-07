interface GenCanvasApi {
  generateImage(
    prompt: string,
    width: number,
    height: number,
    options?: {
      numSteps?: number
      guidanceScale?: number
      seed?: number
      refImage?: string
      strength?: number
    }
  ): Promise<string>
  translateText(text: string): Promise<string>
  saveHistoryItem(item: Record<string, unknown>): Promise<void>
  loadHistory(): Promise<Record<string, unknown>[]>
  copyToClipboard(dataUrl: string): Promise<void>
  deleteHistoryItem(id: string): Promise<void>
  exportHistoryZip(ids: string[]): Promise<boolean>
  getInitialToken(): string
  saveToken(token: string): void
}

declare global {
  interface Window {
    api: GenCanvasApi
  }
}

export {}

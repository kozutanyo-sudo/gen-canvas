import { useState } from 'react'
import type { GeneratedImage } from '../App'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateImageViaMain = (p: string, w: number, h: number): Promise<string> =>
  (window as any).api.generateImage(p, w, h)

interface Props {
  batch: GeneratedImage[]
  selectedImage: GeneratedImage
  onSelectImage: (img: GeneratedImage) => void
  onBack: () => void
  onEvolve: (img: GeneratedImage) => void
}

export default function PreviewPanel({ batch, selectedImage, onSelectImage, onBack, onEvolve }: Props): JSX.Element {
  const [evolvePrompt, setEvolvePrompt] = useState('')
  const [cornerRadius, setCornerRadius] = useState(0)
  const [padding, setPadding] = useState(0)
  const [isEvolving, setIsEvolving] = useState(false)

  const size = selectedImage.type === 'icon' ? { w: 1024, h: 1024 } : { w: 1920, h: 1080 }

  // 追加指示ありで進化
  const handleEvolve = async (): Promise<void> => {
    if (isEvolving || !evolvePrompt.trim()) return
    setIsEvolving(true)
    try {
      const newPrompt = `${selectedImage.prompt}, ${evolvePrompt}`
      const dataUrl = await generateImageViaMain(newPrompt, size.w, size.h)
      onEvolve({ id: `${Date.now()}`, url: dataUrl, prompt: newPrompt, style: selectedImage.style, type: selectedImage.type, createdAt: Date.now() })
      setEvolvePrompt('')
    } catch {
      alert('進化に失敗しました。再度お試しください。')
    } finally {
      setIsEvolving(false)
    }
  }

  // 同じプロンプトで再生成（evolvePromptは使わない）
  const handleRegenerate = async (): Promise<void> => {
    if (isEvolving) return
    setIsEvolving(true)
    try {
      const dataUrl = await generateImageViaMain(selectedImage.prompt, size.w, size.h)
      onEvolve({ id: `${Date.now()}`, url: dataUrl, prompt: selectedImage.prompt, style: selectedImage.style, type: selectedImage.type, createdAt: Date.now() })
    } catch {
      alert('再生成に失敗しました。再度お試しください。')
    } finally {
      setIsEvolving(false)
    }
  }

  const handleDownload = (): void => {
    const a = document.createElement('a')
    a.href = selectedImage.url
    a.download = `gencanvas-${selectedImage.id}.png`
    a.click()
  }

  const borderRadius = `${cornerRadius * 5}px`
  const paddingPx = `${padding * 3}px`

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 中央：プレビュー */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0A0A] p-8 gap-4">

        {/* 複数枚サムネイルグリッド */}
        {batch.length > 1 && (
          <div className="flex gap-2 mb-2">
            {batch.map((img) => (
              <button
                key={img.id}
                onClick={() => onSelectImage(img)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  selectedImage.id === img.id ? 'border-[#7C3AED]' : 'border-[#2A2A2A] hover:border-[#555]'
                }`}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* 大きいプレビュー */}
        <div
          className="relative overflow-hidden bg-[#111111]"
          style={{ borderRadius, padding: paddingPx }}
        >
          <img
            src={selectedImage.url}
            alt={selectedImage.prompt}
            className="max-w-[400px] max-h-[400px] object-contain"
            style={{ borderRadius: cornerRadius > 0 ? `${cornerRadius * 3}px` : '0' }}
          />
        </div>
        <p className="text-sm text-[#555] text-center max-w-xs truncate">{selectedImage.prompt}</p>
      </div>

      {/* 右パネル */}
      <div className="w-72 border-l border-[#2A2A2A] flex flex-col overflow-y-auto p-5 gap-5 shrink-0">

        {/* 進化させる */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs text-[#A0A0A0] font-medium uppercase tracking-wider">✏️ 進化させる</h3>
          <textarea
            value={evolvePrompt}
            onChange={e => setEvolvePrompt(e.target.value)}
            placeholder="追加の指示 (例: もっと明るく)"
            rows={2}
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] resize-none focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
          <button
            onClick={handleEvolve}
            disabled={isEvolving || !evolvePrompt.trim()}
            className="w-full py-2 rounded-lg text-sm font-medium bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 transition-colors text-white"
          >
            {isEvolving ? '処理中...' : '🔄 変化させる'}
          </button>
          <button
            onClick={handleRegenerate}
            disabled={isEvolving}
            className="w-full py-2 rounded-lg text-sm font-medium bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] disabled:opacity-40 transition-colors text-[#A0A0A0]"
          >
            {isEvolving ? '処理中...' : '♻️ 同じ設定で再生成'}
          </button>
        </div>

        <hr className="border-[#2A2A2A]" />

        {/* 編集ツール (アイコンのみ) */}
        {selectedImage.type === 'icon' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xs text-[#A0A0A0] font-medium uppercase tracking-wider">🎨 編集</h3>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <label className="text-xs text-[#A0A0A0]">角丸</label>
                <span className="text-xs text-[#555]">{cornerRadius}</span>
              </div>
              <input type="range" min="0" max="20" value={cornerRadius}
                onChange={e => setCornerRadius(parseInt(e.target.value))}
                className="w-full accent-[#7C3AED]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <label className="text-xs text-[#A0A0A0]">余白</label>
                <span className="text-xs text-[#555]">{padding}</span>
              </div>
              <input type="range" min="0" max="20" value={padding}
                onChange={e => setPadding(parseInt(e.target.value))}
                className="w-full accent-[#7C3AED]" />
            </div>
          </div>
        )}

        <hr className="border-[#2A2A2A]" />

        {/* エクスポート */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs text-[#A0A0A0] font-medium uppercase tracking-wider">💾 エクスポート</h3>
          <button onClick={handleDownload}
            className="w-full py-2 rounded-lg text-sm font-medium bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] transition-colors text-white">
            📄 PNG でダウンロード
          </button>
          <button onClick={handleDownload}
            className="w-full py-2 rounded-lg text-sm font-medium bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors text-white">
            📦 全サイズ ZIP
          </button>
        </div>

        <hr className="border-[#2A2A2A]" />

        <button onClick={onBack}
          className="w-full py-2 rounded-lg text-sm text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] border border-[#2A2A2A] transition-colors">
          ← 戻る
        </button>
      </div>
    </div>
  )
}

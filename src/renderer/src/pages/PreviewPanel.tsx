import { useState, useRef, useEffect } from 'react'
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

const FONTS = [
  { id: 'sans',  label: 'ゴシック', value: "'BIZ UDPGothic','Yu Gothic UI',sans-serif" },
  { id: 'serif', label: '明朝',     value: "'BIZ UDMincho','Yu Mincho',serif" },
  { id: 'mono',  label: '等幅',     value: "'Consolas','Courier New',monospace" },
]

const TEXT_POSITIONS = [
  { id: 'top',    label: '上', x: 0.5, y: 0.12 },
  { id: 'middle', label: '中', x: 0.5, y: 0.5  },
  { id: 'bottom', label: '下', x: 0.5, y: 0.88 },
]

export default function PreviewPanel({ batch, selectedImage, onSelectImage, onBack, onEvolve }: Props): JSX.Element {
  const [evolvePrompt, setEvolvePrompt] = useState('')
  const [cornerRadius, setCornerRadius] = useState(0)
  const [padding, setPadding] = useState(0)
  const [isEvolving, setIsEvolving] = useState(false)

  // テキストオーバーレイ
  const [overlayText, setOverlayText] = useState('')
  const [textFont, setTextFont] = useState('sans')
  const [textSize, setTextSize] = useState(48)
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [textPos, setTextPos] = useState('bottom')
  const [textShadow, setTextShadow] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const size = selectedImage.type === 'icon' ? { w: 1024, h: 1024 } : { w: 1920, h: 1080 }

  // Canvas にテキスト合成してプレビュー用URLを生成
  const compositeImage = (): string | null => {
    if (!overlayText.trim()) return null
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const img = new Image()
    img.src = selectedImage.url
    canvas.width = img.naturalWidth || 1024
    canvas.height = img.naturalHeight || 1024
    ctx.drawImage(img, 0, 0)

    const fontObj = FONTS.find(f => f.id === textFont) || FONTS[0]
    const posObj = TEXT_POSITIONS.find(p => p.id === textPos) || TEXT_POSITIONS[2]
    const scaledSize = Math.round(textSize * (canvas.width / 512))

    ctx.font = `bold ${scaledSize}px ${fontObj.value}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const x = canvas.width * posObj.x
    const y = canvas.height * posObj.y

    if (textShadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = scaledSize * 0.3
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
    }

    ctx.fillStyle = textColor
    ctx.fillText(overlayText, x, y)
    ctx.shadowColor = 'transparent'

    return canvas.toDataURL('image/png')
  }

  // ダウンロード（テキストなし or テキスト合成あり）
  const handleDownload = (): void => {
    const composed = compositeImage()
    const href = composed || selectedImage.url
    const a = document.createElement('a')
    a.href = href
    a.download = `gencanvas-${selectedImage.id}.png`
    a.click()
  }

  // 進化させる
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

  // 同じプロンプトで再生成
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

  const borderRadius = `${cornerRadius * 5}px`
  const paddingPx = `${padding * 3}px`

  // テキストオーバーレイのCSSプレビュー（軽量）
  const posStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    ...(textPos === 'top'    ? { top: '8%' }    : {}),
    ...(textPos === 'middle' ? { top: '50%', transform: 'translate(-50%,-50%)' } : {}),
    ...(textPos === 'bottom' ? { bottom: '8%' } : {}),
    color: textColor,
    fontSize: `${Math.max(8, Math.round(textSize * 0.35))}px`,
    fontWeight: 'bold',
    fontFamily: FONTS.find(f => f.id === textFont)?.value,
    textShadow: textShadow ? '0 1px 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.7)' : 'none',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    maxWidth: '90%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

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
          {/* テキストオーバーレイ プレビュー */}
          {overlayText.trim() && (
            <span style={posStyle}>{overlayText}</span>
          )}
        </div>
        <p className="text-sm text-[#888] text-center max-w-xs truncate">{selectedImage.prompt}</p>
      </div>

      {/* 非表示Canvas（テキスト合成用） */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 右パネル */}
      <div className="w-72 border-l border-[#2A2A2A] flex flex-col overflow-y-auto p-5 gap-4 shrink-0">

        {/* テキストを追加 */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-[#AAAAAA]">✍️ テキストを追加</h3>
          <input
            type="text"
            value={overlayText}
            onChange={e => setOverlayText(e.target.value)}
            placeholder="例: GenCanvas"
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
          {overlayText.trim() && (
            <div className="flex flex-col gap-2">
              {/* フォント */}
              <div className="flex gap-1.5">
                {FONTS.map(f => (
                  <button key={f.id} onClick={() => setTextFont(f.id)}
                    className={`flex-1 py-1 text-xs rounded border transition-colors ${
                      textFont === f.id
                        ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white'
                        : 'bg-[#111] border-[#2A2A2A] text-[#AAAAAA]'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
              {/* 位置 */}
              <div className="flex gap-1.5">
                {TEXT_POSITIONS.map(p => (
                  <button key={p.id} onClick={() => setTextPos(p.id)}
                    className={`flex-1 py-1 text-xs rounded border transition-colors ${
                      textPos === p.id
                        ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white'
                        : 'bg-[#111] border-[#2A2A2A] text-[#AAAAAA]'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
              {/* サイズ */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#AAAAAA] w-8">小</span>
                <input type="range" min="16" max="120" value={textSize}
                  onChange={e => setTextSize(parseInt(e.target.value))}
                  className="flex-1 accent-[#7C3AED]" />
                <span className="text-xs text-[#AAAAAA] w-8 text-right">大</span>
              </div>
              {/* カラーと影 */}
              <div className="flex items-center gap-3">
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                <span className="text-xs text-[#AAAAAA]">テキスト色</span>
                <button onClick={() => setTextShadow(!textShadow)}
                  className={`ml-auto text-xs px-2 py-1 rounded border transition-colors ${
                    textShadow ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-[#2A2A2A] text-[#666]'
                  }`}>
                  影
                </button>
              </div>
            </div>
          )}
        </div>

        <hr className="border-[#2A2A2A]" />

        {/* 進化させる */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-[#AAAAAA]">✏️ 進化させる</h3>
          <textarea
            value={evolvePrompt}
            onChange={e => setEvolvePrompt(e.target.value)}
            placeholder="追加の指示 (例: もっと明るく)"
            rows={2}
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#666] resize-none focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
          <button onClick={handleEvolve} disabled={isEvolving || !evolvePrompt.trim()}
            className="w-full py-2 rounded-lg text-sm font-medium bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 transition-colors text-white">
            {isEvolving ? '処理中...' : '🔄 変化させる'}
          </button>
          <button onClick={handleRegenerate} disabled={isEvolving}
            className="w-full py-2 rounded-lg text-sm font-medium bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] disabled:opacity-40 transition-colors text-[#AAAAAA]">
            {isEvolving ? '処理中...' : '♻️ 同じ設定で再生成'}
          </button>
        </div>

        <hr className="border-[#2A2A2A]" />

        {/* 編集ツール (アイコンのみ) */}
        {selectedImage.type === 'icon' && (
          <>
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-[#AAAAAA]">🎨 編集</h3>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <label className="text-xs text-[#AAAAAA]">角丸</label>
                  <span className="text-xs text-[#888]">{cornerRadius}</span>
                </div>
                <input type="range" min="0" max="20" value={cornerRadius}
                  onChange={e => setCornerRadius(parseInt(e.target.value))}
                  className="w-full accent-[#7C3AED]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <label className="text-xs text-[#AAAAAA]">余白</label>
                  <span className="text-xs text-[#888]">{padding}</span>
                </div>
                <input type="range" min="0" max="20" value={padding}
                  onChange={e => setPadding(parseInt(e.target.value))}
                  className="w-full accent-[#7C3AED]" />
              </div>
            </div>
            <hr className="border-[#2A2A2A]" />
          </>
        )}

        {/* エクスポート */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-[#AAAAAA]">💾 エクスポート</h3>
          <button onClick={handleDownload}
            className="w-full py-2 rounded-lg text-sm font-medium bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors text-white">
            📄 PNG でダウンロード{overlayText.trim() ? '（テキスト込み）' : ''}
          </button>
        </div>

        <hr className="border-[#2A2A2A]" />

        <button onClick={onBack}
          className="w-full py-2 rounded-lg text-sm text-[#AAAAAA] hover:text-white hover:bg-[#1A1A1A] border border-[#2A2A2A] transition-colors">
          ← 戻る
        </button>
      </div>
    </div>
  )
}

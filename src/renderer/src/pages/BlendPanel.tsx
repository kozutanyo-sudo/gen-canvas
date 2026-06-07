import { useState, useEffect, useRef, useCallback } from 'react'
import type { GeneratedImage } from '../App'
import type { ToastType } from '../components/Toast'

type BlendMode = 'source-over' | 'screen' | 'multiply' | 'overlay' | 'soft-light' | 'difference' | 'lighten' | 'darken'

const BLEND_MODES: { id: BlendMode; label: string; desc: string }[] = [
  { id: 'source-over', label: '通常',        desc: 'BをAの上に重ねる' },
  { id: 'screen',      label: 'スクリーン',  desc: '明るく合成（光の重ね合わせ）' },
  { id: 'multiply',    label: '乗算',        desc: '暗く合成（テクスチャを乗せる）' },
  { id: 'overlay',     label: 'オーバーレイ', desc: 'コントラストを強調' },
  { id: 'soft-light',  label: 'ソフトライト', desc: '柔らかいオーバーレイ' },
  { id: 'difference',  label: '差分',        desc: 'ネガポジ反転効果' },
  { id: 'lighten',     label: '比較明',      desc: '明るい方を残す' },
  { id: 'darken',      label: '比較暗',      desc: '暗い方を残す' },
]

interface Props {
  images: [GeneratedImage, GeneratedImage]
  onBack: () => void
  onSave: (img: GeneratedImage) => void
  showToast: (msg: string, type?: ToastType) => void
}

export default function BlendPanel({ images, onBack, onSave, showToast }: Props): JSX.Element {
  const [blendMode, setBlendMode] = useState<BlendMode>('screen')
  const [opacityA, setOpacityA] = useState(100)
  const [opacityB, setOpacityB] = useState(80)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgARef = useRef<HTMLImageElement | null>(null)
  const imgBRef = useRef<HTMLImageElement | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let count = 0
    const onLoad = (): void => { count++; if (count === 2) setLoaded(true) }
    const a = new Image(); a.onload = onLoad; a.src = images[0].url
    const b = new Image(); b.onload = onLoad; b.src = images[1].url
    imgARef.current = a
    imgBRef.current = b
  }, [])

  const redraw = useCallback((): void => {
    const canvas = canvasRef.current
    const imgA = imgARef.current
    const imgB = imgBRef.current
    if (!canvas || !imgA?.complete || !imgB?.complete) return

    canvas.width = imgA.naturalWidth
    canvas.height = imgA.naturalHeight
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = opacityA / 100
    ctx.drawImage(imgA, 0, 0)

    ctx.globalCompositeOperation = blendMode
    ctx.globalAlpha = opacityB / 100
    ctx.drawImage(imgB, 0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }, [opacityA, opacityB, blendMode, loaded])

  useEffect(() => { redraw() }, [redraw])

  const handleDownload = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `gencanvas-blend-${Date.now()}.png`
    a.click()
    showToast('ダウンロードしました', 'success')
  }

  const handleSave = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    onSave({
      id: `blend-${Date.now()}`,
      url: canvas.toDataURL('image/png'),
      prompt: `[合成] ${images[0].prompt} + ${images[1].prompt}`,
      englishPrompt: `${images[0].englishPrompt} blended with ${images[1].englishPrompt}`,
      style: images[0].style,
      type: images[0].type,
      createdAt: Date.now(),
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[#2A2A2A] shrink-0">
        <button onClick={onBack} className="text-sm text-[#777] hover:text-white transition-colors">← 戻る</button>
        <h2 className="text-sm font-semibold text-white">🎭 ブレンド合成</h2>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 画像A */}
        <div className="w-44 border-r border-[#2A2A2A] p-4 flex flex-col gap-3 shrink-0">
          <p className="text-xs font-semibold text-[#AAAAAA] text-center">画像 A（ベース）</p>
          <img src={images[0].url} className="w-full aspect-square object-cover rounded-lg border border-[#2A2A2A]" />
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-[#AAAAAA]">不透明度</span>
              <span className="text-[10px] text-[#888]">{opacityA}%</span>
            </div>
            <input type="range" min="0" max="100" value={opacityA}
              onChange={e => setOpacityA(+e.target.value)}
              className="w-full accent-[#7C3AED]" />
          </div>
          <p className="text-[10px] text-[#555] leading-tight truncate" title={images[0].prompt}>{images[0].prompt}</p>
        </div>

        {/* 中央：キャンバス＋モード選択 */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 overflow-auto">
          <canvas
            ref={canvasRef}
            className="max-w-full rounded-xl border border-[#2A2A2A] shadow-xl"
            style={{ maxHeight: '45vh', imageRendering: 'auto' }}
          />

          {/* ブレンドモード */}
          <div className="flex flex-col items-center gap-2 w-full max-w-lg">
            <p className="text-xs text-[#AAAAAA] font-semibold">ブレンドモード</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {BLEND_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setBlendMode(m.id)}
                  title={m.desc}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    blendMode === m.id
                      ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                      : 'border-[#2A2A2A] text-[#777] hover:text-white hover:border-[#555]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#555]">
              {BLEND_MODES.find(m => m.id === blendMode)?.desc}
            </p>
          </div>

          {/* アクション */}
          <div className="flex gap-3">
            <button onClick={handleSave}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors">
              💾 履歴に保存してプレビュー
            </button>
            <button onClick={handleDownload}
              className="px-4 py-2.5 rounded-xl text-sm border border-[#3A3A3A] text-[#AAAAAA] hover:text-white transition-colors">
              📄 DL
            </button>
          </div>
        </div>

        {/* 画像B */}
        <div className="w-44 border-l border-[#2A2A2A] p-4 flex flex-col gap-3 shrink-0">
          <p className="text-xs font-semibold text-[#AAAAAA] text-center">画像 B（重ねる）</p>
          <img src={images[1].url} className="w-full aspect-square object-cover rounded-lg border border-[#2A2A2A]" />
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-[#AAAAAA]">不透明度</span>
              <span className="text-[10px] text-[#888]">{opacityB}%</span>
            </div>
            <input type="range" min="0" max="100" value={opacityB}
              onChange={e => setOpacityB(+e.target.value)}
              className="w-full accent-[#7C3AED]" />
          </div>
          <p className="text-[10px] text-[#555] leading-tight truncate" title={images[1].prompt}>{images[1].prompt}</p>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import type { GeneratedImage } from '../App'
import type { ToastType } from '../components/Toast'

const CELL_SIZES = [128, 256, 512] as const
const BG_OPTIONS = [
  { label: '黒', value: '#000000' },
  { label: '白', value: '#FFFFFF' },
  { label: '暗灰', value: '#111111' },
  { label: '薄灰', value: '#F0F0F0' },
  { label: '紫', value: '#7C3AED' },
  { label: '紺', value: '#1E1B4B' },
]

interface Props {
  images: GeneratedImage[]
  onBack: () => void
  showToast: (msg: string, type?: ToastType) => void
}

export default function CollagePanel({ images, onBack, showToast }: Props): JSX.Element {
  const [cols, setCols] = useState(Math.min(images.length, 4))
  const [gap, setGap] = useState(8)
  const [cellSize, setCellSize] = useState<128 | 256 | 512>(256)
  const [bgColor, setBgColor] = useState('#111111')
  const [customBg, setCustomBg] = useState('#111111')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loadedImgs, setLoadedImgs] = useState<HTMLImageElement[]>([])

  // 全画像をプリロード
  useEffect(() => {
    const arr: HTMLImageElement[] = new Array(images.length)
    let settled = 0
    const onSettled = (): void => {
      settled++
      if (settled === images.length) setLoadedImgs([...arr])
    }
    images.forEach((img, i) => {
      const el = new Image()
      el.onload = (): void => { arr[i] = el; onSettled() }
      el.onerror = (): void => { arr[i] = el; onSettled() } // prevent infinite hang
      el.src = img.url
    })
  }, [])

  // キャンバスを再描画
  useEffect(() => {
    if (loadedImgs.length !== images.length || loadedImgs.some(x => !x)) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rows = Math.ceil(images.length / cols)
    canvas.width  = cols * cellSize + (cols + 1) * gap
    canvas.height = rows * cellSize + (rows + 1) * gap
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    loadedImgs.forEach((imgEl, i) => {
      // skip falsy or broken images (naturalWidth=0 means load failed)
      if (!imgEl || imgEl.naturalWidth === 0) return
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = gap + col * (cellSize + gap)
      const y = gap + row * (cellSize + gap)

      // センタークロップで正方形に
      const srcSize = Math.min(imgEl.naturalWidth, imgEl.naturalHeight)
      const srcX = (imgEl.naturalWidth  - srcSize) / 2
      const srcY = (imgEl.naturalHeight - srcSize) / 2
      ctx.drawImage(imgEl, srcX, srcY, srcSize, srcSize, x, y, cellSize, cellSize)
    })
  }, [loadedImgs, cols, gap, cellSize, bgColor])

  const rows = Math.ceil(images.length / cols)
  const outW = cols * cellSize + (cols + 1) * gap
  const outH = rows * cellSize + (rows + 1) * gap

  const handleDownload = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `gencanvas-collage-${Date.now()}.png`
    a.click()
    showToast('コラージュをダウンロードしました', 'success')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[#2A2A2A] shrink-0">
        <button onClick={onBack} className="text-sm text-[#777] hover:text-white transition-colors">← 戻る</button>
        <h2 className="text-sm font-semibold text-white">
          🖼 コラージュ <span className="text-[#555] font-normal">— {images.length}枚</span>
        </h2>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* コントロール */}
        <div className="w-60 border-r border-[#2A2A2A] p-5 flex flex-col gap-5 shrink-0 overflow-y-auto">

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-semibold text-[#AAAAAA]">列数</label>
              <span className="text-xs text-[#888]">{cols}列 × {rows}行</span>
            </div>
            <input type="range" min="1" max={Math.min(images.length, 6)} value={cols}
              onChange={e => setCols(+e.target.value)}
              className="w-full accent-[#7C3AED]" />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-semibold text-[#AAAAAA]">余白</label>
              <span className="text-xs text-[#888]">{gap}px</span>
            </div>
            <input type="range" min="0" max="40" value={gap}
              onChange={e => setGap(+e.target.value)}
              className="w-full accent-[#7C3AED]" />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#AAAAAA] block mb-2">セルサイズ</label>
            <div className="flex gap-1.5">
              {CELL_SIZES.map(s => (
                <button key={s} onClick={() => setCellSize(s)}
                  className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                    cellSize === s ? 'bg-[#7C3AED] border-[#7C3AED] text-white' : 'border-[#2A2A2A] text-[#777] bg-[#111] hover:border-[#555]'
                  }`}>
                  {s}px
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#AAAAAA] block mb-2">背景色</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {BG_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setBgColor(o.value)} title={o.label}
                  style={{ backgroundColor: o.value }}
                  className={`w-7 h-7 rounded border-2 transition-all text-[10px] font-bold ${
                    bgColor === o.value ? 'border-[#7C3AED] scale-110' : 'border-[#2A2A2A] hover:scale-105'
                  } ${o.value === '#FFFFFF' || o.value === '#F0F0F0' ? 'text-black' : 'text-white'}`}
                >
                  {bgColor === o.value ? '✓' : ''}
                </button>
              ))}
              <input type="color" value={customBg}
                onChange={e => { setCustomBg(e.target.value); setBgColor(e.target.value) }}
                className="w-7 h-7 rounded cursor-pointer border border-[#2A2A2A]"
                title="カスタムカラー" />
            </div>
          </div>

          <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg p-3 text-[10px] text-[#555] space-y-0.5">
            <p>出力サイズ</p>
            <p className="text-[#AAAAAA] font-mono">{outW} × {outH} px</p>
          </div>

          <button onClick={handleDownload}
            disabled={loadedImgs.length !== images.length}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white transition-colors">
            📄 ダウンロード
          </button>
        </div>

        {/* キャンバスプレビュー */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-[#050505]">
          {loadedImgs.length < images.length ? (
            <p className="text-[#555] text-sm">画像を読み込み中...</p>
          ) : (
            <canvas
              ref={canvasRef}
              className="rounded-xl shadow-2xl"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

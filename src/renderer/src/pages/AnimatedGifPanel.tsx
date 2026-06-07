import { useState } from 'react'
import type { GeneratedImage } from '../App'
import type { ToastType } from '../components/Toast'
import { loadImage as loadImg } from './preview/previewHelpers'

interface Props {
  images: GeneratedImage[]
  onBack: () => void
  showToast: (msg: string, type?: ToastType) => void
}

const SIZE_OPTIONS = [
  { label: '元サイズ', value: 0 },
  { label: '512px', value: 512 },
  { label: '256px', value: 256 },
  { label: '128px', value: 128 },
]

const LOOP_OPTIONS = [
  { label: '∞ 無限', value: 0 },
  { label: '1回', value: 1 },
  { label: '3回', value: 3 },
]

export default function AnimatedGifPanel({ images, onBack, showToast }: Props): JSX.Element {
  const [delay, setDelay]     = useState(500)
  const [maxPx, setMaxPx]     = useState(256)
  const [loops, setLoops]     = useState(0)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (): Promise<void> => {
    setIsCreating(true)
    try {
      const { GIFEncoder, quantize, applyPalette } = await import('gifenc')

      const loadedImgs = await Promise.all(images.map(img => loadImg(img.url)))
      const first = loadedImgs[0]
      let W = first.naturalWidth, H = first.naturalHeight
      if (maxPx > 0) {
        const s = Math.min(maxPx / W, maxPx / H)
        W = Math.round(W * s); H = Math.round(H * s)
      }

      const gif = GIFEncoder()
      for (let fi = 0; fi < loadedImgs.length; fi++) {
        const c = document.createElement('canvas')
        c.width = W; c.height = H
        const ctx = c.getContext('2d')!
        ctx.drawImage(loadedImgs[fi], 0, 0, W, H)
        const { data } = ctx.getImageData(0, 0, W, H)
        const palette = quantize(data, 256)
        const index = applyPalette(data, palette, 'FloydSteinberg')
        gif.writeFrame(index, W, H, {
          palette,
          delay,
          repeat: fi === 0 ? loops : undefined,
        })
      }
      gif.finish()

      const bytes = gif.bytesView()
      const blob = new Blob([bytes.buffer], { type: 'image/gif' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gencanvas-animation-${Date.now()}.gif`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast('アニメーションGIFをダウンロードしました', 'success')
    } catch (err) {
      console.error(err)
      showToast('GIF作成に失敗しました', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const estPx = maxPx > 0 ? maxPx : (images[0]?.type === 'icon' ? 1024 : 1920)
  const estKB = Math.round(estPx * estPx * images.length * 0.4 / 1024)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[#2A2A2A] shrink-0">
        <button onClick={onBack} className="text-sm text-[#777] hover:text-white transition-colors">← 戻る</button>
        <h2 className="text-sm font-semibold text-white">
          🎬 アニメーションGIF <span className="text-[#555] font-normal">— {images.length}フレーム</span>
        </h2>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* コントロール */}
        <div className="w-60 border-r border-[#2A2A2A] p-5 flex flex-col gap-5 shrink-0 overflow-y-auto">

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-semibold text-[#AAAAAA]">フレーム間隔</label>
              <span className="text-xs text-[#888]">{delay}ms</span>
            </div>
            <input type="range" min="100" max="3000" step="100" value={delay}
              onChange={e => setDelay(+e.target.value)}
              className="w-full accent-[#7C3AED]" />
            <div className="flex justify-between text-[9px] text-[#555] mt-0.5">
              <span>速い (0.1s)</span><span>遅い (3s)</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#AAAAAA] block mb-2">出力サイズ</label>
            <div className="grid grid-cols-2 gap-1">
              {SIZE_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setMaxPx(o.value)}
                  className={`py-1.5 text-xs rounded border transition-colors ${
                    maxPx === o.value
                      ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white'
                      : 'border-[#2A2A2A] text-[#777] bg-[#111] hover:border-[#555]'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-[#555] mt-1.5">※ GIFは256色制限あり。写真系は荒くなる場合あり</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#AAAAAA] block mb-2">ループ</label>
            <div className="flex gap-1">
              {LOOP_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setLoops(o.value)}
                  className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                    loops === o.value
                      ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white'
                      : 'border-[#2A2A2A] text-[#777] bg-[#111] hover:border-[#555]'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg p-3 text-[10px] text-[#555] space-y-1">
            <p>推定ファイルサイズ</p>
            <p className="text-[#AAAAAA] font-mono">〜{estKB} KB</p>
          </div>

          <button onClick={handleCreate} disabled={isCreating}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors">
            {isCreating ? '⏳ 作成中...' : '🎬 GIF作成してDL'}
          </button>
        </div>

        {/* フレームプレビュー */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#050505]">
          <p className="text-xs text-[#555] mb-4">フレーム順（左上から順に再生）</p>
          <div className="grid grid-cols-4 gap-4">
            {images.map((img, i) => (
              <div key={img.id} className="flex flex-col items-center gap-1.5">
                <div className="relative w-full aspect-square">
                  <img src={img.url}
                    className="w-full h-full object-cover rounded-lg border border-[#2A2A2A]" />
                  <span className="absolute top-1 left-1 text-[10px] bg-[#7C3AED]/90 text-white px-1.5 py-0.5 rounded font-bold">
                    {i + 1}
                  </span>
                  <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 text-[#AAAAAA] px-1.5 py-0.5 rounded">
                    {(delay / 1000).toFixed(1)}s
                  </span>
                </div>
                <p className="text-[9px] text-[#555] truncate w-full text-center px-1">{img.prompt}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

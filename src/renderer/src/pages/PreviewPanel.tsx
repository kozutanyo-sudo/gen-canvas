import { useState, useRef } from 'react'
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

type ShapeType = 'circle' | 'rect' | 'roundrect' | 'star' | 'diamond'
type PanelTab = 'text' | 'shape' | 'edit'

const FONTS = [
  { id: 'gothic',  label: 'ゴシック', css: "'BIZ UDPGothic','Yu Gothic UI',sans-serif" },
  { id: 'mincho',  label: '明朝',     css: "'BIZ UDMincho','Yu Mincho',serif" },
  { id: 'round',   label: '丸ゴシック',css: "'Kosugi Maru','Rounded Mplus 1c',sans-serif" },
  { id: 'mono',    label: '等幅',     css: "'Consolas','Courier New',monospace" },
]

const SHAPES: { id: ShapeType; label: string; emoji: string }[] = [
  { id: 'circle',   label: '球体',   emoji: '⬤' },
  { id: 'rect',     label: '四角',   emoji: '■' },
  { id: 'roundrect',label: '角丸',   emoji: '▪' },
  { id: 'star',     label: '星',     emoji: '★' },
  { id: 'diamond',  label: 'ダイヤ', emoji: '◆' },
]

const COLOR_SWATCHES = [
  '#FFFFFF','#000000','#FF3B3B','#FF9500','#FFD60A',
  '#34C759','#30B0C7','#007AFF','#AF52DE','#FF2D55',
]

// Canvas で画像 + テキスト + シェイプを合成
function compositeCanvas(
  canvas: HTMLCanvasElement,
  imgSrc: string,
  textState: TextState,
  shapeState: ShapeState
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      const W = canvas.width
      const H = canvas.height

      // シェイプ描画
      if (shapeState.enabled) {
        const sx = shapeState.x / 100 * W
        const sy = shapeState.y / 100 * H
        const sr = shapeState.size / 100 * Math.min(W, H) * 0.5
        ctx.globalAlpha = shapeState.opacity / 100
        drawShape(ctx, shapeState.type, sx, sy, sr, shapeState.color, shapeState.sphere3d)
        ctx.globalAlpha = 1
      }

      // テキスト描画
      if (textState.text.trim()) {
        const tx = textState.x / 100 * W
        const ty = textState.y / 100 * H
        const scaledSize = Math.round(textState.size * W / 400)
        const fontStyle = `${textState.italic ? 'italic ' : ''}${textState.bold ? 'bold ' : ''}${scaledSize}px ${FONTS.find(f => f.id === textState.font)?.css || 'sans-serif'}`
        ctx.font = fontStyle
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        if (textState.bgOpacity > 0) {
          const metrics = ctx.measureText(textState.text)
          const pad = scaledSize * 0.3
          ctx.globalAlpha = textState.bgOpacity / 100
          ctx.fillStyle = textState.bgColor
          ctx.fillRect(tx - metrics.width / 2 - pad, ty - scaledSize * 0.7, metrics.width + pad * 2, scaledSize * 1.4)
          ctx.globalAlpha = 1
        }

        if (textState.shadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.85)'
          ctx.shadowBlur = scaledSize * 0.25
          ctx.shadowOffsetY = 2
        }
        if (textState.stroke) {
          ctx.strokeStyle = textState.strokeColor
          ctx.lineWidth = scaledSize * 0.08
          ctx.strokeText(textState.text, tx, ty)
        }
        ctx.fillStyle = textState.color
        ctx.fillText(textState.text, tx, ty)
        ctx.shadowColor = 'transparent'
      }

      resolve(canvas.toDataURL('image/png'))
    }
    img.src = imgSrc
  })
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  type: ShapeType,
  cx: number, cy: number, r: number,
  color: string, sphere3d: boolean
): void {
  ctx.beginPath()
  if (type === 'circle') {
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    if (sphere3d) {
      const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r)
      grad.addColorStop(0, 'rgba(255,255,255,0.85)')
      grad.addColorStop(0.4, color)
      grad.addColorStop(1, shadeColor(color, -60))
      ctx.fillStyle = grad
    } else {
      ctx.fillStyle = color
    }
    ctx.fill()
  } else if (type === 'rect') {
    ctx.rect(cx - r, cy - r, r * 2, r * 2)
    ctx.fillStyle = color; ctx.fill()
  } else if (type === 'roundrect') {
    const rad = r * 0.25
    ctx.roundRect(cx - r, cy - r, r * 2, r * 2, rad)
    ctx.fillStyle = color; ctx.fill()
  } else if (type === 'star') {
    drawStar(ctx, cx, cy, r, 5)
    ctx.fillStyle = color; ctx.fill()
  } else if (type === 'diamond') {
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy)
    ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath()
    ctx.fillStyle = color; ctx.fill()
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points: number): void {
  const inner = r * 0.45
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2
    const len = i % 2 === 0 ? r : inner
    i === 0 ? ctx.moveTo(cx + len * Math.cos(angle), cy + len * Math.sin(angle))
             : ctx.lineTo(cx + len * Math.cos(angle), cy + len * Math.sin(angle))
  }
  ctx.closePath()
}

function shadeColor(hex: string, pct: number): string {
  const num = parseInt(hex.replace('#',''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + pct))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + pct))
  const b = Math.max(0, Math.min(255, (num & 0xff) + pct))
  return `rgb(${r},${g},${b})`
}

interface TextState {
  text: string; x: number; y: number; font: string; size: number
  color: string; bgColor: string; bgOpacity: number
  bold: boolean; italic: boolean; shadow: boolean
  stroke: boolean; strokeColor: string
}

interface ShapeState {
  enabled: boolean; type: ShapeType; x: number; y: number
  size: number; color: string; opacity: number; sphere3d: boolean
}

export default function PreviewPanel({ batch, selectedImage, onSelectImage, onBack, onEvolve }: Props): JSX.Element {
  const [tab, setTab] = useState<PanelTab>('text')
  const [isEvolving, setIsEvolving] = useState(false)
  const [evolvePrompt, setEvolvePrompt] = useState('')
  const [cornerRadius, setCornerRadius] = useState(0)
  const [padding, setPadding] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [text, setText] = useState<TextState>({
    text: '', x: 50, y: 85, font: 'gothic', size: 36,
    color: '#FFFFFF', bgColor: '#000000', bgOpacity: 0,
    bold: true, italic: false, shadow: true,
    stroke: false, strokeColor: '#000000',
  })

  const [shape, setShape] = useState<ShapeState>({
    enabled: false, type: 'circle', x: 50, y: 50,
    size: 20, color: '#4F46E5', opacity: 80, sphere3d: true,
  })

  const size = selectedImage.type === 'icon' ? { w: 1024, h: 1024 } : { w: 1920, h: 1080 }

  const handleDownload = async (): Promise<void> => {
    const canvas = canvasRef.current!
    const hasOverlay = text.text.trim() || shape.enabled
    if (!hasOverlay) {
      const a = document.createElement('a')
      a.href = selectedImage.url
      a.download = `gencanvas-${selectedImage.id}.png`
      a.click()
      return
    }
    const dataUrl = await compositeCanvas(canvas, selectedImage.url, text, shape)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `gencanvas-${selectedImage.id}.png`
    a.click()
  }

  const handleEvolve = async (): Promise<void> => {
    if (isEvolving || !evolvePrompt.trim()) return
    setIsEvolving(true)
    try {
      const newPrompt = `${selectedImage.prompt}, ${evolvePrompt}`
      const dataUrl = await generateImageViaMain(newPrompt, size.w, size.h)
      onEvolve({ id: `${Date.now()}`, url: dataUrl, prompt: newPrompt, style: selectedImage.style, type: selectedImage.type, createdAt: Date.now() })
      setEvolvePrompt('')
    } catch { alert('進化に失敗しました。') } finally { setIsEvolving(false) }
  }

  const handleRegenerate = async (): Promise<void> => {
    if (isEvolving) return
    setIsEvolving(true)
    try {
      const dataUrl = await generateImageViaMain(selectedImage.prompt, size.w, size.h)
      onEvolve({ id: `${Date.now()}`, url: dataUrl, prompt: selectedImage.prompt, style: selectedImage.style, type: selectedImage.type, createdAt: Date.now() })
    } catch { alert('再生成に失敗しました。') } finally { setIsEvolving(false) }
  }

  // プレビュー用: テキストのCSS位置
  const textPreviewStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${text.x}%`, top: `${text.y}%`,
    transform: 'translate(-50%, -50%)',
    color: text.color,
    fontSize: `${Math.max(8, Math.round(text.size * 0.22))}px`,
    fontWeight: text.bold ? 'bold' : 'normal',
    fontStyle: text.italic ? 'italic' : 'normal',
    fontFamily: FONTS.find(f => f.id === text.font)?.css,
    textShadow: text.shadow ? '0 1px 6px rgba(0,0,0,0.9),0 0 10px rgba(0,0,0,0.7)' : 'none',
    WebkitTextStroke: text.stroke ? `1px ${text.strokeColor}` : undefined,
    backgroundColor: text.bgOpacity > 0 ? `${text.bgColor}${Math.round(text.bgOpacity * 2.55).toString(16).padStart(2,'0')}` : 'transparent',
    padding: text.bgOpacity > 0 ? '2px 6px' : '0',
    borderRadius: text.bgOpacity > 0 ? '3px' : '0',
    whiteSpace: 'nowrap', pointerEvents: 'none',
    maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis',
  }

  // プレビュー用: シェイプのCSS
  const shapePreviewStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${shape.x}%`, top: `${shape.y}%`,
    transform: 'translate(-50%, -50%)',
    width: `${shape.size * 1.2}px`, height: `${shape.size * 1.2}px`,
    opacity: shape.opacity / 100,
    pointerEvents: 'none',
    borderRadius: shape.type === 'circle' ? '50%' : shape.type === 'roundrect' ? '20%' : shape.type === 'diamond' ? '0' : '0',
    transform: `translate(-50%, -50%) ${shape.type === 'diamond' ? 'rotate(45deg)' : ''}`,
    background: shape.type === 'circle' && shape.sphere3d
      ? `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.85) 0%, ${shape.color} 45%, ${shadeColor(shape.color, -60)} 100%)`
      : shape.color,
    clipPath: shape.type === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : undefined,
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 中央：プレビュー */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0A0A] p-8 gap-4">
        {batch.length > 1 && (
          <div className="flex gap-2 mb-2">
            {batch.map(img => (
              <button key={img.id} onClick={() => onSelectImage(img)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage.id === img.id ? 'border-[#7C3AED]' : 'border-[#2A2A2A] hover:border-[#555]'}`}>
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="relative overflow-hidden bg-[#111111]"
          style={{ borderRadius: `${cornerRadius * 5}px`, padding: `${padding * 3}px` }}>
          <img src={selectedImage.url} alt={selectedImage.prompt}
            className="max-w-[400px] max-h-[400px] object-contain block"
            style={{ borderRadius: cornerRadius > 0 ? `${cornerRadius * 3}px` : '0' }} />
          {/* テキストオーバーレイ */}
          {text.text.trim() && <span style={textPreviewStyle}>{text.text}</span>}
          {/* シェイプオーバーレイ */}
          {shape.enabled && <div style={shapePreviewStyle} />}
        </div>
        <p className="text-xs text-[#777] text-center max-w-xs truncate">{selectedImage.prompt}</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* 右パネル */}
      <div className="w-76 border-l border-[#2A2A2A] flex flex-col overflow-hidden shrink-0" style={{width:'300px'}}>

        {/* タブ */}
        <div className="flex border-b border-[#2A2A2A] shrink-0">
          {([['text','✍️ テキスト'],['shape','⬤ シェイプ'],['edit','🎨 編集']] as [PanelTab,string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === id ? 'text-white border-b-2 border-[#7C3AED]' : 'text-[#777] hover:text-[#AAAAAA]'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ===== テキストタブ ===== */}
          {tab === 'text' && (
            <>
              <div>
                <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">テキスト</label>
                <input type="text" value={text.text} onChange={e => setText(p => ({...p, text: e.target.value}))}
                  placeholder="例: GenCanvas"
                  className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#7C3AED]" />
              </div>

              {/* フォント */}
              <div>
                <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">フォント</label>
                <div className="grid grid-cols-2 gap-1">
                  {FONTS.map(f => (
                    <button key={f.id} onClick={() => setText(p => ({...p, font: f.id}))}
                      className={`py-1.5 text-xs rounded border transition-colors ${text.font === f.id ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#2A2A2A] text-[#AAAAAA] bg-[#111]'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* スタイル */}
              <div className="flex gap-2">
                <button onClick={() => setText(p => ({...p, bold: !p.bold}))}
                  className={`flex-1 py-1.5 text-sm font-bold rounded border transition-colors ${text.bold ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#2A2A2A] text-[#777] bg-[#111]'}`}>B</button>
                <button onClick={() => setText(p => ({...p, italic: !p.italic}))}
                  className={`flex-1 py-1.5 text-sm italic rounded border transition-colors ${text.italic ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#2A2A2A] text-[#777] bg-[#111]'}`}>I</button>
                <button onClick={() => setText(p => ({...p, shadow: !p.shadow}))}
                  className={`flex-1 py-1.5 text-xs rounded border transition-colors ${text.shadow ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#2A2A2A] text-[#777] bg-[#111]'}`}>影</button>
                <button onClick={() => setText(p => ({...p, stroke: !p.stroke}))}
                  className={`flex-1 py-1.5 text-xs rounded border transition-colors ${text.stroke ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#2A2A2A] text-[#777] bg-[#111]'}`}>縁取り</button>
              </div>

              {/* サイズ */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-[#AAAAAA]">サイズ</label>
                  <span className="text-xs text-[#888]">{text.size}px</span>
                </div>
                <input type="range" min="12" max="120" value={text.size}
                  onChange={e => setText(p => ({...p, size: +e.target.value}))}
                  className="w-full accent-[#7C3AED]" />
              </div>

              {/* カラー */}
              <div>
                <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">文字色</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COLOR_SWATCHES.map(c => (
                    <button key={c} onClick={() => setText(p => ({...p, color: c}))}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${text.color === c ? 'border-white scale-110' : 'border-transparent'}`} />
                  ))}
                  <input type="color" value={text.color} onChange={e => setText(p => ({...p, color: e.target.value}))}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                </div>
                {text.stroke && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#AAAAAA]">縁取り色</span>
                    <input type="color" value={text.strokeColor} onChange={e => setText(p => ({...p, strokeColor: e.target.value}))}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
                  </div>
                )}
              </div>

              {/* 背景 */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-[#AAAAAA]">文字背景</label>
                  <span className="text-xs text-[#888]">{text.bgOpacity}%</span>
                </div>
                <div className="flex gap-2 items-center">
                  <input type="color" value={text.bgColor} onChange={e => setText(p => ({...p, bgColor: e.target.value}))}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
                  <input type="range" min="0" max="100" value={text.bgOpacity}
                    onChange={e => setText(p => ({...p, bgOpacity: +e.target.value}))}
                    className="flex-1 accent-[#7C3AED]" />
                </div>
              </div>

              {/* 位置 */}
              <div>
                <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">位置</label>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#888] w-8">横</span>
                    <input type="range" min="5" max="95" value={text.x}
                      onChange={e => setText(p => ({...p, x: +e.target.value}))}
                      className="flex-1 accent-[#7C3AED]" />
                    <span className="text-xs text-[#888] w-8 text-right">{text.x}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#888] w-8">縦</span>
                    <input type="range" min="5" max="95" value={text.y}
                      onChange={e => setText(p => ({...p, y: +e.target.value}))}
                      className="flex-1 accent-[#7C3AED]" />
                    <span className="text-xs text-[#888] w-8 text-right">{text.y}%</span>
                  </div>
                </div>
                {/* 位置クイック選択 */}
                <div className="grid grid-cols-3 gap-1 mt-2">
                  {[[5,15],[50,15],[95,15],[5,50],[50,50],[95,50],[5,85],[50,85],[95,85]].map(([x,y],i) => (
                    <button key={i} onClick={() => setText(p => ({...p, x, y}))}
                      className={`h-6 rounded text-xs border transition-colors ${text.x===x&&text.y===y ? 'border-[#7C3AED] bg-[#7C3AED]/20' : 'border-[#2A2A2A] bg-[#111] hover:border-[#555]'}`}>
                      {['↖','↑','↗','←','＋','→','↙','↓','↘'][i]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ===== シェイプタブ ===== */}
          {tab === 'shape' && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#AAAAAA]">シェイプを表示</label>
                <button onClick={() => setShape(p => ({...p, enabled: !p.enabled}))}
                  className={`w-11 h-6 rounded-full transition-colors relative ${shape.enabled ? 'bg-[#7C3AED]' : 'bg-[#2A2A2A]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${shape.enabled ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              {/* シェイプ選択 */}
              <div>
                <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">種類</label>
                <div className="grid grid-cols-5 gap-1">
                  {SHAPES.map(s => (
                    <button key={s.id} onClick={() => setShape(p => ({...p, type: s.id}))}
                      title={s.label}
                      className={`flex flex-col items-center py-2 rounded border text-sm transition-colors ${shape.type === s.id ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#2A2A2A] text-[#AAAAAA] bg-[#111]'}`}>
                      <span>{s.emoji}</span>
                      <span className="text-[10px] mt-0.5">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 球体3D効果 */}
              {shape.type === 'circle' && (
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[#AAAAAA]">3D球体効果</label>
                  <button onClick={() => setShape(p => ({...p, sphere3d: !p.sphere3d}))}
                    className={`w-11 h-6 rounded-full transition-colors relative ${shape.sphere3d ? 'bg-[#7C3AED]' : 'bg-[#2A2A2A]'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${shape.sphere3d ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              )}

              {/* カラー */}
              <div>
                <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">カラー</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COLOR_SWATCHES.map(c => (
                    <button key={c} onClick={() => setShape(p => ({...p, color: c}))}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${shape.color === c ? 'border-white scale-110' : 'border-transparent'}`} />
                  ))}
                  <input type="color" value={shape.color} onChange={e => setShape(p => ({...p, color: e.target.value}))}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                </div>
              </div>

              {/* サイズ・不透明度 */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-[#AAAAAA]">サイズ</label>
                  <span className="text-xs text-[#888]">{shape.size}%</span>
                </div>
                <input type="range" min="5" max="80" value={shape.size}
                  onChange={e => setShape(p => ({...p, size: +e.target.value}))}
                  className="w-full accent-[#7C3AED]" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-[#AAAAAA]">不透明度</label>
                  <span className="text-xs text-[#888]">{shape.opacity}%</span>
                </div>
                <input type="range" min="10" max="100" value={shape.opacity}
                  onChange={e => setShape(p => ({...p, opacity: +e.target.value}))}
                  className="w-full accent-[#7C3AED]" />
              </div>

              {/* 位置 */}
              <div>
                <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">位置</label>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#888] w-8">横</span>
                    <input type="range" min="5" max="95" value={shape.x}
                      onChange={e => setShape(p => ({...p, x: +e.target.value}))}
                      className="flex-1 accent-[#7C3AED]" />
                    <span className="text-xs text-[#888] w-8 text-right">{shape.x}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#888] w-8">縦</span>
                    <input type="range" min="5" max="95" value={shape.y}
                      onChange={e => setShape(p => ({...p, y: +e.target.value}))}
                      className="flex-1 accent-[#7C3AED]" />
                    <span className="text-xs text-[#888] w-8 text-right">{shape.y}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 mt-2">
                  {[[5,15],[50,15],[95,15],[5,50],[50,50],[95,50],[5,85],[50,85],[95,85]].map(([x,y],i) => (
                    <button key={i} onClick={() => setShape(p => ({...p, x, y}))}
                      className={`h-6 rounded text-xs border transition-colors ${shape.x===x&&shape.y===y ? 'border-[#7C3AED] bg-[#7C3AED]/20' : 'border-[#2A2A2A] bg-[#111] hover:border-[#555]'}`}>
                      {['↖','↑','↗','←','＋','→','↙','↓','↘'][i]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ===== 編集タブ ===== */}
          {tab === 'edit' && (
            <>
              {selectedImage.type === 'icon' && (
                <>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-semibold text-[#AAAAAA]">角丸</label>
                      <span className="text-xs text-[#888]">{cornerRadius}</span>
                    </div>
                    <input type="range" min="0" max="20" value={cornerRadius}
                      onChange={e => setCornerRadius(+e.target.value)}
                      className="w-full accent-[#7C3AED]" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-semibold text-[#AAAAAA]">余白</label>
                      <span className="text-xs text-[#888]">{padding}</span>
                    </div>
                    <input type="range" min="0" max="20" value={padding}
                      onChange={e => setPadding(+e.target.value)}
                      className="w-full accent-[#7C3AED]" />
                  </div>
                  <hr className="border-[#2A2A2A]" />
                </>
              )}

              {/* 進化させる */}
              <div>
                <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">✏️ 進化させる</label>
                <textarea value={evolvePrompt} onChange={e => setEvolvePrompt(e.target.value)}
                  placeholder="追加の指示 (例: もっと明るく)"
                  rows={2}
                  className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] resize-none focus:outline-none focus:border-[#7C3AED]" />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleEvolve} disabled={isEvolving || !evolvePrompt.trim()}
                    className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white">
                    {isEvolving ? '処理中...' : '🔄 変化させる'}
                  </button>
                  <button onClick={handleRegenerate} disabled={isEvolving}
                    className="flex-1 py-2 rounded-lg text-xs bg-[#1A1A1A] border border-[#2A2A2A] disabled:opacity-40 text-[#AAAAAA]">
                    {isEvolving ? '...' : '♻️ 再生成'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 下部固定ボタン */}
        <div className="p-4 border-t border-[#2A2A2A] space-y-2 shrink-0">
          <button onClick={handleDownload}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors">
            📄 ダウンロード{(text.text.trim() || shape.enabled) ? '（合成あり）' : ''}
          </button>
          <button onClick={onBack}
            className="w-full py-2 rounded-lg text-xs text-[#777] hover:text-white hover:bg-[#1A1A1A] border border-[#2A2A2A] transition-colors">
            ← 戻る
          </button>
        </div>
      </div>
    </div>
  )
}

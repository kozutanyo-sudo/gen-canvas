import { useState, useEffect, useRef } from 'react'
import type { GeneratedImage } from '../App'
import type { ToastType } from '../components/Toast'
import TextTab from './preview/TextTab'
import ShapeTab from './preview/ShapeTab'
import {
  loadImage, quantizeColors, compositeCanvas, shadeColor,
  LUT_PRESETS, SNS_PRESETS, PIXEL_COLOR_OPTIONS, FONTS,
  type TextState, type ShapeState, type CropShape, type CropBg,
} from './preview/previewHelpers'

interface Props {
  batch: GeneratedImage[]
  selectedImage: GeneratedImage
  onSelectImage: (img: GeneratedImage) => void
  onBack: () => void
  onEvolve: (img: GeneratedImage) => void
  showToast: (msg: string, type?: ToastType) => void
}

type PanelTab = 'text' | 'shape' | 'edit'

function SliderRow({ label, value, min, max, onChange, leftLabel, rightLabel }: {
  label: string; value: number; min: number; max: number
  onChange: (v: number) => void; leftLabel?: string; rightLabel?: string
}): JSX.Element {
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-0.5">
        <span className="text-[10px] text-[#888]">{label}</span>
        <span className="text-[10px] text-[#666]">{value > 0 ? `+${value}` : value}</span>
      </div>
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-[9px] text-[#555] mb-0.5">
          <span>{leftLabel}</span><span>{rightLabel}</span>
        </div>
      )}
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(+e.target.value)} className="w-full accent-[#7C3AED]" />
    </div>
  )
}

export default function PreviewPanel({ batch, selectedImage, onSelectImage, onBack, onEvolve, showToast }: Props): JSX.Element {
  const [tab, setTab]                 = useState<PanelTab>('text')
  const [isEvolving, setIsEvolving]   = useState(false)
  const [evolvePrompt, setEvolvePrompt] = useState('')
  const [cornerRadius, setCornerRadius] = useState(0)
  const [padding, setPadding]         = useState(0)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const pixelCanvasRef = useRef<HTMLCanvasElement>(null)

  const [text, setText]   = useState<TextState>({
    text: '', x: 50, y: 85, font: 'gothic', size: 36,
    color: '#FFFFFF', bgColor: '#000000', bgOpacity: 0,
    bold: true, italic: false, shadow: true, stroke: false, strokeColor: '#000000',
  })
  const [shape, setShape] = useState<ShapeState>({
    enabled: false, type: 'circle', x: 50, y: 50,
    size: 20, color: '#4F46E5', opacity: 80, sphere3d: true,
  })

  // 画像調整
  const [brightness, setBrightness]   = useState(0)
  const [contrast, setContrast]       = useState(0)
  const [saturation, setSaturation]   = useState(0)
  const [temperature, setTemperature] = useState(0)
  const hasAdjust = brightness !== 0 || contrast !== 0 || saturation !== 0 || temperature !== 0

  // カラーグレーディング
  const [lutId, setLutId] = useState('none')

  // エクスポート
  const [exportFormat, setExportFormat]   = useState<'png'|'webp'|'jpeg'>('png')
  const [exportQuality, setExportQuality] = useState(90)
  const [exportPreset, setExportPreset]   = useState<{w:number,h:number}|null>(null)

  // クロップ
  const [cropShape, setCropShape] = useState<CropShape>('none')
  const [cropBg, setCropBg]       = useState<CropBg>('transparent')

  // ピクセルアート
  const [showPixel, setShowPixel]     = useState(false)
  const [pixelSize, setPixelSize]     = useState(8)
  const [pixelColors, setPixelColors] = useState(0)
  const [pixelGrid, setPixelGrid]     = useState(false)

  const size = selectedImage.type === 'icon' ? { w: 1024, h: 1024 } : { w: 1920, h: 1080 }
  const currentLut  = LUT_PRESETS.find(p => p.id === lutId)!
  const adjustFilter = hasAdjust
    ? `brightness(${(100+brightness)/100}) contrast(${(100+contrast)/100}) saturate(${(100+saturation)/100}) hue-rotate(${-temperature * 0.18}deg)`
    : ''
  const combinedFilter = [adjustFilter, currentLut.filter].filter(Boolean).join(' ') || undefined

  // ピクセルアートプレビュー
  useEffect(() => {
    if (!showPixel) return
    const canvas = pixelCanvasRef.current
    if (!canvas) return
    const isIcon = selectedImage.type === 'icon'
    const W = 400, H = isIcon ? 400 : Math.round(400 * 1080 / 1920)
    canvas.width = W; canvas.height = H
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')!
      const ps = Math.max(1, pixelSize)
      const sw = Math.ceil(W / ps), sh = Math.ceil(H / ps)
      const tmp = document.createElement('canvas')
      tmp.width = sw; tmp.height = sh
      const tc = tmp.getContext('2d')!
      tc.imageSmoothingEnabled = true
      tc.drawImage(img, 0, 0, sw, sh)
      if (pixelColors > 0) { const d = tc.getImageData(0, 0, sw, sh); quantizeColors(d, pixelColors); tc.putImageData(d, 0, 0) }
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(tmp, 0, 0, sw, sh, 0, 0, W, H)
      if (pixelGrid) {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.5
        for (let x = 0; x <= W; x += ps) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
        for (let y = 0; y <= H; y += ps) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
      }
    }
    img.src = selectedImage.url
  }, [showPixel, pixelSize, pixelColors, pixelGrid, selectedImage.url, selectedImage.type])

  // ── ハンドラ ──────────────────────────────────────────────
  const handleDownload = async (): Promise<void> => {
    const canvas = canvasRef.current!
    const hasOverlay = text.text.trim() || shape.enabled
    const url = hasOverlay ? await compositeCanvas(canvas, selectedImage.url, text, shape) : selectedImage.url
    const a = document.createElement('a')
    a.href = url; a.download = `gencanvas-${selectedImage.id}.png`; a.click()
  }

  const handleEvolve = async (): Promise<void> => {
    if (isEvolving || !evolvePrompt.trim()) return
    setIsEvolving(true)
    try {
      const base = selectedImage.englishPrompt || selectedImage.prompt
      const ep = `${base}, ${evolvePrompt}`
      const url = await window.api.generateImage(ep, size.w, size.h)
      onEvolve({ id: `${Date.now()}`, url, prompt: selectedImage.prompt, englishPrompt: ep, style: selectedImage.style, type: selectedImage.type, createdAt: Date.now() })
      setEvolvePrompt('')
    } catch { showToast('進化に失敗しました', 'error') } finally { setIsEvolving(false) }
  }

  const handleRegenerate = async (): Promise<void> => {
    if (isEvolving) return
    setIsEvolving(true)
    try {
      const base = selectedImage.englishPrompt || selectedImage.prompt
      const url = await window.api.generateImage(base, size.w, size.h)
      onEvolve({ id: `${Date.now()}`, url, prompt: selectedImage.prompt, englishPrompt: base, style: selectedImage.style, type: selectedImage.type, createdAt: Date.now() })
    } catch { showToast('再生成に失敗しました', 'error') } finally { setIsEvolving(false) }
  }

  const handleCopyToClipboard = async (): Promise<void> => {
    const canvas = canvasRef.current!
    const hasOverlay = text.text.trim() || shape.enabled
    const url = hasOverlay ? await compositeCanvas(canvas, selectedImage.url, text, shape) : selectedImage.url
    await window.api.copyToClipboard(url)
    showToast('クリップボードにコピーしました', 'success')
  }

  const handleSaveAdjusted = async (): Promise<void> => {
    try {
      const img = await loadImage(selectedImage.url)
      const canvas = canvasRef.current!
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      const f = [adjustFilter, currentLut.filter].filter(Boolean).join(' ')
      ctx.filter = f || 'none'; ctx.drawImage(img, 0, 0); ctx.filter = 'none'
      if (temperature !== 0) {
        ctx.globalCompositeOperation = 'soft-light'
        ctx.globalAlpha = Math.abs(temperature) / 350
        ctx.fillStyle = temperature > 0 ? '#FF7700' : '#0077FF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1
      }
      onEvolve({ id: `adj-${Date.now()}`, url: canvas.toDataURL('image/png'), prompt: selectedImage.prompt, englishPrompt: selectedImage.englishPrompt, style: selectedImage.style, type: selectedImage.type, createdAt: Date.now(), params: selectedImage.params })
      showToast('調整済み画像を保存しました', 'success')
    } catch { showToast('保存に失敗しました', 'error') }
  }

  const handleExport = async (): Promise<void> => {
    try {
      const img = await loadImage(selectedImage.url)
      const W = exportPreset?.w || img.naturalWidth, H = exportPreset?.h || img.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')!
      if (combinedFilter) ctx.filter = combinedFilter
      ctx.drawImage(img, 0, 0, W, H); ctx.filter = 'none'
      const mime = exportFormat === 'jpeg' ? 'image/jpeg' : exportFormat === 'webp' ? 'image/webp' : 'image/png'
      const a = document.createElement('a')
      a.href = canvas.toDataURL(mime, exportFormat !== 'png' ? exportQuality / 100 : undefined)
      a.download = `gencanvas-${Date.now()}.${exportFormat}`; a.click()
      showToast(`${exportFormat.toUpperCase()}でエクスポートしました`, 'success')
    } catch { showToast('エクスポートに失敗しました', 'error') }
  }

  const handleCropDownload = async (): Promise<void> => {
    if (cropShape === 'none') return
    try {
      const img = await loadImage(selectedImage.url)
      const s = Math.min(img.naturalWidth, img.naturalHeight)
      const out = document.createElement('canvas'); out.width = s; out.height = s
      const ctx = out.getContext('2d')!
      if (cropBg !== 'transparent') { ctx.fillStyle = cropBg === 'black' ? '#000' : '#FFF'; ctx.fillRect(0, 0, s, s) }
      ctx.save(); ctx.beginPath()
      cropShape === 'circle' ? ctx.arc(s/2, s/2, s/2, 0, Math.PI*2) : ctx.roundRect(0, 0, s, s, s*0.2)
      ctx.clip()
      ctx.drawImage(img, (img.naturalWidth-s)/2, (img.naturalHeight-s)/2, s, s, 0, 0, s, s)
      ctx.restore()
      const a = document.createElement('a'); a.href = out.toDataURL('image/png'); a.download = `gencanvas-crop-${Date.now()}.png`; a.click()
      showToast('クロップ画像をダウンロードしました', 'success')
    } catch { showToast('クロップに失敗しました', 'error') }
  }

  const handlePixelDownload = async (): Promise<void> => {
    try {
      const img = await loadImage(selectedImage.url)
      const W = img.naturalWidth, H = img.naturalHeight
      const ps = Math.max(1, Math.round(pixelSize * W / 400))
      const sw = Math.ceil(W/ps), sh = Math.ceil(H/ps)
      const tmp = document.createElement('canvas'); tmp.width = sw; tmp.height = sh
      const tc = tmp.getContext('2d')!; tc.imageSmoothingEnabled = true; tc.drawImage(img, 0, 0, sw, sh)
      if (pixelColors > 0) { const d = tc.getImageData(0, 0, sw, sh); quantizeColors(d, pixelColors); tc.putImageData(d, 0, 0) }
      const out = document.createElement('canvas'); out.width = W; out.height = H
      const ctx = out.getContext('2d')!; ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, sw, sh, 0, 0, W, H)
      if (pixelGrid) {
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1
        for (let x = 0; x <= W; x += ps) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
        for (let y = 0; y <= H; y += ps) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
      }
      const a = document.createElement('a'); a.href = out.toDataURL('image/png'); a.download = `gencanvas-pixel-${Date.now()}.png`; a.click()
      showToast('ピクセルアートをダウンロードしました', 'success')
    } catch { showToast('ダウンロードに失敗しました', 'error') }
  }

  // プレビュースタイル
  const textPreviewStyle: React.CSSProperties = {
    position: 'absolute', left: `${text.x}%`, top: `${text.y}%`, transform: 'translate(-50%,-50%)',
    color: text.color, fontSize: `${Math.max(8, Math.round(text.size*0.22))}px`,
    fontWeight: text.bold ? 'bold' : 'normal', fontStyle: text.italic ? 'italic' : 'normal',
    fontFamily: FONTS.find(f => f.id === text.font)?.css,
    textShadow: text.shadow ? '0 1px 6px rgba(0,0,0,0.9),0 0 10px rgba(0,0,0,0.7)' : 'none',
    WebkitTextStroke: text.stroke ? `1px ${text.strokeColor}` : undefined,
    backgroundColor: text.bgOpacity > 0 ? `${text.bgColor}${Math.round(text.bgOpacity*2.55).toString(16).padStart(2,'0')}` : 'transparent',
    padding: text.bgOpacity > 0 ? '2px 6px' : '0', borderRadius: text.bgOpacity > 0 ? '3px' : '0',
    whiteSpace: 'nowrap', pointerEvents: 'none', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis',
  }
  const shapePreviewStyle: React.CSSProperties = {
    position: 'absolute', left: `${shape.x}%`, top: `${shape.y}%`,
    transform: `translate(-50%,-50%)${shape.type==='diamond'?' rotate(45deg)':''}`,
    width: `${shape.size*1.2}px`, height: `${shape.size*1.2}px`,
    opacity: shape.opacity/100, pointerEvents: 'none',
    borderRadius: shape.type==='circle'?'50%':shape.type==='roundrect'?'20%':'0',
    background: shape.type==='circle'&&shape.sphere3d
      ? `radial-gradient(circle at 35% 35%,rgba(255,255,255,0.85) 0%,${shape.color} 45%,${shadeColor(shape.color,-60)} 100%)`
      : shape.color,
    clipPath: shape.type==='star'?'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)':undefined,
  }
  const previewRadius = cropShape==='circle'?'50%':cropShape==='roundrect'?'20%':`${cornerRadius*5}px`

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 中央プレビュー */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0A0A] p-8 gap-4">
        {batch.length > 1 && (
          <div className="flex gap-2 mb-2">
            {batch.map(img => (
              <button key={img.id} onClick={() => onSelectImage(img)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage.id===img.id?'border-[#7C3AED]':'border-[#2A2A2A] hover:border-[#555]'}`}>
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="relative overflow-hidden bg-[#111111]"
          style={{ borderRadius: previewRadius, padding: `${padding*3}px` }}>
          {showPixel
            ? <canvas ref={pixelCanvasRef} style={{ display:'block', maxWidth:'400px', maxHeight:'400px', imageRendering:'pixelated' }} />
            : <img src={selectedImage.url} alt={selectedImage.prompt}
                className="max-w-[400px] max-h-[400px] object-contain block"
                style={{ filter: combinedFilter, borderRadius: cornerRadius>0?`${cornerRadius*3}px`:'0' }} />
          }
          {text.text.trim() && <span style={textPreviewStyle}>{text.text}</span>}
          {shape.enabled && <div style={shapePreviewStyle} />}
        </div>
        <p className="text-xs text-[#777] text-center max-w-xs truncate">{selectedImage.prompt}</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* 右パネル */}
      <div className="border-l border-[#2A2A2A] flex flex-col overflow-hidden shrink-0" style={{width:'300px'}}>
        <div className="flex border-b border-[#2A2A2A] shrink-0">
          {([['text','✍️ テキスト'],['shape','⬤ シェイプ'],['edit','🎨 編集']] as [PanelTab,string][]).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab===id?'text-white border-b-2 border-[#7C3AED]':'text-[#777] hover:text-[#AAAAAA]'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'text'  && <TextTab  text={text}   onChange={setText}  />}
          {tab === 'shape' && <ShapeTab shape={shape} onChange={setShape} />}

          {tab === 'edit' && (
            <>
              {selectedImage.type === 'icon' && (
                <>
                  {(['角丸','余白'] as const).map((lbl, i) => {
                    const val = i===0?cornerRadius:padding, set = i===0?setCornerRadius:setPadding
                    return (
                      <div key={lbl}>
                        <div className="flex justify-between mb-1">
                          <label className="text-xs font-semibold text-[#AAAAAA]">{lbl}</label>
                          <span className="text-xs text-[#888]">{val}</span>
                        </div>
                        <input type="range" min="0" max="20" value={val} onChange={e => set(+e.target.value)} className="w-full accent-[#7C3AED]" />
                      </div>
                    )
                  })}
                  <hr className="border-[#2A2A2A]" />
                </>
              )}

              {/* 画像調整 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#AAAAAA]">🎚 画像調整</label>
                  {hasAdjust && <button onClick={() => {setBrightness(0);setContrast(0);setSaturation(0);setTemperature(0)}} className="text-[10px] text-[#555] hover:text-[#AAA]">リセット</button>}
                </div>
                <SliderRow label="明るさ"       value={brightness}  min={-100} max={100} onChange={setBrightness} />
                <SliderRow label="コントラスト"  value={contrast}    min={-100} max={100} onChange={setContrast} />
                <SliderRow label="彩度"          value={saturation}  min={-100} max={100} onChange={setSaturation} />
                <SliderRow label="色温度" value={temperature} min={-100} max={100} onChange={setTemperature} leftLabel="冷" rightLabel="暖" />
                {hasAdjust && <button onClick={handleSaveAdjusted} className="w-full py-1.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors mt-1">💾 調整結果を保存</button>}
              </div>

              <hr className="border-[#2A2A2A]" />

              {/* カラーグレーディング */}
              <div>
                <label className="text-xs font-semibold text-[#AAAAAA] block mb-2">🎞 カラーグレーディング</label>
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {LUT_PRESETS.map(p => (
                    <button key={p.id} onClick={() => setLutId(p.id)}
                      className={`py-1 text-[10px] rounded border transition-colors ${lutId===p.id?'border-[#7C3AED] bg-[#7C3AED]/20 text-white':'border-[#2A2A2A] text-[#777] bg-[#111] hover:border-[#555] hover:text-white'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {lutId !== 'none' && (
                  <button onClick={async () => {
                    try {
                      const img = await loadImage(selectedImage.url); const canvas = canvasRef.current!
                      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
                      const ctx = canvas.getContext('2d')!
                      ctx.filter = currentLut.filter; ctx.drawImage(img, 0, 0); ctx.filter = 'none'
                      onEvolve({ id:`lut-${Date.now()}`, url:canvas.toDataURL('image/png'), prompt:selectedImage.prompt, englishPrompt:selectedImage.englishPrompt, style:selectedImage.style, type:selectedImage.type, createdAt:Date.now(), params:selectedImage.params })
                      showToast('グレーディング結果を保存しました', 'success')
                    } catch { showToast('保存に失敗しました', 'error') }
                  }} className="w-full py-1.5 rounded-lg text-xs font-medium bg-[#7C3AED]/80 hover:bg-[#7C3AED] text-white transition-colors">
                    💾 グレーディングを保存
                  </button>
                )}
              </div>

              <hr className="border-[#2A2A2A]" />

              {/* クロップ */}
              <div>
                <label className="text-xs font-semibold text-[#AAAAAA] block mb-2">✂️ クロップ出力</label>
                <div className="flex gap-1 mb-2">
                  {(['none','circle','roundrect'] as CropShape[]).map((v,i) => (
                    <button key={v} onClick={() => setCropShape(v)}
                      className={`flex-1 py-1 text-[10px] rounded border transition-colors ${cropShape===v?'border-[#7C3AED] bg-[#7C3AED]/20 text-white':'border-[#2A2A2A] text-[#777] bg-[#111] hover:border-[#555]'}`}>
                      {['なし','円形','角丸'][i]}
                    </button>
                  ))}
                </div>
                {cropShape !== 'none' && (
                  <>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-[10px] text-[#888] shrink-0">背景:</span>
                      {(['transparent','black','white'] as CropBg[]).map((v,i) => (
                        <button key={v} onClick={() => setCropBg(v)}
                          className={`flex-1 py-1 text-[10px] rounded border transition-colors ${cropBg===v?'border-[#7C3AED] bg-[#7C3AED]/20 text-white':'border-[#2A2A2A] text-[#777] bg-[#111] hover:border-[#555]'}`}>
                          {['透明','黒','白'][i]}
                        </button>
                      ))}
                    </div>
                    <button onClick={handleCropDownload} className="w-full py-1.5 rounded-lg text-xs font-medium border border-[#3A3A3A] text-[#AAAAAA] hover:text-white hover:border-[#7C3AED] transition-colors">📄 透過PNG ダウンロード</button>
                  </>
                )}
              </div>

              <hr className="border-[#2A2A2A]" />

              {/* ピクセルアート */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#AAAAAA]">🎮 ピクセルアート</label>
                  <button onClick={() => setShowPixel(p => !p)} className={`w-11 h-6 rounded-full relative transition-colors ${showPixel?'bg-[#7C3AED]':'bg-[#2A2A2A]'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${showPixel?'right-1':'left-1'}`} />
                  </button>
                </div>
                {showPixel && (
                  <>
                    <SliderRow label="ドットサイズ" value={pixelSize} min={2} max={32} onChange={setPixelSize} />
                    <div className="mb-2">
                      <span className="text-[10px] text-[#888] block mb-1">色数制限</span>
                      <div className="flex gap-1">
                        {PIXEL_COLOR_OPTIONS.map(([v,l]) => (
                          <button key={v} onClick={() => setPixelColors(v as number)}
                            className={`flex-1 py-1 text-[10px] rounded border transition-colors ${pixelColors===v?'border-[#7C3AED] bg-[#7C3AED]/20 text-white':'border-[#2A2A2A] text-[#777] bg-[#111] hover:border-[#555]'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-[#888]">グリッド線</span>
                      <button onClick={() => setPixelGrid(p => !p)} className={`w-9 h-5 rounded-full relative transition-colors ${pixelGrid?'bg-[#7C3AED]':'bg-[#2A2A2A]'}`}>
                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${pixelGrid?'right-0.5':'left-0.5'}`} />
                      </button>
                    </div>
                    <button onClick={handlePixelDownload} className="w-full py-1.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors">📄 ピクセルアート DL</button>
                  </>
                )}
              </div>

              <hr className="border-[#2A2A2A]" />

              {/* エクスポート */}
              <div>
                <label className="text-xs font-semibold text-[#AAAAAA] block mb-2">📤 エクスポート</label>
                <div className="flex gap-1 flex-wrap mb-2">
                  {SNS_PRESETS.map(p => {
                    const sel = p.w===0 ? exportPreset===null : exportPreset?.w===p.w&&exportPreset?.h===p.h
                    return (
                      <button key={p.label} onClick={() => setExportPreset(p.w>0?{w:p.w,h:p.h}:null)}
                        className={`flex-1 min-w-0 py-1 text-[10px] rounded border transition-colors ${sel?'border-[#7C3AED] bg-[#7C3AED]/20 text-white':'border-[#2A2A2A] text-[#777] bg-[#111] hover:border-[#555]'}`}>
                        <div className="truncate">{p.label}</div>
                        {p.w>0&&<div className="text-[8px] opacity-60">{p.w}×{p.h}</div>}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-1 mb-2">
                  {(['png','webp','jpeg'] as const).map(f => (
                    <button key={f} onClick={() => setExportFormat(f)}
                      className={`flex-1 py-1 text-[10px] uppercase rounded border transition-colors ${exportFormat===f?'border-[#7C3AED] bg-[#7C3AED]/20 text-white':'border-[#2A2A2A] text-[#777] bg-[#111] hover:border-[#555]'}`}>
                      {f}
                    </button>
                  ))}
                </div>
                {exportFormat !== 'png' && (
                  <div className="mb-2">
                    <div className="flex justify-between mb-0.5"><span className="text-[10px] text-[#888]">品質</span><span className="text-[10px] text-[#666]">{exportQuality}%</span></div>
                    <input type="range" min="50" max="100" value={exportQuality} onChange={e => setExportQuality(+e.target.value)} className="w-full accent-[#7C3AED]" />
                  </div>
                )}
                <button onClick={handleExport} className="w-full py-1.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors">📤 エクスポート</button>
              </div>

              <hr className="border-[#2A2A2A]" />

              {/* 進化させる */}
              <div>
                <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">✏️ 進化させる</label>
                <textarea value={evolvePrompt} onChange={e => setEvolvePrompt(e.target.value)}
                  placeholder="追加の指示 (例: もっと明るく)" rows={2}
                  className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] resize-none focus:outline-none focus:border-[#7C3AED]" />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleEvolve} disabled={isEvolving||!evolvePrompt.trim()} className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white">{isEvolving?'処理中...':'🔄 変化させる'}</button>
                  <button onClick={handleRegenerate} disabled={isEvolving} className="flex-1 py-2 rounded-lg text-xs bg-[#1A1A1A] border border-[#2A2A2A] disabled:opacity-40 text-[#AAAAAA]">{isEvolving?'...':'♻️ 再生成'}</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 下部固定ボタン */}
        <div className="p-4 border-t border-[#2A2A2A] space-y-2 shrink-0">
          <div className="flex gap-2">
            <button onClick={handleDownload} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors">
              📄 {(text.text.trim()||shape.enabled)?'合成DL':'ダウンロード'}
            </button>
            <button onClick={handleCopyToClipboard} title="クリップボードにコピー"
              className="px-3 py-2.5 rounded-xl text-sm border border-[#3A3A3A] text-[#AAAAAA] hover:text-white hover:border-[#7C3AED] transition-colors">📋</button>
          </div>
          <button onClick={onBack} className="w-full py-2 rounded-lg text-xs text-[#777] hover:text-white hover:bg-[#1A1A1A] border border-[#2A2A2A] transition-colors">← 戻る</button>
        </div>
      </div>
    </div>
  )
}

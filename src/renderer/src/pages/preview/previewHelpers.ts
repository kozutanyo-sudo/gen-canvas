// ── 型定義 ──────────────────────────────────────────────────
export type ShapeType = 'circle' | 'rect' | 'roundrect' | 'star' | 'diamond'
export type CropShape  = 'none' | 'circle' | 'roundrect'
export type CropBg     = 'transparent' | 'black' | 'white'

export interface TextState {
  text: string; x: number; y: number; font: string; size: number
  color: string; bgColor: string; bgOpacity: number
  bold: boolean; italic: boolean; shadow: boolean
  stroke: boolean; strokeColor: string
}

export interface ShapeState {
  enabled: boolean; type: ShapeType; x: number; y: number
  size: number; color: string; opacity: number; sphere3d: boolean
}

// ── 定数 ────────────────────────────────────────────────────
export const GRID_POSITIONS = [
  [5,15],[50,15],[95,15],
  [5,50],[50,50],[95,50],
  [5,85],[50,85],[95,85],
] as const

export const GRID_ARROWS = ['↖','↑','↗','←','＋','→','↙','↓','↘'] as const

export const FONTS = [
  { id: 'gothic',  label: 'ゴシック',   css: "'BIZ UDPGothic','Yu Gothic UI',sans-serif" },
  { id: 'mincho',  label: '明朝',        css: "'BIZ UDMincho','Yu Mincho',serif" },
  { id: 'round',   label: '丸ゴシック',  css: "'Kosugi Maru','Rounded Mplus 1c',sans-serif" },
  { id: 'mono',    label: '等幅',        css: "'Consolas','Courier New',monospace" },
]

export const SHAPES: { id: ShapeType; label: string; emoji: string }[] = [
  { id: 'circle',   label: '球体',   emoji: '⬤' },
  { id: 'rect',     label: '四角',   emoji: '■' },
  { id: 'roundrect',label: '角丸',   emoji: '▪' },
  { id: 'star',     label: '星',     emoji: '★' },
  { id: 'diamond',  label: 'ダイヤ', emoji: '◆' },
]

export const COLOR_SWATCHES = [
  '#FFFFFF','#000000','#FF3B3B','#FF9500','#FFD60A',
  '#34C759','#30B0C7','#007AFF','#AF52DE','#FF2D55',
]

export const PIXEL_COLOR_OPTIONS: [number, string][] = [
  [0,'∞'],[64,'64'],[32,'32'],[16,'16'],[8,'8']
]

export const LUT_PRESETS = [
  { id: 'none',    label: 'なし',         filter: '' },
  { id: 'cinema',  label: 'シネマ',       filter: 'contrast(1.1) saturate(0.8) brightness(0.95)' },
  { id: 'vintage', label: 'ヴィンテージ', filter: 'sepia(0.35) contrast(0.9) brightness(1.05) saturate(0.85)' },
  { id: 'cold',    label: '冷色',         filter: 'saturate(0.85) hue-rotate(20deg) brightness(1.05)' },
  { id: 'warm',    label: '暖色',         filter: 'saturate(1.1) hue-rotate(-15deg) brightness(1.05)' },
  { id: 'fade',    label: 'フェード',     filter: 'brightness(1.12) contrast(0.8) saturate(0.65)' },
  { id: 'vivid',   label: 'ビビッド',     filter: 'contrast(1.15) saturate(1.55) brightness(1.02)' },
  { id: 'mono',    label: 'モノクロ',     filter: 'grayscale(1) contrast(1.1)' },
  { id: 'lomo',    label: 'ロモ',         filter: 'contrast(1.2) saturate(1.3) hue-rotate(-5deg) brightness(0.88)' },
]

export const SNS_PRESETS = [
  { label: '元サイズ', w: 0,    h: 0 },
  { label: 'Insta',   w: 1080, h: 1080 },
  { label: 'Twitter', w: 1500, h: 500 },
  { label: 'OGP',     w: 1200, h: 630 },
  { label: 'Favicon', w: 64,   h: 64 },
]

// ── ヘルパー関数 ─────────────────────────────────────────────
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function quantizeColors(imageData: ImageData, maxColors: number): void {
  const levels = Math.max(2, Math.round(Math.cbrt(maxColors)))
  const step = 256 / levels
  const px = imageData.data
  for (let i = 0; i < px.length; i += 4) {
    px[i]   = Math.min(255, Math.round(px[i]   / step) * step)
    px[i+1] = Math.min(255, Math.round(px[i+1] / step) * step)
    px[i+2] = Math.min(255, Math.round(px[i+2] / step) * step)
  }
}

export function shadeColor(hex: string, pct: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + pct))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + pct))
  const b = Math.max(0, Math.min(255, (num & 0xff) + pct))
  return `rgb(${r},${g},${b})`
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points: number): void {
  const inner = r * 0.45
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2
    const len = i % 2 === 0 ? r : inner
    i === 0
      ? ctx.moveTo(cx + len * Math.cos(angle), cy + len * Math.sin(angle))
      : ctx.lineTo(cx + len * Math.cos(angle), cy + len * Math.sin(angle))
  }
  ctx.closePath()
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  type: ShapeType, cx: number, cy: number, r: number,
  color: string, sphere3d: boolean
): void {
  ctx.beginPath()
  if (type === 'circle') {
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = sphere3d
      ? (() => {
          const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r)
          g.addColorStop(0, 'rgba(255,255,255,0.85)')
          g.addColorStop(0.4, color)
          g.addColorStop(1, shadeColor(color, -60))
          return g
        })()
      : color
    ctx.fill()
  } else if (type === 'rect') {
    ctx.rect(cx - r, cy - r, r * 2, r * 2)
    ctx.fillStyle = color; ctx.fill()
  } else if (type === 'roundrect') {
    ctx.roundRect(cx - r, cy - r, r * 2, r * 2, r * 0.25)
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

export async function compositeCanvas(
  canvas: HTMLCanvasElement,
  imgSrc: string,
  ts: TextState,
  ss: ShapeState
): Promise<string> {
  const img = await loadImage(imgSrc)
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const W = canvas.width, H = canvas.height

  if (ss.enabled) {
    ctx.globalAlpha = ss.opacity / 100
    drawShape(ctx, ss.type, ss.x / 100 * W, ss.y / 100 * H, ss.size / 100 * Math.min(W, H) * 0.5, ss.color, ss.sphere3d)
    ctx.globalAlpha = 1
  }

  if (ts.text.trim()) {
    const tx = ts.x / 100 * W, ty = ts.y / 100 * H
    const sz = Math.round(ts.size * W / 400)
    ctx.font = `${ts.italic ? 'italic ' : ''}${ts.bold ? 'bold ' : ''}${sz}px ${FONTS.find(f => f.id === ts.font)?.css ?? 'sans-serif'}`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (ts.bgOpacity > 0) {
      const m = ctx.measureText(ts.text), pad = sz * 0.3
      ctx.globalAlpha = ts.bgOpacity / 100
      ctx.fillStyle = ts.bgColor
      ctx.fillRect(tx - m.width / 2 - pad, ty - sz * 0.7, m.width + pad * 2, sz * 1.4)
      ctx.globalAlpha = 1
    }
    if (ts.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = sz * 0.25; ctx.shadowOffsetY = 2 }
    if (ts.stroke) { ctx.strokeStyle = ts.strokeColor; ctx.lineWidth = sz * 0.08; ctx.strokeText(ts.text, tx, ty) }
    ctx.fillStyle = ts.color; ctx.fillText(ts.text, tx, ty)
    ctx.shadowColor = 'transparent'
  }
  return canvas.toDataURL('image/png')
}

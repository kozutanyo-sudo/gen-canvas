import { useState } from 'react'
import type { TabType, GeneratedImage } from '../App'

// ---- スタイル定義 -------------------------------------------------------

const ICON_STYLES = [
  { id: 'flat',      label: 'フラット',    emoji: '⬜', prompt: 'flat design icon, vector art, solid colors, clean crisp edges, 2D illustration style' },
  { id: '3d',        label: '3D',          emoji: '🎲', prompt: '3D render icon, glossy surface, soft shadows, octane render, physically based rendering' },
  { id: 'minimal',   label: 'ミニマル',    emoji: '○',  prompt: 'minimalist icon, single color shape, ultra simple, geometric, pure form' },
  { id: 'gradient',  label: 'グラデ',      emoji: '🌈', prompt: 'gradient icon, smooth color transition, vibrant, modern app icon style' },
  { id: 'pixel',     label: 'ドット絵',    emoji: '👾', prompt: 'pixel art icon, 32x32 grid, retro 8-bit game sprite, bright palette' },
  { id: 'line',      label: '線画',        emoji: '✏️', prompt: 'line art icon, thin outline strokes only, no fill, monochrome sketch' },
  { id: 'watercolor',label: '水彩',        emoji: '🎨', prompt: 'watercolor painting icon, soft wet brushstrokes, translucent washes, artistic' },
  { id: 'clay',      label: 'クレイ',      emoji: '🪆', prompt: 'clay 3D icon, rounded soft sculpted shapes, pastel clay material, cute chibi style' },
  { id: 'glass',     label: 'ガラス',      emoji: '🔮', prompt: 'glassmorphism icon, frosted transparent glass effect, backdrop blur, light refraction' },
  { id: 'neon',      label: 'ネオン',      emoji: '💡', prompt: 'neon glow icon, bright electric light trails, dark background, cyberpunk aesthetic' },
  { id: 'vintage',   label: 'ヴィンテージ',emoji: '🎞', prompt: 'vintage retro icon, aged texture, muted desaturated palette, old poster style' },
  { id: 'comic',     label: 'コミック',    emoji: '💬', prompt: 'comic book icon, bold black ink outlines, halftone dot shading, pop art primary colors' },
]

const BG_STYLES = [
  { id: 'realistic',    label: '写実的',      emoji: '📷', prompt: 'photorealistic photograph, ultra high detail, natural lighting, DSLR quality, sharp focus' },
  { id: 'anime',        label: 'アニメ',      emoji: '✨', prompt: 'anime illustration, studio quality, cel shaded, beautiful lighting, no text signs' },
  { id: 'illustration', label: 'イラスト',    emoji: '🖌', prompt: 'professional digital illustration, concept art, painterly style, cinematic composition' },
  { id: 'abstract',     label: '抽象',        emoji: '🔷', prompt: 'abstract art, flowing organic shapes, bold geometric forms, contemporary gallery piece' },
  { id: 'minimal',      label: 'ミニマル',    emoji: '◻', prompt: 'minimalist design, large negative space, single focal element, clean typography-free' },
  { id: 'cyberpunk',    label: 'サイバー',    emoji: '🌆', prompt: 'cyberpunk cityscape, neon rain, holographic ads, dark futuristic atmosphere, Blade Runner style' },
  { id: 'watercolor',   label: '水彩',        emoji: '💧', prompt: 'loose watercolor painting, wet on wet technique, soft dreamy washes, fine art quality' },
  { id: 'fantasy',      label: 'ファンタジー', emoji: '🏰', prompt: 'high fantasy digital art, epic magical landscape, dramatic volumetric god rays, otherworldly' },
  { id: 'scifi',        label: 'SF宇宙',      emoji: '🚀', prompt: 'science fiction space art, nebula starfield, alien planet, hard sci-fi aesthetic, NASA style' },
  { id: 'nature',       label: '自然',        emoji: '🌿', prompt: 'nature landscape photography, lush forest, golden hour light, atmospheric mist, serene' },
  { id: 'dark',         label: 'ダーク',      emoji: '🌑', prompt: 'dark cinematic mood, dramatic chiaroscuro lighting, mysterious shadows, noir atmosphere' },
  { id: 'pastel',       label: 'パステル',    emoji: '🍬', prompt: 'pastel kawaii illustration, soft dreamy palette, cute aesthetic, gentle warm light' },
  { id: 'retro',        label: 'レトロ',      emoji: '📺', prompt: 'retro 80s vaporwave, synthwave aesthetic, purple pink sunset gradient, grid horizon' },
]

const TEMPLATES = [
  { label: 'アプリアイコン', prompt: 'simple clean app icon' },
  { label: 'ゲームアイコン', prompt: 'game icon badge, bold and dynamic' },
  { label: 'アバター',      prompt: 'cute character avatar portrait' },
  { label: 'ロゴマーク',    prompt: 'minimal modern logo mark, abstract symbol' },
]

const BG_SIZES = [
  { id: 'desktop', label: '🖥 デスクトップ', w: 1920, h: 1080 },
  { id: 'mobile',  label: '📱 スマホ',        w: 1080, h: 1920 },
  { id: 'twitter', label: '🐦 Twitter',       w: 1500, h: 500  },
  { id: 'youtube', label: '▶️ YouTube',       w: 2560, h: 1440 },
]

const STYLE_COLORS: Record<string, string> = {
  flat: '#4F46E5', '3d': '#059669', minimal: '#6B7280', gradient: '#EC4899',
  pixel: '#10B981', line: '#1F2937', watercolor: '#8B5CF6', clay: '#F59E0B',
  glass: '#06B6D4', neon: '#7C3AED', vintage: '#92400E', comic: '#DC2626',
  realistic: '#065F46', anime: '#6D28D9', illustration: '#B45309',
  abstract: '#1D4ED8', cyberpunk: '#7C3AED', fantasy: '#5B21B6',
  scifi: '#0369A1', nature: '#15803D', dark: '#1E1B4B', pastel: '#DB2777', retro: '#7C3AED',
}

const COLOR_PRESETS = [
  '#7C3AED','#2563EB','#16A34A','#DC2626',
  '#EA580C','#DB2777','#0D9488','#1F2937',
]

// 16進数カラーを自然言語に変換
function hexToColorName(hex: string): string {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  const l = (max+min)/255/2
  if (max===min) return l<0.2?'black':l>0.8?'white':'gray'
  const d = (max-min)/255
  let h: number
  if (max===r)      h = ((g-b)/255/d+6)%6*60
  else if (max===g) h = ((b-r)/255/d+2)*60
  else              h = ((r-g)/255/d+4)*60
  const sat = d/(1-Math.abs(2*l-1))
  if (sat<0.2) return l<0.4?'dark gray':l>0.7?'light gray':'gray'
  const dark = l<0.35?'dark ':'', bright = l>0.65?'bright ':''
  if (h<15||h>=345) return dark+'red'
  if (h<45)  return bright||dark?dark+'orange':'warm orange'
  if (h<75)  return dark+'yellow'
  if (h<165) return dark+'green'
  if (h<195) return dark+'teal'
  if (h<255) return dark+'blue'
  if (h<285) return dark+'indigo'
  if (h<315) return dark+'purple'
  return dark+'pink'
}

// 日本語文字が含まれるか判定
function hasJapanese(text: string): boolean {
  return /[぀-ヿ一-鿿]/.test(text)
}

// ---- コンポーネント -------------------------------------------------------

interface Props {
  activeTab: TabType
  onGenerated: (images: GeneratedImage[]) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (): any => (window as any).api

export default function GeneratePanel({ activeTab, onGenerated }: Props): JSX.Element {
  const [prompt, setPrompt]               = useState('')
  const [selectedStyle, setSelectedStyle] = useState('flat')
  const [color, setColor]                 = useState('#7C3AED')
  const [count, setCount]                 = useState(1)
  const [isGenerating, setIsGenerating]   = useState(false)
  const [progress, setProgress]           = useState('')
  const [selectedSize, setSelectedSize]   = useState('desktop')
  const [showPrompt, setShowPrompt]       = useState(false)
  const [builtPrompt, setBuiltPrompt]     = useState('')
  const [editedPrompt, setEditedPrompt]   = useState('')
  const [isTranslating, setIsTranslating] = useState(false)

  const styles = activeTab === 'icon' ? ICON_STYLES : BG_STYLES

  const handleStyleSelect = (id: string): void => {
    setSelectedStyle(id)
    if (STYLE_COLORS[id]) setColor(STYLE_COLORS[id])
  }

  // FLUXに最適化された英語プロンプトを組み立て
  const buildEnglishPrompt = (subject: string): string => {
    const styleObj = styles.find(s => s.id === selectedStyle)!
    const colorName = hexToColorName(color)

    if (activeTab === 'icon') {
      return [
        subject,
        styleObj.prompt,
        `${colorName} color scheme`,
        'white background, centered, no text, no watermark',
        'professional icon design, high quality, sharp',
      ].join(', ')
    } else {
      const sizeObj = BG_SIZES.find(s => s.id === selectedSize)
      const ratio = sizeObj ? (sizeObj.w > sizeObj.h ? 'wide landscape format' : 'tall portrait format') : 'landscape'
      return [
        subject,
        styleObj.prompt,
        `${colorName} dominant color palette`,
        ratio,
        'no text, no signs, no writing, no watermark, no UI elements',
        'stunning visuals, masterpiece quality',
      ].join(', ')
    }
  }

  // プロンプト確認パネルを開く
  const handlePreviewPrompt = (): void => {
    const built = buildEnglishPrompt(prompt.trim() || '(未入力)')
    setBuiltPrompt(built)
    setEditedPrompt(built)
    setShowPrompt(true)
  }

  // 日本語を翻訳してプロンプトを更新
  const handleTranslate = async (): Promise<void> => {
    if (!prompt.trim() || isTranslating) return
    setIsTranslating(true)
    try {
      const translated = await api().translateText(prompt.trim())
      const built = buildEnglishPrompt(translated)
      setBuiltPrompt(built)
      setEditedPrompt(built)
      setShowPrompt(true)
    } catch {
      alert('翻訳に失敗しました。')
    } finally {
      setIsTranslating(false)
    }
  }

  // 画像生成（editedPromptがあればそれを使う）
  const handleGenerate = async (useBuilt = false): Promise<void> => {
    if (!prompt.trim() || isGenerating) return
    setIsGenerating(true)
    setProgress('')

    try {
      const finalPrompt = useBuilt && editedPrompt ? editedPrompt : buildEnglishPrompt(prompt.trim())
      const sizeObj = activeTab === 'icon'
        ? { w: 1024, h: 1024 }
        : BG_SIZES.find(s => s.id === selectedSize) || { w: 1920, h: 1080 }

      console.log('[GenCanvas] 送信プロンプト:', finalPrompt)
      const results: GeneratedImage[] = []

      for (let i = 0; i < count; i++) {
        setProgress(count > 1 ? `生成中... (${i+1}/${count})` : '生成中...')
        const url = await api().generateImage(finalPrompt, sizeObj.w, sizeObj.h)
        results.push({
          id: `${Date.now()}-${i}`, url,
          prompt: prompt, style: selectedStyle,
          type: activeTab, createdAt: Date.now(),
        })
      }
      onGenerated(results)
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      alert(
        raw.includes('NO_TOKEN')       ? 'APIトークンが未設定です。⚙️から設定してください。' :
        raw.includes('INVALID_TOKEN')  ? 'APIトークンが無効です。⚙️から再設定してください。' :
        raw.includes('REQUEST_TIMEOUT')? '生成タイムアウト。再試行してください。' :
        raw.includes('MODEL_LOADING')  ? 'AIモデル準備中です。少し待って再試行してください。' :
        `生成に失敗しました。(${raw})`
      )
    } finally {
      setIsGenerating(false)
      setProgress('')
    }
  }

  const isJa = hasJapanese(prompt)

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ===== 左パネル ===== */}
      <div className="w-80 border-r border-[#2A2A2A] flex flex-col overflow-y-auto p-5 gap-5 shrink-0">

        {/* プロンプト */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#AAAAAA]">
              {activeTab === 'icon' ? 'どんなアイコン？' : 'どんな背景？'}
            </label>
            {isJa && (
              <span className="text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded">
                🌐 日本語検出
              </span>
            )}
          </div>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={activeTab === 'icon'
              ? 'blue cat holding coffee / 青い猫がコーヒーを持っている'
              : 'misty forest at sunrise / 霧の幻想的な森の夜明け'}
            rows={3}
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] resize-none focus:outline-none focus:border-[#7C3AED] transition-colors"
            onKeyDown={e => { if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) handleGenerate() }}
          />
          {/* 翻訳ヒント */}
          {isJa && (
            <div className="text-[10px] text-[#888] bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2">
              💡 英語のほうが精度が高いです。<br />
              下の「🌐 翻訳して生成」で自動変換できます。
            </div>
          )}
        </div>

        {/* テンプレート (アイコン) */}
        {activeTab === 'icon' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#AAAAAA]">テンプレート</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TEMPLATES.map(t => (
                <button key={t.label} onClick={() => setPrompt(t.prompt)}
                  className="text-xs px-2 py-1.5 bg-[#111] border border-[#2A2A2A] rounded-md text-[#AAAAAA] hover:text-white hover:border-[#7C3AED] transition-colors text-left">
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* サイズ (背景) */}
        {activeTab === 'background' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#AAAAAA]">サイズ</label>
            <div className="flex flex-col gap-1.5">
              {BG_SIZES.map(s => (
                <button key={s.id} onClick={() => setSelectedSize(s.id)}
                  className={`text-xs px-3 py-2 rounded-md border text-left transition-colors ${
                    selectedSize===s.id
                      ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white'
                      : 'bg-[#111] border-[#2A2A2A] text-[#AAAAAA] hover:border-[#3A3A3A]'
                  }`}>
                  <span>{s.label}</span>
                  <span className="text-[#777] ml-2">{s.w}×{s.h}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* スタイル */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#AAAAAA]">スタイル <span className="text-[#555] font-normal text-[10px]">（選択で色も自動設定）</span></label>
          <div className="grid grid-cols-3 gap-1.5">
            {styles.map(s => (
              <button key={s.id} onClick={() => handleStyleSelect(s.id)}
                className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-colors ${
                  selectedStyle===s.id
                    ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white'
                    : 'bg-[#111] border-[#2A2A2A] text-[#AAAAAA] hover:text-white hover:border-[#3A3A3A]'
                }`}>
                <span className="text-sm">{s.emoji}</span>
                <span className="leading-tight text-center text-[10px]">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* カラー */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#AAAAAA]">
            メインカラー <span className="text-[#666] font-normal text-[10px]">現在: {hexToColorName(color)}</span>
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_PRESETS.map(c => (
              <button key={c} onClick={() => setColor(c)} title={hexToColorName(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color===c?'border-white scale-110':'border-transparent hover:scale-105'}`} />
            ))}
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
          </div>
        </div>

        {/* 生成数 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#AAAAAA]">生成数</label>
          <div className="flex gap-2">
            {[1,2,4].map(n => (
              <button key={n} onClick={() => setCount(n)}
                className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                  count===n ? 'bg-[#7C3AED] border-[#7C3AED] text-white' : 'bg-[#111] border-[#2A2A2A] text-[#AAAAAA] hover:text-white'
                }`}>{n}</button>
            ))}
          </div>
        </div>

        {/* ボタン群 */}
        <div className="flex flex-col gap-2">
          {/* メイン生成ボタン */}
          <button onClick={() => handleGenerate(false)}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-[#7C3AED]/20 transition-all">
            {isGenerating ? (progress || '✨ 生成中...') : '✨ 生成する'}
          </button>

          {/* 翻訳して生成（日本語検出時のみ強調） */}
          <button onClick={handleTranslate}
            disabled={isGenerating || isTranslating || !prompt.trim()}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed border ${
              isJa
                ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/30'
                : 'bg-[#111] border-[#2A2A2A] text-[#AAAAAA] hover:text-white'
            }`}>
            {isTranslating ? '🌐 翻訳中...' : '🌐 日本語→英語に翻訳してプレビュー'}
          </button>

          {/* プロンプト確認ボタン */}
          <button onClick={handlePreviewPrompt}
            disabled={!prompt.trim()}
            className="w-full py-2 rounded-lg text-xs text-[#777] hover:text-[#AAAAAA] border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors disabled:opacity-40">
            🔍 AIへの送信プロンプトを確認
          </button>
        </div>

        <p className="text-[10px] text-[#444] text-center -mt-2">Ctrl+Enter でも生成できます</p>
      </div>

      {/* ===== 中央エリア ===== */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {showPrompt ? (
          /* プロンプトプレビュー/編集パネル */
          <div className="w-full max-w-2xl p-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">🔍 AIへ送るプロンプト（英語）</h2>
              <button onClick={() => setShowPrompt(false)} className="text-xs text-[#666] hover:text-white">✕ 閉じる</button>
            </div>

            <div className="text-xs text-[#777] bg-[#111] border border-[#2A2A2A] rounded-lg p-3">
              <span className="text-[#F59E0B]">あなたの入力：</span> {prompt}
            </div>

            <div>
              <label className="text-xs text-[#AAAAAA] mb-1.5 block">
                送信する英語プロンプト <span className="text-[#555]">（編集可能）</span>
              </label>
              <textarea
                value={editedPrompt}
                onChange={e => setEditedPrompt(e.target.value)}
                rows={6}
                className="w-full bg-[#111] border border-[#3A3A3A] rounded-lg px-4 py-3 text-sm text-[#E0E0E0] font-mono resize-none focus:outline-none focus:border-[#7C3AED] transition-colors leading-relaxed"
              />
            </div>

            <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-3 text-xs text-[#666] space-y-1">
              <p>💡 <span className="text-[#888]">良いプロンプトのコツ：</span></p>
              <p>• 具体的な形容詞を使う（"glowing blue" vs "blue"）</p>
              <p>• スタイルは末尾に（"flat design icon, vector"）</p>
              <p>• 英語のほうが精度が約2倍高いです</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowPrompt(false); handleGenerate(true) }}
                disabled={isGenerating || !editedPrompt.trim()}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white transition-colors">
                {isGenerating ? progress || '✨ 生成中...' : '✨ このプロンプトで生成'}
              </button>
              <button onClick={() => { setEditedPrompt(builtPrompt) }}
                className="px-4 py-3 rounded-xl text-sm border border-[#2A2A2A] text-[#777] hover:text-white transition-colors">
                リセット
              </button>
            </div>
          </div>
        ) : (
          /* 待機画面 */
          <div className="text-center">
            <div className="text-6xl mb-4 opacity-30">🎨</div>
            <p className="text-base font-medium text-[#666]">左のパネルから画像を生成してください</p>
            <p className="text-sm text-[#555] mt-2">日本語を入力したら「🌐 翻訳」で精度アップ</p>
          </div>
        )}
      </div>
    </div>
  )
}

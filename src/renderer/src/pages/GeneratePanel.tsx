import { useState } from 'react'
import type { TabType, GeneratedImage } from '../App'

const ICON_STYLES = [
  { id: 'flat',     label: 'フラット',   emoji: '⬜', prompt: 'flat design, simple, clean, vector' },
  { id: '3d',       label: '3D',         emoji: '🎲', prompt: '3d render, volumetric, glossy, octane render' },
  { id: 'minimal',  label: 'ミニマル',   emoji: '○', prompt: 'minimalist, simple, single color, clean lines' },
  { id: 'gradient', label: 'グラデ',     emoji: '🌈', prompt: 'gradient colors, smooth, vibrant, colorful' },
  { id: 'pixel',    label: 'ドット絵',   emoji: '👾', prompt: 'pixel art, 8bit, retro game sprite' },
  { id: 'line',     label: '線画',       emoji: '✏️', prompt: 'line art, outline only, thin strokes, sketch' },
  { id: 'watercolor',label:'水彩',       emoji: '🎨', prompt: 'watercolor painting, soft brushstrokes, artistic' },
  { id: 'clay',     label: 'クレイ',     emoji: '🪆', prompt: 'clay 3d render, soft rounded shapes, cute, pastel' },
  { id: 'glass',    label: 'ガラス',     emoji: '🔮', prompt: 'glassmorphism, frosted glass, transparent, blur effect' },
  { id: 'neon',     label: 'ネオン',     emoji: '💡', prompt: 'neon glow effect, dark background, vivid electric colors, cyberpunk' },
  { id: 'vintage',  label: 'ヴィンテージ',emoji:'🎞', prompt: 'vintage retro style, aged texture, muted colors, nostalgic' },
  { id: 'comic',    label: 'コミック',   emoji: '💬', prompt: 'comic book style, bold black outlines, halftone dots, pop art' },
]

const BG_STYLES = [
  { id: 'realistic',   label: '写実的',     emoji: '📷', prompt: 'photorealistic, detailed, high quality, natural lighting' },
  { id: 'anime',       label: 'アニメ',     emoji: '✨', prompt: 'anime style, studio ghibli inspired, soft cel shading' },
  { id: 'illustration',label: 'イラスト',   emoji: '🖌', prompt: 'digital illustration, colorful, detailed, concept art' },
  { id: 'abstract',    label: '抽象',       emoji: '🔷', prompt: 'abstract art, geometric shapes, modern, bold composition' },
  { id: 'minimal',     label: 'ミニマル',   emoji: '◻', prompt: 'minimalist, clean, simple shapes, lots of negative space' },
  { id: 'cyberpunk',   label: 'サイバー',   emoji: '🌆', prompt: 'cyberpunk, neon lights, rain, futuristic city, dark atmosphere' },
  { id: 'watercolor',  label: '水彩',       emoji: '💧', prompt: 'watercolor painting, soft colors, artistic, dreamy' },
  { id: 'fantasy',     label: 'ファンタジー',emoji:'🏰', prompt: 'fantasy world, magical, epic, dramatic lighting, mystical' },
  { id: 'scifi',       label: 'SF宇宙',     emoji: '🚀', prompt: 'science fiction, space, stars, futuristic technology, cosmic' },
  { id: 'nature',      label: '自然',       emoji: '🌿', prompt: 'nature, lush forest, peaceful, soft morning light, serene' },
  { id: 'dark',        label: 'ダーク',     emoji: '🌑', prompt: 'dark moody atmosphere, dramatic shadows, mysterious, cinematic' },
  { id: 'pastel',      label: 'パステル',   emoji: '🍬', prompt: 'pastel colors, soft dreamy, kawaii, light and airy' },
  { id: 'retro',       label: 'レトロ',     emoji: '📺', prompt: 'retro 80s vaporwave aesthetic, synthwave, purple pink sunset' },
]

const TEMPLATES = [
  { id: 'app',    label: 'アプリアイコン', prompt: 'シンプルなアプリアイコン' },
  { id: 'game',   label: 'ゲーム',        prompt: 'ゲーム用のかっこいいアイコン' },
  { id: 'avatar', label: 'アバター',      prompt: 'キャラクターのかわいいアバター' },
  { id: 'logo',   label: 'ロゴマーク',    prompt: 'シンプルでモダンなロゴマーク' },
]

const BG_SIZES = [
  { id: 'desktop', label: '🖥 デスクトップ', w: 1920, h: 1080 },
  { id: 'mobile',  label: '📱 スマホ',       w: 1080, h: 1920 },
  { id: 'twitter', label: '🐦 Twitter',      w: 1500, h: 500  },
  { id: 'youtube', label: '▶️ YouTube',      w: 2560, h: 1440 },
]

// スタイル別の推奨カラー
const STYLE_COLORS: Record<string, string> = {
  flat: '#4F46E5', '3d': '#059669', minimal: '#6B7280',
  gradient: '#EC4899', pixel: '#10B981', line: '#1F2937',
  watercolor: '#8B5CF6', clay: '#F59E0B', glass: '#06B6D4',
  neon: '#7C3AED', vintage: '#92400E', comic: '#DC2626',
  realistic: '#065F46', anime: '#6D28D9', illustration: '#B45309',
  abstract: '#1D4ED8', cyberpunk: '#7C3AED', fantasy: '#5B21B6',
  scifi: '#0369A1', nature: '#15803D', dark: '#1E1B4B',
  pastel: '#DB2777', retro: '#7C3AED',
}

// カラープリセット
const COLOR_PRESETS = [
  { label: 'パープル', value: '#7C3AED' },
  { label: 'ブルー',   value: '#2563EB' },
  { label: 'グリーン', value: '#16A34A' },
  { label: 'レッド',   value: '#DC2626' },
  { label: 'オレンジ', value: '#EA580C' },
  { label: 'ピンク',   value: '#DB2777' },
  { label: 'ティール', value: '#0D9488' },
  { label: '黒',       value: '#111827' },
]

interface Props {
  activeTab: TabType
  onGenerated: (images: GeneratedImage[]) => void
}

export default function GeneratePanel({ activeTab, onGenerated }: Props): JSX.Element {
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('flat')
  const [color, setColor] = useState('#7C3AED')
  const [count, setCount] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState('')
  const [selectedSize, setSelectedSize] = useState('desktop')

  const styles = activeTab === 'icon' ? ICON_STYLES : BG_STYLES

  const handleStyleSelect = (styleId: string): void => {
    setSelectedStyle(styleId)
    // スタイルに合わせてカラーを自動設定
    if (STYLE_COLORS[styleId]) {
      setColor(STYLE_COLORS[styleId])
    }
  }

  const buildPrompt = (userPrompt: string): string => {
    const styleObj = styles.find(s => s.id === selectedStyle)
    const styleDesc = styleObj?.prompt || ''
    const colorHex = color

    if (activeTab === 'icon') {
      return `${userPrompt}, app icon, ${styleDesc}, color scheme ${colorHex}, isolated on white background, centered, professional, high quality, no text`
    } else {
      const size = BG_SIZES.find(s => s.id === selectedSize)
      const ratio = size ? (size.w > size.h ? 'wide landscape' : 'tall portrait') : 'landscape'
      return `${userPrompt}, background art, ${styleDesc}, color palette inspired by ${colorHex}, ${ratio} composition, high quality, no text, no ui elements, no watermark`
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateImageViaMain = (p: string, w: number, h: number): Promise<string> =>
    (window as any).api.generateImage(p, w, h)

  const handleGenerate = async (): Promise<void> => {
    if (!prompt.trim() || isGenerating) return
    setIsGenerating(true)
    setGenerateProgress('')

    try {
      const size = activeTab === 'icon'
        ? { w: 1024, h: 1024 }
        : BG_SIZES.find(s => s.id === selectedSize) || { w: 1920, h: 1080 }

      const builtPrompt = buildPrompt(prompt)
      const results: GeneratedImage[] = []

      for (let i = 0; i < count; i++) {
        setGenerateProgress(count > 1 ? `生成中... (${i + 1}/${count})` : '生成中...')
        const blobUrl = await generateImageViaMain(builtPrompt, size.w, size.h)
        results.push({
          id: `${Date.now()}-${i}`,
          url: blobUrl,
          prompt: prompt,
          style: selectedStyle,
          type: activeTab,
          createdAt: Date.now()
        })
      }

      onGenerated(results)
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      const msg =
        raw.includes('NO_TOKEN')      ? 'APIトークンが設定されていません。⚙️から設定してください。' :
        raw.includes('INVALID_TOKEN') ? 'APIトークンが無効です。⚙️から再設定してください。' :
        raw.includes('REQUEST_TIMEOUT')? '生成タイムアウト。再度お試しください。' :
        raw.includes('MODEL_LOADING') ? 'AIモデル準備中です。少し待ってから再試行してください。' :
        `生成に失敗しました。(${raw})`
      alert(msg)
    } finally {
      setIsGenerating(false)
      setGenerateProgress('')
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 左パネル */}
      <div className="w-80 border-r border-[#2A2A2A] flex flex-col overflow-y-auto p-5 gap-5 shrink-0">

        {/* プロンプト入力 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#AAAAAA]">
            {activeTab === 'icon' ? 'どんなアイコンを作りますか？' : 'どんな背景を作りますか？'}
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={activeTab === 'icon' ? '例: 青い猫のシンプルなアイコン' : '例: 夕焼けの幻想的な森'}
            rows={3}
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#666] resize-none focus:outline-none focus:border-[#7C3AED] transition-colors"
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate() }}
          />
        </div>

        {/* クイックテンプレート (アイコンのみ) */}
        {activeTab === 'icon' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#AAAAAA]">テンプレート</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setPrompt(t.prompt)}
                  className="text-xs px-2 py-1.5 bg-[#111111] border border-[#2A2A2A] rounded-md text-[#AAAAAA] hover:text-white hover:border-[#7C3AED] transition-colors text-left"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* サイズ選択 (背景のみ) */}
        {activeTab === 'background' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#AAAAAA]">サイズ</label>
            <div className="flex flex-col gap-1.5">
              {BG_SIZES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSize(s.id)}
                  className={`text-xs px-3 py-2 rounded-md border text-left transition-colors ${
                    selectedSize === s.id
                      ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white'
                      : 'bg-[#111111] border-[#2A2A2A] text-[#AAAAAA] hover:text-white hover:border-[#3A3A3A]'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className="text-[#777] ml-2">{s.w}×{s.h}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* スタイル選択 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#AAAAAA]">スタイル <span className="text-[#666] font-normal">（選択で色も自動設定）</span></label>
          <div className="grid grid-cols-3 gap-1.5">
            {styles.map(s => (
              <button
                key={s.id}
                onClick={() => handleStyleSelect(s.id)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs transition-colors ${
                  selectedStyle === s.id
                    ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white'
                    : 'bg-[#111111] border-[#2A2A2A] text-[#AAAAAA] hover:text-white hover:border-[#3A3A3A]'
                }`}
              >
                <span className="text-sm">{s.emoji}</span>
                <span className="leading-tight text-center">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* カラー */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#AAAAAA]">メインカラー</label>
          {/* プリセット */}
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => setColor(p.value)}
                title={p.label}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  color === p.value ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: p.value }}
              />
            ))}
          </div>
          {/* カラーピッカー */}
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
            />
            <span className="text-sm text-[#AAAAAA] font-mono">{color}</span>
          </div>
        </div>

        {/* 生成数 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#AAAAAA]">生成数</label>
          <div className="flex gap-2">
            {[1, 2, 4].map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                  count === n
                    ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                    : 'bg-[#111111] border-[#2A2A2A] text-[#AAAAAA] hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* 生成ボタン */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-[#7C3AED]/20"
        >
          {isGenerating ? (generateProgress || '✨ 生成中...') : '✨ 生成する'}
        </button>
        <p className="text-xs text-[#555] text-center -mt-3">Ctrl+Enter で生成</p>
      </div>

      {/* 中央：待機中のメッセージ */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-30">🎨</div>
          <p className="text-base font-medium text-[#666]">左のパネルから画像を生成してください</p>
          <p className="text-sm text-[#555] mt-2">Ctrl+Enter で素早く生成</p>
        </div>
      </div>
    </div>
  )
}

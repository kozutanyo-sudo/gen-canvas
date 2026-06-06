import { useState } from 'react'
import type { TabType, GeneratedImage } from '../App'

const ICON_STYLES = [
  { id: 'flat', label: 'Flat', emoji: '⬜' },
  { id: '3d', label: '3D', emoji: '🎲' },
  { id: 'minimal', label: 'ミニマル', emoji: '◾' },
  { id: 'gradient', label: 'グラデ', emoji: '🌈' },
  { id: 'pixel', label: 'ドット', emoji: '👾' },
  { id: 'line', label: '線画', emoji: '✏️' },
  { id: 'watercolor', label: '水彩', emoji: '🎨' },
]

const BG_STYLES = [
  { id: 'realistic', label: '写実的', emoji: '📷' },
  { id: 'anime', label: 'アニメ', emoji: '✨' },
  { id: 'illustration', label: 'イラスト', emoji: '🖌' },
  { id: 'abstract', label: '抽象', emoji: '🔷' },
  { id: 'minimal', label: 'ミニマル', emoji: '◾' },
  { id: 'cyberpunk', label: 'サイバー', emoji: '🌆' },
  { id: 'watercolor', label: '水彩', emoji: '💧' },
]

const TEMPLATES = [
  { id: 'app', label: 'アプリアイコン', prompt: 'シンプルなアプリアイコン' },
  { id: 'game', label: 'ゲームアイコン', prompt: 'ゲーム用のかっこいいアイコン' },
  { id: 'avatar', label: 'アバター', prompt: 'キャラクターのアバターアイコン' },
  { id: 'logo', label: 'ロゴ', prompt: 'シンプルなロゴマーク' },
]

const BG_SIZES = [
  { id: 'desktop', label: '🖥 デスクトップ', w: 1920, h: 1080 },
  { id: 'mobile', label: '📱 スマホ', w: 1080, h: 1920 },
  { id: 'twitter', label: '🐦 Twitter', w: 1500, h: 500 },
  { id: 'youtube', label: '▶️ YouTube', w: 2560, h: 1440 },
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
  const [quality, setQuality] = useState(0.5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState('')
  const [selectedSize, setSelectedSize] = useState('desktop')

  const styles = activeTab === 'icon' ? ICON_STYLES : BG_STYLES

  const buildPrompt = (userPrompt: string): string => {
    const styleMap: Record<string, string> = {
      flat: 'flat design, simple, clean',
      '3d': '3d render, volumetric, glossy',
      minimal: 'minimalist, simple, clean lines',
      gradient: 'gradient colors, smooth, vibrant',
      pixel: 'pixel art, 8bit, retro',
      line: 'line art, outline, sketch',
      watercolor: 'watercolor painting, soft, artistic',
      realistic: 'photorealistic, detailed, high quality',
      anime: 'anime style, cel shaded, japanese animation',
      illustration: 'digital illustration, colorful, detailed',
      abstract: 'abstract art, geometric, modern',
      cyberpunk: 'cyberpunk, neon, futuristic, dark',
    }

    const styleDesc = styleMap[selectedStyle] || ''

    const colorDesc = `dominant color ${color}`

    if (activeTab === 'icon') {
      return `${userPrompt}, app icon, ${styleDesc}, ${colorDesc}, isolated on white background, centered, professional, high quality`
    } else {
      const size = BG_SIZES.find(s => s.id === selectedSize)
      const ratio = size ? (size.w > size.h ? 'wide landscape' : 'tall portrait') : 'landscape'
      return `${userPrompt}, background art, ${styleDesc}, ${colorDesc}, ${ratio} composition, high quality, no text, no ui elements`
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
        raw.includes('NO_TOKEN') ? 'APIトークンが設定されていません。⚙️から設定してください。' :
        raw.includes('INVALID_TOKEN') ? 'APIトークンが無効です。⚙️から再設定してください。' :
        raw.includes('REQUEST_TIMEOUT') ? '生成タイムアウト。再度お試しください。' :
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
          <label className="text-xs text-[#A0A0A0] font-medium uppercase tracking-wider">
            {activeTab === 'icon' ? 'どんなアイコンを作りますか？' : 'どんな背景を作りますか？'}
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={activeTab === 'icon' ? '例: 青い猫のシンプルなアイコン' : '例: 夕焼けの幻想的な森'}
            rows={3}
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] resize-none focus:outline-none focus:border-[#7C3AED] transition-colors"
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate() }}
          />
        </div>

        {/* クイックテンプレート (アイコンのみ) */}
        {activeTab === 'icon' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-[#A0A0A0] font-medium uppercase tracking-wider">テンプレート</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setPrompt(t.prompt)}
                  className="text-xs px-2 py-1.5 bg-[#111111] border border-[#2A2A2A] rounded-md text-[#A0A0A0] hover:text-white hover:border-[#7C3AED] transition-colors text-left"
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
            <label className="text-xs text-[#A0A0A0] font-medium uppercase tracking-wider">サイズ</label>
            <div className="flex flex-col gap-1.5">
              {BG_SIZES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSize(s.id)}
                  className={`text-xs px-3 py-2 rounded-md border text-left transition-colors ${
                    selectedSize === s.id
                      ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white'
                      : 'bg-[#111111] border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:border-[#3A3A3A]'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className="text-[#555] ml-2">{s.w}×{s.h}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* スタイル選択 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#A0A0A0] font-medium uppercase tracking-wider">スタイル</label>
          <div className="grid grid-cols-3 gap-1.5">
            {styles.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStyle(s.id)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs transition-colors ${
                  selectedStyle === s.id
                    ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white'
                    : 'bg-[#111111] border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:border-[#3A3A3A]'
                }`}
              >
                <span className="text-base">{s.emoji}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* カラー */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#A0A0A0] font-medium uppercase tracking-wider">メインカラー</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
            />
            <span className="text-sm text-[#A0A0A0] font-mono">{color}</span>
          </div>
        </div>

        {/* 生成数 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#A0A0A0] font-medium uppercase tracking-wider">生成数</label>
          <div className="flex gap-2">
            {[1, 2, 4].map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                  count === n
                    ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                    : 'bg-[#111111] border-[#2A2A2A] text-[#A0A0A0] hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* 品質スライダー */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#A0A0A0] font-medium uppercase tracking-wider">モード</label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#A0A0A0]">⚡ 速い</span>
            <input
              type="range"
              min="0" max="1" step="0.5"
              value={quality}
              onChange={e => setQuality(parseFloat(e.target.value))}
              className="flex-1 accent-[#7C3AED]"
            />
            <span className="text-xs text-[#A0A0A0]">🌟 美しく</span>
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
      </div>

      {/* 中央：待機中のメッセージ */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-[#333]">
          <div className="text-6xl mb-4">🎨</div>
          <p className="text-lg font-medium text-[#555]">左のパネルから画像を生成してください</p>
          <p className="text-sm text-[#444] mt-2">Ctrl+Enter で素早く生成</p>
        </div>
      </div>
    </div>
  )
}

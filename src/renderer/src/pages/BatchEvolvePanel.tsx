import { useState } from 'react'
import type { GeneratedImage } from '../App'
import type { ToastType } from '../components/Toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (): any => (window as any).api

interface Props {
  images: GeneratedImage[]
  onBack: () => void
  onAddToHistory: (images: GeneratedImage[]) => void
  showToast: (msg: string, type?: ToastType) => void
}

export default function BatchEvolvePanel({ images, onBack, onAddToHistory, showToast }: Props): JSX.Element {
  const [evolvePrompt, setEvolvePrompt] = useState('')
  const [isEvolving, setIsEvolving] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [results, setResults] = useState<(GeneratedImage | null)[]>(images.map(() => null))
  const [saved, setSaved] = useState(false)

  const size = images[0]?.type === 'icon' ? { w: 1024, h: 1024 } : { w: 1920, h: 1080 }
  const doneResults = results.filter(Boolean) as GeneratedImage[]

  const handleEvolveAll = async (): Promise<void> => {
    if (!evolvePrompt.trim() || isEvolving) return
    setIsEvolving(true)
    setSaved(false)
    const fresh: (GeneratedImage | null)[] = images.map(() => null)
    setResults([...fresh])

    for (let i = 0; i < images.length; i++) {
      setCurrentIdx(i)
      const img = images[i]
      try {
        const base = img.englishPrompt || img.prompt
        const newEnglishPrompt = `${base}, ${evolvePrompt}`
        const url = await api().generateImage(newEnglishPrompt, size.w, size.h, {
          numSteps: 6, guidanceScale: 3.5, seed: -1,
        })
        const evolved: GeneratedImage = {
          id: `batch-${Date.now()}-${i}`,
          url, prompt: img.prompt, englishPrompt: newEnglishPrompt,
          style: img.style, type: img.type, createdAt: Date.now(),
          params: { steps: 6, guidance: 3.5, seed: -1 },
        }
        fresh[i] = evolved
        setResults([...fresh])
      } catch {
        showToast(`${i + 1}枚目の進化に失敗しました`, 'error')
      }
    }
    setCurrentIdx(-1)
    setIsEvolving(false)
  }

  const handleSaveAll = (): void => {
    if (doneResults.length === 0) return
    onAddToHistory(doneResults)
    setSaved(true)
    showToast(`${doneResults.length}枚を履歴に保存しました`, 'success')
  }

  const colCount = Math.min(images.length, 4)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[#2A2A2A] shrink-0">
        <button onClick={onBack} className="text-sm text-[#777] hover:text-white transition-colors">← 戻る</button>
        <h2 className="text-sm font-semibold text-white">
          🔄 一括進化 <span className="text-[#555] font-normal">— {images.length}枚</span>
        </h2>
        {doneResults.length > 0 && (
          <button onClick={handleSaveAll} disabled={saved}
            className={`ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              saved ? 'text-[#555] cursor-default' : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
            }`}>
            {saved ? '✅ 保存済み' : `💾 ${doneResults.length}枚を履歴に保存`}
          </button>
        )}
      </div>

      {/* 進化プロンプト */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2A2A2A] shrink-0 bg-[#0D0D0D]">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs text-[#777]">
            全枚数に適用する追加指示
          </label>
          <input
            type="text"
            value={evolvePrompt}
            onChange={e => setEvolvePrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEvolveAll()}
            placeholder="例: もっと明るく　/ 3D風に　/ ネオンカラーで　/ よりリアルに"
            className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-4 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
        </div>
        <button
          onClick={handleEvolveAll}
          disabled={isEvolving || !evolvePrompt.trim()}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-white shrink-0 transition-colors"
        >
          {isEvolving
            ? `⏳ 生成中 ${currentIdx + 1}/${images.length}`
            : `🔄 ${images.length}枚まとめて進化`}
        </button>
      </div>

      {/* 元画像 + 進化後 グリッド */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
          {images.map((img, i) => (
            <div key={img.id} className="flex flex-col gap-2">
              {/* 元画像 */}
              <div className="relative">
                <img
                  src={img.url}
                  className="w-full aspect-square object-cover rounded-lg border border-[#2A2A2A]"
                  alt={img.prompt}
                />
                <span className="absolute top-1.5 left-1.5 text-[10px] bg-black/70 text-[#AAAAAA] px-1.5 py-0.5 rounded">
                  元
                </span>
              </div>

              {/* 矢印 */}
              <div className="text-center text-[#444] text-lg leading-none">
                {isEvolving && currentIdx === i ? '⟳' : '↓'}
              </div>

              {/* 進化後 */}
              <div className="relative aspect-square rounded-lg border overflow-hidden bg-[#0D0D0D] flex items-center justify-center"
                style={{ borderColor: results[i] ? '#7C3AED' : '#1A1A1A' }}>
                {results[i] ? (
                  <>
                    <img src={results[i]!.url} className="w-full h-full object-cover" alt="evolved" />
                    <span className="absolute top-1.5 left-1.5 text-[10px] bg-[#7C3AED]/90 text-white px-1.5 py-0.5 rounded">
                      進化後
                    </span>
                  </>
                ) : (
                  <div className="text-center text-[#333] select-none">
                    {isEvolving && currentIdx === i
                      ? <span className="text-[#7C3AED] text-xs animate-pulse">生成中...</span>
                      : <span className="text-2xl">○</span>
                    }
                  </div>
                )}
              </div>

              <p className="text-[10px] text-[#666] text-center truncate px-1">{img.prompt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import type { GeneratedImage } from '../App'

interface Props {
  images: GeneratedImage[]
  onBack: () => void
  onSelect: (img: GeneratedImage) => void
}

export default function ComparePanel({ images, onBack, onSelect }: Props): JSX.Element {
  const gridCols = images.length === 2 ? 'grid-cols-2' : images.length === 3 ? 'grid-cols-3' : 'grid-cols-2'

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0A]">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[#2A2A2A] shrink-0">
        <button onClick={onBack} className="text-sm text-[#777] hover:text-white transition-colors">← 戻る</button>
        <h2 className="text-sm font-semibold text-white">🔭 比較モード <span className="text-[#555] font-normal">— {images.length}枚</span></h2>
        <span className="text-xs text-[#555] ml-2">クリックで編集画面へ</span>
      </div>

      <div className={`flex-1 overflow-auto p-6 grid gap-4 content-start ${gridCols}`}>
        {images.map((img, i) => (
          <div key={img.id} className="flex flex-col gap-2">
            <button
              onClick={() => onSelect(img)}
              className="relative rounded-xl overflow-hidden border border-[#2A2A2A] hover:border-[#7C3AED] transition-colors group"
            >
              <img src={img.url} alt={img.prompt} className="w-full h-auto object-contain block" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-sm bg-black/60 px-3 py-1.5 rounded-full">✏️ 編集する</span>
              </div>
              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-xs text-white font-bold">
                {i + 1}
              </div>
            </button>
            <div className="px-1 space-y-0.5">
              <p className="text-xs text-[#AAAAAA] truncate">{img.prompt}</p>
              {img.params && (
                <p className="text-[10px] text-[#666]">
                  {img.params.steps}step · g{img.params.guidance.toFixed(1)}
                  {img.params.seed >= 0 ? ` · seed:${img.params.seed}` : ''}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

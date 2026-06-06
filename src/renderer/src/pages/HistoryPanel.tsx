import { useState } from 'react'
import type { GeneratedImage } from '../App'

interface Props {
  images: GeneratedImage[]
  onSelect: (img: GeneratedImage) => void
}

export default function HistoryPanel({ images, onSelect }: Props): JSX.Element {
  const [filter, setFilter] = useState<'all' | 'icon' | 'background'>('all')
  const [search, setSearch] = useState('')

  const filtered = images.filter(img => {
    if (filter !== 'all' && img.type !== filter) return false
    if (search && !img.prompt.includes(search)) return false
    return true
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
      {/* ツールバー */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex gap-1">
          {(['all', 'icon', 'background'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                filter === f
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#111111] text-[#AAAAAA] hover:text-white border border-[#2A2A2A]'
              }`}
            >
              {f === 'all' ? 'すべて' : f === 'icon' ? 'アイコン' : '背景'}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 キーワード検索"
          className="bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#7C3AED] transition-colors"
        />
        <span className="text-sm text-[#888] ml-auto">全 {filtered.length} 件</span>
      </div>

      {/* グリッド */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-3 opacity-30">🕐</div>
            <p className="text-[#777]">履歴がありません</p>
            <p className="text-sm text-[#666] mt-1">画像を生成すると、ここに表示されます</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-6 gap-3">
            {filtered.map(img => (
              <button
                key={img.id}
                onClick={() => onSelect(img)}
                className="group relative aspect-square rounded-lg overflow-hidden border border-[#2A2A2A] hover:border-[#7C3AED] transition-colors bg-[#111111]"
              >
                <img
                  src={img.url}
                  alt={img.prompt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                  <p className="text-xs text-white line-clamp-2 text-left">{img.prompt}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

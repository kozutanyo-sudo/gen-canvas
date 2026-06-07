import { useState } from 'react'
import type { GeneratedImage } from '../App'

interface Props {
  images: GeneratedImage[]
  onSelect: (img: GeneratedImage) => void
  onDelete: (id: string) => void
  onExportZip: (ids: string[]) => void
  onCompare: (images: GeneratedImage[]) => void
  onBlend: (images: GeneratedImage[]) => void
  onBatchEvolve: (images: GeneratedImage[]) => void
  onCollage: (images: GeneratedImage[]) => void
  onAnimatedGif: (images: GeneratedImage[]) => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function HistoryPanel({
  images, onSelect, onDelete, onExportZip,
  onCompare, onBlend, onBatchEvolve, onCollage, onAnimatedGif,
}: Props): JSX.Element {
  const [filter, setFilter] = useState<'all' | 'icon' | 'background'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const filtered = images.filter(img => {
    if (filter !== 'all' && img.type !== filter) return false
    if (search && !img.prompt.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggleSelect = (id: string): void => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedImages = filtered.filter(i => selected.has(i.id))
  const selCount = selectedImages.length

  const handleDelete = (e: React.MouseEvent, id: string): void => {
    e.stopPropagation()
    if (confirmId === id) {
      onDelete(id)
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
      setConfirmId(null)
    } else {
      setConfirmId(id)
      setTimeout(() => setConfirmId(c => c === id ? null : c), 2500)
    }
  }

  const dispatchAction = (fn: (imgs: GeneratedImage[]) => void): void => {
    fn(selectedImages)
    setSelected(new Set())
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ツールバー */}
      <div className="flex items-center gap-3 px-6 pt-5 pb-4 shrink-0 flex-wrap">
        <div className="flex gap-1">
          {(['all', 'icon', 'background'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                filter === f ? 'bg-[#7C3AED] text-white' : 'bg-[#111111] text-[#AAAAAA] hover:text-white border border-[#2A2A2A]'
              }`}>
              {f === 'all' ? 'すべて' : f === 'icon' ? 'アイコン' : '背景'}
            </button>
          ))}
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 キーワード検索"
          className="bg-[#111111] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#7C3AED] transition-colors" />
        <span className="text-sm text-[#888]">{filtered.length} 件</span>
        <div className="ml-auto flex gap-2">
          {selCount > 0 && (
            <button onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-md text-sm text-[#777] hover:text-white border border-[#2A2A2A] transition-colors">
              選択解除
            </button>
          )}
          <button onClick={() => onExportZip(filtered.map(i => i.id))}
            disabled={filtered.length === 0}
            className="px-3 py-1.5 rounded-md text-sm bg-[#111111] border border-[#2A2A2A] text-[#AAAAAA] hover:text-white hover:border-[#555] disabled:opacity-40 transition-colors"
            title="表示中の画像をZIPで一括保存">
            📦 ZIP保存
          </button>
        </div>
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
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="grid grid-cols-6 gap-3">
            {filtered.map(img => {
              const isSel = selected.has(img.id)
              return (
                <div key={img.id}
                  className={`group relative aspect-square rounded-lg overflow-hidden transition-all bg-[#111111] ${
                    isSel ? 'border-2 border-[#7C3AED] shadow-lg shadow-[#7C3AED]/20' : 'border border-[#2A2A2A] hover:border-[#555]'
                  }`}>
                  {/* チェックボックス（常時表示、選択時は常に見える） */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleSelect(img.id) }}
                    className={`absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded border-2 flex items-center justify-center text-[10px] font-bold transition-all ${
                      isSel
                        ? 'bg-[#7C3AED] border-[#7C3AED] text-white opacity-100'
                        : 'bg-black/50 border-[#555] text-white opacity-0 group-hover:opacity-100'
                    }`}
                    title={isSel ? '選択解除' : '選択'}
                  >
                    {isSel ? '✓' : ''}
                  </button>

                  {/* 画像本体 → クリックでプレビュー */}
                  <img src={img.url} alt={img.prompt}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => onSelect(img)} />

                  {/* ホバーオーバーレイ（削除・情報） */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col p-1.5 gap-0.5 pt-8">
                    <button onClick={e => handleDelete(e, img.id)}
                      className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full text-[10px] flex items-center justify-center transition-colors ${
                        confirmId === img.id ? 'bg-red-600 text-white animate-pulse' : 'bg-black/60 text-[#AAA] hover:bg-red-600 hover:text-white'
                      }`}
                      title={confirmId === img.id ? 'もう一度押すと削除' : '削除'}>
                      {confirmId === img.id ? '!' : '✕'}
                    </button>
                    <p className="text-[10px] text-white line-clamp-3 flex-1 leading-tight">{img.prompt}</p>
                    <p className="text-[9px] text-[#AAA]">{formatDate(img.createdAt)}</p>
                    {img.params && (
                      <p className="text-[9px] text-[#666]">
                        {img.params.steps}step · g{img.params.guidance.toFixed(1)}
                        {img.params.seed >= 0 ? ` · ${img.params.seed}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== マルチセレクト アクションバー ===== */}
      {selCount > 0 && (
        <div className="shrink-0 border-t border-[#7C3AED]/40 bg-[#0D0D0D] px-6 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-white">{selCount}枚選択中</span>

          <div className="flex gap-2 flex-wrap ml-2">
            <ActionBtn
              label="🔭 比較" disabled={selCount < 2 || selCount > 4}
              hint={selCount < 2 ? '2〜4枚選択' : selCount > 4 ? '4枚以内で選択' : `${selCount}枚を比較`}
              onClick={() => dispatchAction(onCompare)} />
            <ActionBtn
              label="🎭 ブレンド" disabled={selCount !== 2}
              hint={selCount !== 2 ? 'ちょうど2枚選択' : '2枚をブレンド合成'}
              onClick={() => dispatchAction(onBlend)} />
            <ActionBtn
              label="🔄 一括進化" disabled={selCount === 0}
              hint={`${selCount}枚を同じ指示で進化`}
              onClick={() => dispatchAction(onBatchEvolve)} />
            <ActionBtn
              label="🖼 コラージュ" disabled={selCount < 2}
              hint={selCount < 2 ? '2枚以上選択' : `${selCount}枚でコラージュ`}
              onClick={() => dispatchAction(onCollage)} />
            <ActionBtn
              label="🎬 GIF" disabled={selCount < 2}
              hint={selCount < 2 ? '2枚以上選択' : `${selCount}枚でアニメGIF`}
              onClick={() => dispatchAction(onAnimatedGif)} />
          </div>

          <button onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-[#555] hover:text-[#AAA] transition-colors">
            ✕ 選択解除
          </button>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ label, disabled, hint, onClick }: {
  label: string; disabled: boolean; hint: string; onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
        disabled
          ? 'border-[#2A2A2A] text-[#444] cursor-not-allowed'
          : 'border-[#7C3AED]/60 text-[#AAAAAA] hover:bg-[#7C3AED] hover:text-white hover:border-[#7C3AED]'
      }`}>
      {label}
    </button>
  )
}

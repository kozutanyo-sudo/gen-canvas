import type { ShapeState } from './previewHelpers'
import { SHAPES, COLOR_SWATCHES, GRID_POSITIONS, GRID_ARROWS } from './previewHelpers'

interface Props {
  shape: ShapeState
  onChange: (s: ShapeState) => void
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }): JSX.Element {
  return (
    <button onClick={onClick}
      className={`w-11 h-6 rounded-full transition-colors relative ${on ? 'bg-[#7C3AED]' : 'bg-[#2A2A2A]'}`}>
      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${on ? 'right-1' : 'left-1'}`} />
    </button>
  )
}

export default function ShapeTab({ shape, onChange }: Props): JSX.Element {
  const set = (patch: Partial<ShapeState>): void => onChange({ ...shape, ...patch })

  return (
    <>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#AAAAAA]">シェイプを表示</label>
        <Toggle on={shape.enabled} onClick={() => set({ enabled: !shape.enabled })} />
      </div>

      <div>
        <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">種類</label>
        <div className="grid grid-cols-5 gap-1">
          {SHAPES.map(s => (
            <button key={s.id} onClick={() => set({ type: s.id })} title={s.label}
              className={`flex flex-col items-center py-2 rounded border text-sm transition-colors ${shape.type === s.id ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#2A2A2A] text-[#AAAAAA] bg-[#111] hover:border-[#555]'}`}>
              <span>{s.emoji}</span>
              <span className="text-[10px] mt-0.5">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {shape.type === 'circle' && (
        <div className="flex items-center justify-between">
          <label className="text-xs text-[#AAAAAA]">3D球体効果</label>
          <Toggle on={shape.sphere3d} onClick={() => set({ sphere3d: !shape.sphere3d })} />
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">カラー</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {COLOR_SWATCHES.map(c => (
            <button key={c} onClick={() => set({ color: c })} style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${shape.color === c ? 'border-white scale-110' : 'border-transparent'}`} />
          ))}
          <input type="color" value={shape.color} onChange={e => set({ color: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
        </div>
      </div>

      {([
        ['サイズ', 'size', 5, 80, '%'],
        ['不透明度', 'opacity', 10, 100, '%'],
      ] as [string, 'size'|'opacity', number, number, string][]).map(([lbl, key, min, max, unit]) => (
        <div key={key}>
          <div className="flex justify-between mb-1">
            <label className="text-xs text-[#AAAAAA]">{lbl}</label>
            <span className="text-xs text-[#888]">{shape[key]}{unit}</span>
          </div>
          <input type="range" min={min} max={max} value={shape[key]}
            onChange={e => set({ [key]: +e.target.value })} className="w-full accent-[#7C3AED]" />
        </div>
      ))}

      <div>
        <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">位置</label>
        <div className="space-y-1.5">
          {([['横','x'],['縦','y']] as [string,'x'|'y'][]).map(([lbl, key]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-[#888] w-8">{lbl}</span>
              <input type="range" min="5" max="95" value={shape[key]}
                onChange={e => set({ [key]: +e.target.value })} className="flex-1 accent-[#7C3AED]" />
              <span className="text-xs text-[#888] w-8 text-right">{shape[key]}%</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 mt-2">
          {GRID_POSITIONS.map(([x, y], i) => (
            <button key={i} onClick={() => set({ x, y })}
              className={`h-6 rounded text-xs border transition-colors ${shape.x === x && shape.y === y ? 'border-[#7C3AED] bg-[#7C3AED]/20' : 'border-[#2A2A2A] bg-[#111] hover:border-[#555]'}`}>
              {GRID_ARROWS[i]}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

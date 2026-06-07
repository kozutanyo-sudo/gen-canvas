import type { TextState } from './previewHelpers'
import { FONTS, COLOR_SWATCHES, GRID_POSITIONS, GRID_ARROWS } from './previewHelpers'

interface Props {
  text: TextState
  onChange: (t: TextState) => void
}

export default function TextTab({ text, onChange }: Props): JSX.Element {
  const set = (patch: Partial<TextState>): void => onChange({ ...text, ...patch })

  return (
    <>
      <div>
        <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">テキスト</label>
        <input type="text" value={text.text} onChange={e => set({ text: e.target.value })}
          placeholder="例: GenCanvas"
          className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#7C3AED]" />
      </div>

      <div>
        <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">フォント</label>
        <div className="grid grid-cols-2 gap-1">
          {FONTS.map(f => (
            <button key={f.id} onClick={() => set({ font: f.id })}
              className={`py-1.5 text-xs rounded border transition-colors ${text.font === f.id ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#2A2A2A] text-[#AAAAAA] bg-[#111] hover:border-[#555]'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => set({ bold: !text.bold })}
          className={`flex-1 py-1.5 text-sm font-bold rounded border transition-colors ${text.bold ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#2A2A2A] text-[#777] bg-[#111]'}`}>B</button>
        <button onClick={() => set({ italic: !text.italic })}
          className={`flex-1 py-1.5 text-sm italic rounded border transition-colors ${text.italic ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#2A2A2A] text-[#777] bg-[#111]'}`}>I</button>
        <button onClick={() => set({ shadow: !text.shadow })}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors ${text.shadow ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#2A2A2A] text-[#777] bg-[#111]'}`}>影</button>
        <button onClick={() => set({ stroke: !text.stroke })}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors ${text.stroke ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white' : 'border-[#2A2A2A] text-[#777] bg-[#111]'}`}>縁取り</button>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <label className="text-xs text-[#AAAAAA]">サイズ</label>
          <span className="text-xs text-[#888]">{text.size}px</span>
        </div>
        <input type="range" min="12" max="120" value={text.size}
          onChange={e => set({ size: +e.target.value })} className="w-full accent-[#7C3AED]" />
      </div>

      <div>
        <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">文字色</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {COLOR_SWATCHES.map(c => (
            <button key={c} onClick={() => set({ color: c })} style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${text.color === c ? 'border-white scale-110' : 'border-transparent'}`} />
          ))}
          <input type="color" value={text.color} onChange={e => set({ color: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
        </div>
        {text.stroke && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#AAAAAA]">縁取り色</span>
            <input type="color" value={text.strokeColor} onChange={e => set({ strokeColor: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <label className="text-xs text-[#AAAAAA]">文字背景</label>
          <span className="text-xs text-[#888]">{text.bgOpacity}%</span>
        </div>
        <div className="flex gap-2 items-center">
          <input type="color" value={text.bgColor} onChange={e => set({ bgColor: e.target.value })}
            className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
          <input type="range" min="0" max="100" value={text.bgOpacity}
            onChange={e => set({ bgOpacity: +e.target.value })} className="flex-1 accent-[#7C3AED]" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-[#AAAAAA] block mb-1.5">位置</label>
        <div className="space-y-1.5">
          {([['横','x'],['縦','y']] as [string,'x'|'y'][]).map(([lbl, key]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-[#888] w-8">{lbl}</span>
              <input type="range" min="5" max="95" value={text[key]}
                onChange={e => set({ [key]: +e.target.value })} className="flex-1 accent-[#7C3AED]" />
              <span className="text-xs text-[#888] w-8 text-right">{text[key]}%</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 mt-2">
          {GRID_POSITIONS.map(([x, y], i) => (
            <button key={i} onClick={() => set({ x, y })}
              className={`h-6 rounded text-xs border transition-colors ${text.x === x && text.y === y ? 'border-[#7C3AED] bg-[#7C3AED]/20' : 'border-[#2A2A2A] bg-[#111] hover:border-[#555]'}`}>
              {GRID_ARROWS[i]}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

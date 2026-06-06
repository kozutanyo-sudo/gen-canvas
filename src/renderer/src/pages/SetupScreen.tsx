import { useState } from 'react'

interface Props {
  onComplete: (token: string) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (): any => (window as any).api

export default function SetupScreen({ onComplete }: Props): JSX.Element {
  const [token, setToken] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)

  const handleSave = async (): Promise<void> => {
    const trimmed = token.trim()
    if (!trimmed.startsWith('hf_')) {
      setError('トークンは "hf_" で始まる必要があります。')
      return
    }
    setIsSaving(true)
    setError('')
    try {
      await api().setSettings({ hfToken: trimmed })
      onComplete(trimmed)
    } catch {
      setError('設定の保存に失敗しました。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0A0A0A] text-white px-8">
      <div className="w-full max-w-lg">

        {/* ロゴ */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">🎨</div>
          <h1 className="text-2xl font-bold">GenCanvas へようこそ</h1>
          <p className="text-[#777] mt-2 text-sm">AIでアイコン・背景画像を自動生成するアプリです</p>
        </div>

        {/* ステップ表示 */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= s ? 'bg-[#7C3AED] text-white' : 'bg-[#2A2A2A] text-[#555]'
              }`}>{s}</div>
              {s < 3 && <div className={`h-px w-12 ${step > s ? 'bg-[#7C3AED]' : 'bg-[#2A2A2A]'}`} />}
            </div>
          ))}
        </div>

        {/* ステップコンテンツ */}
        {step === 1 && (
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold">ステップ 1：HuggingFace アカウントを作成</h2>
            <p className="text-sm text-[#999]">
              画像生成には無料の HuggingFace アカウントが必要です。
              <br />クレジットカード不要・完全無料です。
            </p>
            <div className="bg-[#1A1A2A] border border-[#3A3AED]/30 rounded-xl p-4 text-sm space-y-2">
              <p className="text-[#AAAAFF]">① ブラウザで以下を開く：</p>
              <code className="block bg-[#0A0A1A] px-3 py-2 rounded-lg text-[#7C8AED] text-xs select-all">
                https://huggingface.co/join
              </code>
              <p className="text-[#888] text-xs">メールアドレスとパスワードだけで登録できます</p>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-medium text-sm transition-colors"
            >
              アカウントを作成したら次へ →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold">ステップ 2：アクセストークンを取得</h2>
            <div className="space-y-3 text-sm text-[#999]">
              <div className="bg-[#1A1A2A] border border-[#3A3AED]/30 rounded-xl p-4 space-y-2">
                <p className="text-[#AAAAFF]">② 以下のURLでトークンを作成：</p>
                <code className="block bg-[#0A0A1A] px-3 py-2 rounded-lg text-[#7C8AED] text-xs select-all">
                  https://huggingface.co/settings/tokens
                </code>
              </div>
              <div className="space-y-1.5 text-xs">
                <p className="text-[#bbb]">③ 「Create new token」をクリック</p>
                <p className="text-[#bbb]">④ 名前は何でもOK（例：gencanvas）</p>
                <p className="text-[#bbb]">⑤ Type は「Read」を選択</p>
                <p className="text-[#bbb]">⑥ 「Generate a token」をクリック</p>
                <p className="text-[#bbb]">⑦ 表示された <span className="text-[#7C8AED] font-mono">hf_xxxxx...</span> をコピー</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-xl border border-[#2A2A2A] text-[#777] hover:text-white text-sm transition-colors"
              >
                ← 戻る
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-medium text-sm transition-colors"
              >
                トークンをコピーしたら →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold">ステップ 3：トークンを貼り付け</h2>
            <p className="text-sm text-[#999]">コピーした hf_ で始まるトークンを貼り付けてください</p>
            <input
              type="password"
              value={token}
              onChange={e => { setToken(e.target.value); setError('') }}
              placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-[#0A0A0A] border border-[#3A3A3A] rounded-xl px-4 py-3 text-sm font-mono placeholder-[#444] focus:outline-none focus:border-[#7C3AED] transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl border border-[#2A2A2A] text-[#777] hover:text-white text-sm transition-colors"
              >
                ← 戻る
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !token.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 font-medium text-sm transition-colors"
              >
                {isSaving ? '保存中...' : '✅ 設定を保存して開始'}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-[#666] text-xs mt-6">
          トークンはこの PC にのみ保存されます。外部に送信されることはありません。
        </p>
      </div>
    </div>
  )
}

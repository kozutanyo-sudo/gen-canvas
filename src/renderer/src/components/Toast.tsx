export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

export function Toaster({ toasts }: { toasts: ToastItem[] }): JSX.Element {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg text-sm font-medium shadow-xl flex items-center gap-2.5 max-w-sm ${
            t.type === 'success' ? 'bg-green-700 text-white' :
            t.type === 'error'   ? 'bg-red-800 text-white' :
                                   'bg-[#2A2A2A] border border-[#3A3A3A] text-[#FAFAFA]'
          }`}
        >
          <span className="shrink-0">{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span className="leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

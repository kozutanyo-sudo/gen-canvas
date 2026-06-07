import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[GenCanvas] Uncaught error:', error.message, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[#0A0A0A]">
          <div className="text-center max-w-sm p-8">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-white font-semibold mb-2">予期しないエラーが発生しました</h2>
            <p className="text-[#666] text-xs font-mono mb-6 bg-[#111] p-3 rounded-lg border border-[#2A2A2A] text-left break-all">
              {this.state.error?.message ?? 'Unknown error'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-sm font-semibold transition-colors">
              ↩ 再試行
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

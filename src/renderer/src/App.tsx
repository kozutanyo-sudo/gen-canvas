import { useState, useEffect } from 'react'
import GeneratePanel from './pages/GeneratePanel'
import PreviewPanel from './pages/PreviewPanel'
import HistoryPanel from './pages/HistoryPanel'
import SetupScreen from './pages/SetupScreen'
import ComparePanel from './pages/ComparePanel'
import BlendPanel from './pages/BlendPanel'
import BatchEvolvePanel from './pages/BatchEvolvePanel'
import CollagePanel from './pages/CollagePanel'
import AnimatedGifPanel from './pages/AnimatedGifPanel'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster, ToastItem, ToastType } from './components/Toast'

export type TabType = 'icon' | 'background'
export type ViewType = 'generate' | 'preview' | 'history' | 'compare' | 'blend' | 'batch-evolve' | 'collage' | 'animated-gif'

export interface GeneratedImage {
  id: string
  url: string
  prompt: string
  englishPrompt: string
  style: string
  type: TabType
  createdAt: number
  params?: { steps: number; guidance: number; seed: number }
}

function loadToken(): string {
  return (window as any).api?.getInitialToken?.() || ''
}

function saveToken(token: string): void {
  try { (window as any).api?.saveToken?.(token) } catch { /* ignore */ }
}

const WORKSPACE_VIEWS: ViewType[] = ['compare', 'blend', 'batch-evolve', 'collage', 'animated-gif']

function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('icon')
  const [view, setView] = useState<ViewType>('generate')
  const [allHistory, setAllHistory] = useState<GeneratedImage[]>([])
  const [currentBatch, setCurrentBatch] = useState<GeneratedImage[]>([])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [actionImages, setActionImages] = useState<GeneratedImage[]>([])
  const [hfToken, setHfToken] = useState<string>(() => loadToken())
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    ;(window as any).api?.loadHistory?.()
      .then((items: GeneratedImage[]) => { if (items.length > 0) setAllHistory(items) })
      .catch(console.error)
  }, [])

  const showToast = (message: string, type: ToastType = 'info'): void => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const handleSetupComplete = (token: string): void => {
    saveToken(token)
    setHfToken(token)
  }

  // 生成完了 → プレビューへ
  const handleGenerated = (images: GeneratedImage[]): void => {
    images.forEach(img => (window as any).api?.saveHistoryItem?.(img).catch(console.error))
    setAllHistory(prev => [...images, ...prev])
    setCurrentBatch(images)
    setSelectedImage(images[0])
    setView('preview')
  }

  // 進化/再生成 → プレビュー維持
  const handleEvolve = (img: GeneratedImage): void => {
    ;(window as any).api?.saveHistoryItem?.(img).catch(console.error)
    setAllHistory(prev => [img, ...prev])
    setCurrentBatch([img])
    setSelectedImage(img)
  }

  // 履歴削除
  const handleDeleteHistory = (id: string): void => {
    ;(window as any).api?.deleteHistoryItem?.(id).catch(console.error)
    setAllHistory(prev => prev.filter(img => img.id !== id))
  }

  // ZIP出力
  const handleExportZip = async (ids: string[]): Promise<void> => {
    try {
      const ok = await (window as any).api?.exportHistoryZip?.(ids)
      if (ok) showToast('ZIPを保存しました', 'success')
      else showToast('保存をキャンセルしました', 'info')
    } catch {
      showToast('ZIP出力に失敗しました', 'error')
    }
  }

  // ワークスペース操作ハンドラ
  const openWorkspace = (target: ViewType) => (imgs: GeneratedImage[]) => {
    setActionImages(imgs)
    setView(target)
  }

  // 履歴に追加（ナビなし）
  const handleAddToHistory = (images: GeneratedImage[]): void => {
    images.forEach(img => (window as any).api?.saveHistoryItem?.(img).catch(console.error))
    setAllHistory(prev => [...images, ...prev])
  }

  // ブレンド保存 → プレビューへ
  const handleBlendSave = (img: GeneratedImage): void => {
    ;(window as any).api?.saveHistoryItem?.(img).catch(console.error)
    setAllHistory(prev => [img, ...prev])
    setCurrentBatch([img])
    setSelectedImage(img)
    setView('preview')
    showToast('合成画像を保存しました', 'success')
  }

  // 比較 → 選択でプレビューへ
  const handleSelectFromCompare = (img: GeneratedImage): void => {
    setCurrentBatch([img])
    setSelectedImage(img)
    setView('preview')
  }

  // 履歴から選択してプレビュー
  const handleSelectFromHistory = (img: GeneratedImage): void => {
    setCurrentBatch([img])
    setSelectedImage(img)
    setView('preview')
  }

  const backToHistory = (): void => setView('history')

  if (!hfToken) {
    return <SetupScreen onComplete={handleSetupComplete} />
  }

  // ワークスペース系ビューはヘッダーを隠して全画面
  const isWorkspaceView = WORKSPACE_VIEWS.includes(view)

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-[#FAFAFA]">
      {/* ヘッダー（ワークスペース時は非表示） */}
      {!isWorkspaceView && (
        <header className="flex items-center justify-between px-6 py-3 border-b border-[#2A2A2A] shrink-0">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold tracking-tight text-white">GenCanvas</span>
            <nav className="flex gap-1">
              <button
                onClick={() => { setActiveTab('icon'); setView('generate') }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'icon' && view === 'generate'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                🎨 アイコン
              </button>
              <button
                onClick={() => { setActiveTab('background'); setView('generate') }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'background' && view === 'generate'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                🖼 背景
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('history')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                view === 'history'
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              🕐 履歴
            </button>
            <button
              onClick={() => { saveToken(''); setHfToken('') }}
              className="px-3 py-1.5 rounded-md text-sm text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] transition-colors"
              title="APIトークンを再設定"
            >
              ⚙️
            </button>
          </div>
        </header>
      )}

      {/* メインコンテンツ */}
      <ErrorBoundary>
      <div className="flex flex-1 overflow-hidden">
        {view === 'generate' && (
          <GeneratePanel activeTab={activeTab} onGenerated={handleGenerated} showToast={showToast} />
        )}
        {view === 'preview' && selectedImage && (
          <PreviewPanel
            batch={currentBatch}
            selectedImage={selectedImage}
            onSelectImage={setSelectedImage}
            onBack={() => setView('generate')}
            onEvolve={handleEvolve}
            showToast={showToast}
          />
        )}
        {view === 'history' && (
          <HistoryPanel
            images={allHistory}
            onSelect={handleSelectFromHistory}
            onDelete={handleDeleteHistory}
            onExportZip={handleExportZip}
            onCompare={openWorkspace('compare')}
            onBlend={openWorkspace('blend')}
            onBatchEvolve={openWorkspace('batch-evolve')}
            onCollage={openWorkspace('collage')}
          onAnimatedGif={openWorkspace('animated-gif')}
          />
        )}
        {view === 'compare' && (
          <ComparePanel
            images={actionImages}
            onBack={backToHistory}
            onSelect={handleSelectFromCompare}
          />
        )}
        {view === 'blend' && actionImages.length >= 2 && (
          <BlendPanel
            images={[actionImages[0], actionImages[1]]}
            onBack={backToHistory}
            onSave={handleBlendSave}
            showToast={showToast}
          />
        )}
        {view === 'batch-evolve' && (
          <BatchEvolvePanel
            images={actionImages}
            onBack={backToHistory}
            onAddToHistory={handleAddToHistory}
            showToast={showToast}
          />
        )}
        {view === 'collage' && (
          <CollagePanel
            images={actionImages}
            onBack={backToHistory}
            showToast={showToast}
          />
        )}
        {view === 'animated-gif' && (
          <AnimatedGifPanel
            images={actionImages}
            onBack={backToHistory}
            showToast={showToast}
          />
        )}
      </div>
      </ErrorBoundary>

      <Toaster toasts={toasts} />
    </div>
  )
}

export default App

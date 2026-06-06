import { useState } from 'react'
import GeneratePanel from './pages/GeneratePanel'
import PreviewPanel from './pages/PreviewPanel'
import HistoryPanel from './pages/HistoryPanel'
import SetupScreen from './pages/SetupScreen'

export type TabType = 'icon' | 'background'
export type ViewType = 'generate' | 'preview' | 'history'

export interface GeneratedImage {
  id: string
  url: string
  prompt: string
  style: string
  type: TabType
  createdAt: number
}

function loadToken(): string {
  // プリロードが同期でファイルから読んだ値を使う（ポート番号に依存しない）
  return (window as any).api?.getInitialToken?.() || ''
}

function saveToken(token: string): void {
  // プリロード経由でファイルに直接書き込む
  try { (window as any).api?.saveToken?.(token) } catch { /* ignore */ }
}

function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('icon')
  const [view, setView] = useState<ViewType>('generate')
  const [allHistory, setAllHistory] = useState<GeneratedImage[]>([])
  const [currentBatch, setCurrentBatch] = useState<GeneratedImage[]>([])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [isDark, setIsDark] = useState(true)
  // localStorageから即座に読み込む（非同期不要・確実に永続化）
  const [hfToken, setHfToken] = useState<string>(() => loadToken())

  const handleSetupComplete = (token: string): void => {
    saveToken(token)
    setHfToken(token)
  }

  const handleGenerated = (images: GeneratedImage[]): void => {
    setAllHistory(prev => [...images, ...prev])
    setCurrentBatch(images)
    setSelectedImage(images[0])
    setView('preview')
  }

  const handleEvolve = (img: GeneratedImage): void => {
    setAllHistory(prev => [img, ...prev])
    setCurrentBatch([img])
    setSelectedImage(img)
  }

  if (!hfToken) {
    return <SetupScreen onComplete={handleSetupComplete} />
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="flex flex-col h-screen bg-[#0A0A0A] text-[#FAFAFA]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-[#2A2A2A] shrink-0">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold tracking-tight text-white">GenCanvas</span>
            <nav className="flex gap-1">
              <button
                onClick={() => { setActiveTab('icon'); setView('generate') }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'icon' && view !== 'history'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                🎨 アイコン
              </button>
              <button
                onClick={() => { setActiveTab('background'); setView('generate') }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'background' && view !== 'history'
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
              onClick={() => setIsDark(!isDark)}
              className="px-3 py-1.5 rounded-md text-sm text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] transition-colors"
            >
              {isDark ? '☀️' : '🌙'}
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

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {view === 'history' ? (
            <HistoryPanel
              images={allHistory}
              onSelect={(img) => {
                setCurrentBatch([img])
                setSelectedImage(img)
                setView('preview')
              }}
            />
          ) : view === 'preview' && selectedImage ? (
            <PreviewPanel
              batch={currentBatch}
              selectedImage={selectedImage}
              onSelectImage={setSelectedImage}
              onBack={() => setView('generate')}
              onEvolve={handleEvolve}
            />
          ) : (
            <GeneratePanel
              activeTab={activeTab}
              onGenerated={handleGenerated}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default App

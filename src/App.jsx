import { useState } from 'react'
import Dashboard from './components/Dashboard'
import ManageWords from './components/ManageWords'
import LearningSession from './components/LearningSession'
import ReviewSession from './components/ReviewSession'

export default function App() {
  const [view, setView] = useState('dashboard')

  const navItems = [
    { id: 'dashboard', label: 'Übersicht' },
    { id: 'words', label: 'Wörter verwalten' },
    { id: 'learning', label: 'Lernen' },
    { id: 'review', label: 'Wiederholen' },
  ]

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard setView={setView} />
      case 'words':
        return <ManageWords />
      case 'learning':
        return <LearningSession setView={setView} />
      case 'review':
        return <ReviewSession setView={setView} />
      default:
        return <Dashboard setView={setView} />
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header Navigation */}
      <nav className="sticky top-0 z-50 border-b" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Vokabular</h1>
            {/* Desktop navigation */}
            <div className="hidden items-center gap-8 sm:flex">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`pb-3 text-sm font-medium transition-colors ${
                    view === item.id
                      ? 'border-b-2'
                      : ''
                  }`}
                  style={{
                    borderBottomColor: view === item.id ? 'var(--blue)' : 'transparent',
                    color: view === item.id ? 'var(--ink)' : 'var(--ink-soft)',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {/* Mobile navigation */}
          <div className="flex gap-2 sm:hidden pb-3 overflow-x-auto">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className="px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: view === item.id ? 'var(--blue)' : 'var(--line-soft)',
                  color: view === item.id ? '#ffffff' : 'var(--ink-soft)',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {renderView()}
      </main>
    </div>
  )
}

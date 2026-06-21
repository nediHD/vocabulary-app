import { useState } from 'react'
import Dashboard from './components/Dashboard'
import ManageWords from './components/ManageWords'
import LearningSession from './components/LearningSession'
import ReviewSession from './components/ReviewSession'
import SentenceLearning from './components/SentenceLearning'

export default function App() {
  const [view, setView] = useState('dashboard')
  const [inSession, setInSession] = useState(false)

  const navItems = [
    { id: 'dashboard', label: 'Übersicht' },
    { id: 'words', label: 'Wörter verwalten' },
    { id: 'learning', label: 'Lernen' },
    { id: 'review', label: 'Wiederholen' },
    { id: 'sentences', label: 'Sätze üben' },
  ]

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard setView={setView} setInSession={setInSession} />
      case 'words':
        return <ManageWords />
      case 'learning':
        return <LearningSession setView={setView} setInSession={setInSession} />
      case 'review':
        return <ReviewSession setView={setView} setInSession={setInSession} />
      case 'sentences':
        return <SentenceLearning setView={setView} setInSession={setInSession} />
      default:
        return <Dashboard setView={setView} setInSession={setInSession} />
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
                  disabled={inSession}
                  className={`pb-3 text-sm font-medium transition-colors ${
                    view === item.id
                      ? 'border-b-2'
                      : ''
                  }`}
                  style={{
                    borderBottomColor: view === item.id ? 'var(--blue)' : 'transparent',
                    color: inSession ? 'var(--ink-faint)' : (view === item.id ? 'var(--ink)' : 'var(--ink-soft)'),
                    cursor: inSession ? 'not-allowed' : 'pointer',
                    opacity: inSession ? 0.5 : 1,
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
                disabled={inSession}
                className="px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: inSession ? 'var(--line-soft)' : (view === item.id ? 'var(--blue)' : 'var(--line-soft)'),
                  color: inSession ? 'var(--ink-faint)' : (view === item.id ? '#ffffff' : 'var(--ink-soft)'),
                  cursor: inSession ? 'not-allowed' : 'pointer',
                  opacity: inSession ? 0.5 : 1,
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

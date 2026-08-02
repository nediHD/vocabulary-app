import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ManageWords from './components/ManageWords'
import LearningSession from './components/LearningSession'
import ReviewSession from './components/ReviewSession'
import SentenceLearning from './components/SentenceLearning'
import AudioExercise from './components/AudioExercise'
import Services from './components/Services'
import PasswordGate from './components/PasswordGate'

export default function App() {
  const [view, setView] = useState('dashboard')
  const [inSession, setInSession] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('appAuth') === 'true') {
      setAuthenticated(true)
    }
  }, [])

  const navItems = [
    { id: 'dashboard', label: 'Übersicht' },
    { id: 'words', label: 'Wörter verwalten' },
    { id: 'learning', label: 'Lernen' },
    { id: 'review', label: 'Wiederholen' },
    { id: 'sentences', label: 'Sätze üben' },
    { id: 'audio', label: 'Hörübung' },
    { id: 'services', label: 'Dienste' },
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
      case 'audio':
        return <AudioExercise setView={setView} setInSession={setInSession} />
      case 'services':
        return <Services setView={setView} />
      default:
        return <Dashboard setView={setView} setInSession={setInSession} />
    }
  }

  if (!authenticated) {
    return <PasswordGate setAuthenticated={setAuthenticated} />
  }

  const activeLabel = navItems.find(i => i.id === view)?.label ?? ''

  const goTo = (id) => {
    setView(id)
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header Navigation */}
      <nav className="sticky top-0 z-50 border-b" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Desktop navigation */}
            <div className="hidden items-center gap-7 sm:flex">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  disabled={inSession}
                  className={`pb-3 text-sm font-medium transition-colors ${
                    view === item.id ? 'border-b-2' : ''
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

            {/* Mobile: current page label + menu button */}
            <div className="flex w-full items-center justify-between sm:hidden">
              <span className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{activeLabel}</span>
              <button
                onClick={() => setMenuOpen(o => !o)}
                disabled={inSession}
                aria-label="Menü"
                aria-expanded={menuOpen}
                className="flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{
                  borderColor: 'var(--line)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--ink)',
                  opacity: inSession ? 0.5 : 1,
                  cursor: inSession ? 'not-allowed' : 'pointer',
                }}
              >
                <span className="text-xl leading-none">{menuOpen ? '✕' : '☰'}</span>
              </button>
            </div>
          </div>

          {/* Mobile dropdown menu */}
          {menuOpen && !inSession && (
            <div className="sm:hidden pb-3">
              <div className="rounded-2xl border p-2" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--surface)' }}>
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => goTo(item.id)}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: view === item.id ? 'var(--blue-tint)' : 'transparent',
                      color: view === item.id ? 'var(--blue-dark)' : 'var(--ink-soft)',
                    }}
                  >
                    {item.label}
                    {view === item.id && <span style={{ color: 'var(--blue)' }}>●</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {renderView()}
      </main>
    </div>
  )
}

import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ManageWords from './components/ManageWords'
import LearningSession from './components/LearningSession'
import ReviewSession from './components/ReviewSession'
import SentenceLearning from './components/SentenceLearning'
import AudioExercise from './components/AudioExercise'
import Grammar from './components/Grammar'
import GrammarPractice from './components/GrammarPractice'
import Services from './components/Services'
import PasswordGate from './components/PasswordGate'

export default function App() {
  const [view, setView] = useState('dashboard')
  const [inSession, setInSession] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('appAuth') === 'true') {
      setAuthenticated(true)
    }
  }, [])

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard setView={setView} setInSession={setInSession} />
      case 'words':
        return <ManageWords setView={setView} />
      case 'learning':
        return <LearningSession setView={setView} setInSession={setInSession} />
      case 'review':
        return <ReviewSession setView={setView} setInSession={setInSession} />
      case 'sentences':
        return <SentenceLearning setView={setView} setInSession={setInSession} />
      case 'audio':
        return <AudioExercise setView={setView} setInSession={setInSession} />
      case 'grammar':
        return <Grammar setView={setView} />
      case 'grammar-practice':
        return <GrammarPractice setView={setView} />
      case 'services':
        return <Services setView={setView} />
      default:
        return <Dashboard setView={setView} setInSession={setInSession} />
    }
  }

  if (!authenticated) {
    return <PasswordGate setAuthenticated={setAuthenticated} />
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {renderView()}
      </main>
    </div>
  )
}

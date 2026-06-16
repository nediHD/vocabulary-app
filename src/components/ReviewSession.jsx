import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { reinsert } from '../utils/queue'
import QuizCard from './QuizCard'

function getRandomDirection() {
  return Math.random() < 0.5 ? 'de→fr' : 'fr→de'
}

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function ReviewSession({ setView, setInSession }) {
  const [queue, setQueue] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [sessionNotStarted, setSessionNotStarted] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [phase, setPhase] = useState('input')
  const [direction, setDirection] = useState('de→fr')

  useEffect(() => {
    setInSession(true)
    loadCards()
    return () => setInSession(false)
  }, [])

  const loadCards = async () => {
    try {
      setLoading(true)
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('status', 'review')

      if (error) {
        console.error('Error loading cards:', error)
        return
      }

      // Filter only cards due today (next_review_at <= now)
      const dueCards =
        data?.filter(card => new Date(card.next_review_at) <= new Date(now)) ||
        []

      if (dueCards.length === 0) {
        setSessionNotStarted(true)
        return
      }

      const shuffled = shuffle(dueCards)
      const limited = shuffled.slice(0, 15)
      setQueue(limited)
      setDirection(getRandomDirection())
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center" style={{ color: 'var(--ink-soft)' }}>Lädt...</div>
  }

  if (sessionNotStarted) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <p className="mb-4 text-lg" style={{ color: 'var(--ink-soft)' }}>Keine Wörter fällig.</p>
        <p className="mb-8 text-sm" style={{ color: 'var(--ink-faint)' }}>
          Komm später zurück, wenn deine Wiederholungen fällig sind.
        </p>
        <button
          onClick={() => setView('dashboard')}
          className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--blue)' }}
          onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
          onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
        >
          Zur Übersicht
        </button>
      </div>
    )
  }

  if (queue.length === 0 && !finished) {
    return (
      <div className="text-center">
        <p className="mb-4" style={{ color: 'var(--ink-soft)' }}>Keine Wörter zur Wiederholung verfügbar.</p>
        <button
          onClick={() => setView('dashboard')}
          className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--blue)' }}
          onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
          onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
        >
          Zurück zur Übersicht
        </button>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Sitzung abgeschlossen! 🎉</h2>
        <p className="mb-8" style={{ color: 'var(--ink-soft)' }}>Gute Arbeit beim Wiederholen!</p>
        <button
          onClick={() => {
            setInSession(false)
            setView('dashboard')
          }}
          className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--blue)' }}
          onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
          onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
        >
          Zur Übersicht
        </button>
      </div>
    )
  }

  const card = queue[currentIdx]

  const handleReveal = () => {
    setPhase('reveal')
  }

  const handleGrade = async (result) => {
    try {
      if (result === 'gewusst') {
        // Double interval
        const newInterval = card.interval_days * 2
        const nextReviewAt = new Date()
        nextReviewAt.setDate(nextReviewAt.getDate() + newInterval)

        await supabase
          .from('cards')
          .update({
            interval_days: newInterval,
            next_review_at: nextReviewAt.toISOString(),
          })
          .eq('id', card.id)

        // Remove from queue
        const newQueue = queue.filter((_, i) => i !== currentIdx)
        setQueue(newQueue)

        if (currentIdx >= newQueue.length) {
          setFinished(true)
        } else {
          // Adjust currentIdx if necessary
          const nextIdx = Math.min(currentIdx, newQueue.length - 1)
          setCurrentIdx(nextIdx)
          setDirection(getRandomDirection())
          setPhase('input')
          setUserAnswer('')
        }
      } else {
        // nicht_gewusst: reset to 1 day
        const nextReviewAt = new Date()
        nextReviewAt.setDate(nextReviewAt.getDate() + 1)

        await supabase
          .from('cards')
          .update({
            interval_days: 1,
            next_review_at: nextReviewAt.toISOString(),
          })
          .eq('id', card.id)

        const updatedCard = {
          ...card,
          interval_days: 1,
          next_review_at: nextReviewAt.toISOString(),
        }
        const newQueue = reinsert(queue, updatedCard, currentIdx)
        setQueue(newQueue)
        setCurrentIdx(currentIdx + 1)
        setDirection(getRandomDirection())
        setPhase('input')
        setUserAnswer('')
      }
    } catch (err) {
      console.error('Error grading:', err)
      alert('Fehler beim Speichern der Antwort.')
    }
  }

  const handleStop = () => {
    if (confirm('Sitzung beenden?')) {
      setInSession(false)
      setView('dashboard')
    }
  }

  return (
    <QuizCard
      word={card}
      direction={direction}
      totalCards={queue.length}
      currentIndex={currentIdx}
      phase={phase}
      userAnswer={userAnswer}
      onAnswerChange={setUserAnswer}
      onReveal={handleReveal}
      onGrade={handleGrade}
      onStop={handleStop}
    />
  )
}

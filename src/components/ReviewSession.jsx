import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { reinsertAt } from '../utils/queue'
import QuizCard from './QuizCard'

function DaysToast({ days }) {
  if (days == null) return null
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
      backgroundColor: 'var(--blue)', color: '#fff', padding: '10px 18px', borderRadius: 9999,
      fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}>
      🔁 Kommt in {days} {days === 1 ? 'Tag' : 'Tagen'} wieder
    </div>
  )
}

function nextDirection(current) {
  return current === 'de→fr' ? 'fr→de' : 'de→fr'
}

export default function ReviewSession({ setView, setInSession }) {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [sessionNotStarted, setSessionNotStarted] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [phase, setPhase] = useState('input')
  const [direction, setDirection] = useState('de→fr')
  const [pills, setPills] = useState([])
  const [sessionSize, setSessionSize] = useState(0)
  const [feedbackDays, setFeedbackDays] = useState(null)
  const feedbackTimer = useRef(null)

  const showDays = (days) => {
    setFeedbackDays(days)
    clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setFeedbackDays(null), 2200)
  }

  useEffect(() => {
    setInSession(true)
    loadCards()
    return () => { setInSession(false); clearTimeout(feedbackTimer.current) }
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

      const limited = dueCards.slice(0, 15).map(c => ({
        ...c,
        _correctCount: 0,
        _hadError: false,
      }))
      setQueue(limited)
      setSessionSize(limited.length)
      const initialPills = limited.map(card => ({ id: card.id, color: 'gray' }))
      setPills(initialPills)
      setDirection('de→fr')
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

  if (queue.length === 0) {
    return null
  }

  const card = queue[0]

  const handleReveal = () => {
    setPhase('reveal')
  }

  const handleGrade = async (result) => {
    try {
      const card = queue[0]
      const newPills = [...pills]
      const pillIdx = newPills.findIndex(p => p.id === card.id)

      if (result === 'gewusst') {
        // Bestimme wie viele Gewusst nötig sind: 2 wenn Fehler, sonst 1
        const needed = card._hadError ? 2 : 1
        const newCount = card._correctCount + 1

        if (newCount >= needed) {
          // Fertig - dunkelgrün + entfernen
          newPills[pillIdx].color = 'dark-green'
          setPills(newPills)
          showDays(card._hadError ? card.interval_days : card.interval_days * 2)

          // Nur bei fehlerfreien Karten: Interval verdoppeln
          if (!card._hadError) {
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
          }
          // Bei Fehler: Supabase wurde schon bei "nicht_gewusst" gesetzt, kein Update nötig

          const newQueue = queue.slice(1)
          setQueue(newQueue)

          if (newQueue.length === 0) {
            setFinished(true)
          } else {
            setDirection(nextDirection)
            setPhase('input')
            setUserAnswer('')
          }
        } else {
          // Nach Fehler: 1x Gewusst, braucht noch 1x - hellgrün + ans Ende
          newPills[pillIdx].color = 'light-green'
          setPills(newPills)

          const updatedCard = {
            ...card,
            _correctCount: newCount,
          }
          const newQueue = reinsertAt(queue.slice(1), updatedCard, null)
          setQueue(newQueue)
          setDirection(nextDirection)
          setPhase('input')
          setUserAnswer('')
        }
      } else {
        // Nicht gewusst - rot + 3 Positionen vor + Fehler-Flag setzen
        const nextReviewAt = new Date()
        nextReviewAt.setDate(nextReviewAt.getDate() + 1)

        await supabase
          .from('cards')
          .update({
            interval_days: 1,
            next_review_at: nextReviewAt.toISOString(),
          })
          .eq('id', card.id)

        newPills[pillIdx].color = 'red'
        setPills(newPills)

        const updatedCard = {
          ...card,
          interval_days: 1,
          next_review_at: nextReviewAt.toISOString(),
          _correctCount: 0,
          _hadError: true,
        }
        const newQueue = reinsertAt(queue.slice(1), updatedCard, 3)
        setQueue(newQueue)
        setDirection(nextDirection)
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
    <>
      <DaysToast days={feedbackDays} />
      <QuizCard
        word={card}
        direction={direction}
        pills={pills}
        currentCardId={card.id}
        sessionSize={sessionSize}
        phase={phase}
        userAnswer={userAnswer}
        onAnswerChange={setUserAnswer}
        onReveal={handleReveal}
        onGrade={handleGrade}
        onStop={handleStop}
      />
    </>
  )
}

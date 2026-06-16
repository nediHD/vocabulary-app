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

export default function LearningSession({ setView }) {
  const [queue, setQueue] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [phase, setPhase] = useState('input')
  const [direction, setDirection] = useState('de→fr')

  useEffect(() => {
    loadCards()
  }, [])

  const loadCards = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('status', 'learning')

      if (error) {
        console.error('Error loading cards:', error)
        return
      }

      if (!data || data.length === 0) {
        setFinished(true)
        return
      }

      const shuffled = shuffle(data)
      setQueue(shuffled)
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

  if (queue.length === 0 && !finished) {
    return (
      <div className="text-center">
        <p className="mb-4" style={{ color: 'var(--ink-soft)' }}>Keine Wörter zum Lernen verfügbar.</p>
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
        <p className="mb-8" style={{ color: 'var(--ink-soft)' }}>Gute Arbeit beim Lernen!</p>
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

  const card = queue[currentIdx]

  const handleReveal = () => {
    setPhase('reveal')
  }

  const handleGrade = async (result) => {
    try {
      if (result === 'gewusst') {
        const newCount = card.learning_correct_count + 1

        if (newCount >= 2) {
          // Graduate to review
          const nextReviewAt = new Date()
          nextReviewAt.setDate(nextReviewAt.getDate() + 1)

          await supabase
            .from('cards')
            .update({
              status: 'review',
              learning_correct_count: 0,
              interval_days: 1,
              next_review_at: nextReviewAt.toISOString(),
            })
            .eq('id', card.id)

          // Remove from queue
          const newQueue = queue.filter((_, i) => i !== currentIdx)
          setQueue(newQueue)

          if (currentIdx >= newQueue.length) {
            setFinished(true)
          } else {
            setCurrentIdx(0)
            setDirection(getRandomDirection())
            setPhase('input')
            setUserAnswer('')
          }
        } else {
          // Reinsert with incremented count
          await supabase
            .from('cards')
            .update({ learning_correct_count: newCount })
            .eq('id', card.id)

          const updatedCard = { ...card, learning_correct_count: newCount }
          const newQueue = reinsert(queue, updatedCard, currentIdx)
          setQueue(newQueue)
          setCurrentIdx(currentIdx + 1)
          setDirection(getRandomDirection())
          setPhase('input')
          setUserAnswer('')
        }
      } else {
        // nicht_gewusst
        await supabase
          .from('cards')
          .update({ learning_correct_count: 0 })
          .eq('id', card.id)

        const updatedCard = { ...card, learning_correct_count: 0 }
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

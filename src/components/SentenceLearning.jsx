import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { generateCloze } from '../lib/groq'
import { reinsertAt } from '../utils/queue'
import QuizCard from './QuizCard'

function nextDirection(current) {
  return current === 'de→fr' ? 'fr→de' : 'de→fr'
}

// Vergleich großzügig: Groß/Klein, Akzente, Satzzeichen egal.
function norm(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9' -]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

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

export default function SentenceLearning({ setView, setInSession }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingStep, setLoadingStep] = useState('')
  const [finished, setFinished] = useState(false)
  const [noDueWords, setNoDueWords] = useState(false)
  const [error, setError] = useState('')
  const [batchIdx, setBatchIdx] = useState(0)
  const [phase, setPhase] = useState('cloze')
  const [pills, setPills] = useState([])

  // Lückentext-Eingaben (keyed by Platzhalter-Nummer) + Auswertung pro Lücke
  const [clozeAnswers, setClozeAnswers] = useState({})
  const [clozeGradedBlanks, setClozeGradedBlanks] = useState({})
  const clozeInputRefs = useRef({})

  // Wörter-schreiben-Phase: Eingaben + Auswertung pro Wort
  const [writeAnswers, setWriteAnswers] = useState({})
  const [writeGraded, setWriteGraded] = useState({})
  const writeInputRefs = useRef({})

  // Wiederholung (flashcard review) der geübten Wörter am Ende
  const [mode, setMode] = useState('sentences') // 'sentences' | 'review'
  const [reviewQueue, setReviewQueue] = useState([])
  const [reviewPills, setReviewPills] = useState([])
  const [reviewSize, setReviewSize] = useState(0)
  const [reviewPhase, setReviewPhase] = useState('input')
  const [reviewAnswer, setReviewAnswer] = useState('')
  const [reviewDirection, setReviewDirection] = useState('de→fr')
  const [reviewFinished, setReviewFinished] = useState(false)
  const [feedbackDays, setFeedbackDays] = useState(null)
  const feedbackTimer = useRef(null)

  const showReviewDays = (days) => {
    setFeedbackDays(days)
    clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setFeedbackDays(null), 2200)
  }

  useEffect(() => {
    setInSession(true)
    loadBatches()
    return () => {
      setInSession(false)
      clearTimeout(feedbackTimer.current)
    }
  }, [])

  const loadBatches = async () => {
    try {
      setLoading(true)
      setLoadingStep('Wörter werden geladen...')
      const now = new Date().toISOString()

      const { data, error: err } = await supabase
        .from('cards')
        .select('*')
        .eq('status', 'review')

      if (err) {
        setError('Fehler beim Laden der Wörter: ' + err.message)
        return
      }

      const dueCards = (data || []).filter(card => new Date(card.next_review_at) <= new Date(now))

      if (dueCards.length === 0) {
        setNoDueWords(true)
        setLoading(false)
        return
      }

      const selected = dueCards.slice(0, 15)

      // Wörter zufällig mischen (Fisher-Yates), damit die Lücken NICHT in der
      // ursprünglichen Reihenfolge der Wörter erscheinen, sondern gemischt.
      const shuffled = [...selected]
      for (let k = shuffled.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1))
        ;[shuffled[k], shuffled[j]] = [shuffled[j], shuffled[k]]
      }

      // Feste Gruppengröße: 3 Lücken pro Lückentext (Run).
      const PER_GROUP = 3
      const groups = []
      for (let k = 0; k < shuffled.length; k += PER_GROUP) {
        groups.push(shuffled.slice(k, k + PER_GROUP))
      }

      const newBatches = []
      for (let i = 0; i < groups.length; i++) {
        setLoadingStep(`Lückentexte werden erstellt (${i + 1}/${groups.length})...`)
        const matchedCards = groups[i]

        if (matchedCards.length === 0) continue

        try {
          const cloze = await generateCloze(matchedCards)
          newBatches.push({
            words: matchedCards,
            text: cloze.text,
            blanks: cloze.blanks,
          })
        } catch (genErr) {
          console.error(`Fehler bei Gruppe ${i + 1}:`, genErr)
        }
      }

      if (newBatches.length === 0) {
        setError('Fehler: Keine Lückentexte konnten erstellt werden. Bitte versuche es erneut.')
        setLoading(false)
        return
      }

      setBatches(newBatches)
      setPills(newBatches.map((_, i) => ({ id: i, color: 'gray' })))
      setLoadingStep('')
    } catch (err) {
      console.error('Error:', err)
      setError('Unerwarteter Fehler: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--ink-soft)' }} className="mb-2">{loadingStep || 'Wird geladen...'}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <p className="mb-4 text-lg" style={{ color: '#ef4444' }}>{error}</p>
        <button
          onClick={() => {
            setError('')
            setLoadingStep('')
            setBatchIdx(0)
            setPhase('cloze')
            setClozeAnswers({})
            setClozeGradedBlanks({})
            setWriteAnswers({})
            setWriteGraded({})
            loadBatches()
          }}
          className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--blue)' }}
          onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
          onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  if (noDueWords) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <p className="mb-4 text-lg" style={{ color: 'var(--ink-soft)' }}>Keine Wörter fällig.</p>
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

  const startReview = () => {
    const seen = new Set()
    const words = []
    batches.forEach(b => (b.words || []).forEach(w => {
      if (w && !seen.has(w.id)) {
        seen.add(w.id)
        words.push({ ...w, _correctCount: 0, _hadError: false })
      }
    }))
    if (words.length === 0) return
    setReviewQueue(words)
    setReviewSize(words.length)
    setReviewPills(words.map(w => ({ id: w.id, color: 'gray' })))
    setReviewDirection('de→fr')
    setReviewPhase('input')
    setReviewAnswer('')
    setReviewFinished(false)
    setMode('review')
  }

  const handleReviewGrade = async (result) => {
    try {
      const card = reviewQueue[0]
      const newPills = [...reviewPills]
      const pillIdx = newPills.findIndex(p => p.id === card.id)

      if (result === 'gewusst') {
        const needed = card._hadError ? 2 : 1
        const newCount = card._correctCount + 1

        if (newCount >= needed) {
          newPills[pillIdx].color = 'dark-green'
          setReviewPills(newPills)
          showReviewDays(card._hadError ? card.interval_days : card.interval_days * 2)

          if (!card._hadError) {
            const newInterval = card.interval_days * 2
            const nextReviewAt = new Date()
            nextReviewAt.setDate(nextReviewAt.getDate() + newInterval)
            await supabase
              .from('cards')
              .update({ interval_days: newInterval, next_review_at: nextReviewAt.toISOString() })
              .eq('id', card.id)
          }

          const newQueue = reviewQueue.slice(1)
          setReviewQueue(newQueue)
          if (newQueue.length === 0) {
            setReviewFinished(true)
          } else {
            setReviewDirection(nextDirection)
            setReviewPhase('input')
            setReviewAnswer('')
          }
        } else {
          newPills[pillIdx].color = 'light-green'
          setReviewPills(newPills)
          const updatedCard = { ...card, _correctCount: newCount }
          setReviewQueue(reinsertAt(reviewQueue.slice(1), updatedCard, null))
          setReviewDirection(nextDirection)
          setReviewPhase('input')
          setReviewAnswer('')
        }
      } else {
        const nextReviewAt = new Date()
        nextReviewAt.setDate(nextReviewAt.getDate() + 1)
        await supabase
          .from('cards')
          .update({ interval_days: 1, next_review_at: nextReviewAt.toISOString() })
          .eq('id', card.id)

        newPills[pillIdx].color = 'red'
        setReviewPills(newPills)
        const updatedCard = {
          ...card,
          interval_days: 1,
          next_review_at: nextReviewAt.toISOString(),
          _correctCount: 0,
          _hadError: true,
        }
        setReviewQueue(reinsertAt(reviewQueue.slice(1), updatedCard, 3))
        setReviewDirection(nextDirection)
        setReviewPhase('input')
        setReviewAnswer('')
      }
    } catch (err) {
      console.error('Error grading review:', err)
      alert('Fehler beim Speichern der Antwort.')
    }
  }

  const handleReviewStop = () => {
    if (confirm('Sitzung beenden?')) {
      setInSession(false)
      setView('dashboard')
    }
  }

  // Wiederholung (flashcard) der geübten Wörter
  if (mode === 'review') {
    if (reviewFinished) {
      return (
        <div className="mx-auto max-w-2xl text-center py-20">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Wiederholung abgeschlossen! 🎉</h2>
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
    if (reviewQueue.length === 0) return null
    const rcard = reviewQueue[0]
    return (
      <>
        <DaysToast days={feedbackDays} />
        <QuizCard
          word={rcard}
          direction={reviewDirection}
          pills={reviewPills}
          currentCardId={rcard.id}
          sessionSize={reviewSize}
          phase={reviewPhase}
          userAnswer={reviewAnswer}
          onAnswerChange={setReviewAnswer}
          onReveal={() => setReviewPhase('reveal')}
          onGrade={handleReviewGrade}
          onStop={handleReviewStop}
        />
      </>
    )
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Sitzung abgeschlossen! 🎉</h2>
        <p className="mb-8" style={{ color: 'var(--ink-soft)' }}>Gute Arbeit beim Üben!</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => {
              setInSession(false)
              setView('dashboard')
            }}
            className="rounded-2xl border px-6 py-3 font-semibold transition-colors"
            style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--line-soft)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--surface)'}
          >
            Zur Übersicht
          </button>
          <button
            onClick={startReview}
            className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
          >
            Wörter wiederholen
          </button>
        </div>
      </div>
    )
  }

  if (batches.length === 0) return null

  const current = batches[batchIdx]
  if (!current) return null

  const doneCount = pills.filter(p => p.color === 'dark-green').length

  const handleStop = () => {
    if (confirm('Sitzung beenden?')) {
      setInSession(false)
      setView('dashboard')
    }
  }

  const handleNextBatch = () => {
    const newPills = [...pills]
    newPills[batchIdx].color = 'dark-green'
    setPills(newPills)

    if (batchIdx + 1 >= batches.length) {
      setFinished(true)
    } else {
      setBatchIdx(batchIdx + 1)
      setPhase('cloze')
      setClozeAnswers({})
      setClozeGradedBlanks({})
      setWriteAnswers({})
      setWriteGraded({})
    }
  }

  // Auswertung Lückentext
  const clozeCorrectCount = current.blanks.filter(b => norm(clozeAnswers[b.n]) === norm(b.answer)).length

  // Eine einzelne Lücke per Enter prüfen und Fokus auf die nächste offene Lücke setzen
  const gradeClozeBlank = (n) => {
    setClozeGradedBlanks(prev => ({ ...prev, [n]: true }))
    const order = current.blanks.map(b => b.n)
    const pos = order.indexOf(n)
    for (let k = pos + 1; k < order.length; k++) {
      if (!clozeGradedBlanks[order[k]] && clozeInputRefs.current[order[k]]) {
        clozeInputRefs.current[order[k]].focus()
        break
      }
    }
  }

  const gradeAllCloze = () => {
    const next = {}
    current.blanks.forEach(b => { next[b.n] = true })
    setClozeGradedBlanks(next)
  }

  const allClozeGraded = current.blanks.length > 0 && current.blanks.every(b => clozeGradedBlanks[b.n])

  // Ein einzelnes Wort per Enter prüfen und Fokus auf das nächste offene Wort setzen
  const gradeWriteWord = (idx) => {
    setWriteGraded(prev => ({ ...prev, [idx]: true }))
    for (let k = idx + 1; k < current.words.length; k++) {
      if (!writeGraded[k] && writeInputRefs.current[k]) {
        writeInputRefs.current[k].focus()
        break
      }
    }
  }

  const gradeAllWrite = () => {
    const next = {}
    current.words.forEach((_, idx) => { next[idx] = true })
    setWriteGraded(next)
  }

  const allWriteGraded = current.words.length > 0 && current.words.every((_, idx) => writeGraded[idx])

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header with pills */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={handleStop}
          className="text-sm font-medium transition-colors whitespace-nowrap"
          style={{ color: 'var(--ink-soft)' }}
          onMouseEnter={e => e.target.style.color = 'var(--ink)'}
          onMouseLeave={e => e.target.style.color = 'var(--ink-soft)'}
        >
          ← Beenden
        </button>

        <div className="flex flex-1 gap-1 items-center">
          {pills.map((pill) => {
            let bgColor = 'var(--line)'
            if (pill.color === 'dark-green') bgColor = '#16a34a'

            return (
              <div
                key={pill.id}
                className="flex-1 h-2 rounded-full transition-all"
                style={{ backgroundColor: bgColor }}
              />
            )
          })}
        </div>

        <div className="font-mono text-xs whitespace-nowrap" style={{ color: 'var(--ink-faint)' }}>
          {doneCount} / {batches.length}
        </div>
      </div>

      {/* Phase: Lückentext (Cloze) */}
      {phase === 'cloze' && (
        <div className="flex flex-col items-center py-8 sm:py-12">
          <div className="mb-6 text-center">
            <p style={{ color: 'var(--ink-soft)' }} className="text-sm">
              Fülle die Lücken aus – tippe das passende französische Wort.
              In Klammern steht die deutsche Bedeutung.
            </p>
          </div>

          <div
            className="mb-8 w-full rounded-2xl border p-6 text-lg"
            style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink)', lineHeight: 2.4 }}
          >
            {current.text.split(/(\{\{\d+\}\})/).map((part, i) => {
              const m = part.match(/^\{\{(\d+)\}\}$/)
              if (!m) return <span key={i}>{part}</span>
              const n = Number(m[1])
              const blank = current.blanks.find(b => b.n === n)
              if (!blank) return <span key={i}>____</span>

              const graded = !!clozeGradedBlanks[n]
              const val = clozeAnswers[n] || ''
              const correct = norm(val) === norm(blank.answer)
              let borderColor = 'var(--blue)'
              let bg = 'white'
              if (graded) {
                borderColor = correct ? '#16a34a' : '#ef4444'
                bg = correct ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)'
              }

              return (
                <span key={i} style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', margin: '0 3px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                    <input
                      ref={el => { clozeInputRefs.current[n] = el }}
                      type="text"
                      value={val}
                      disabled={graded}
                      onChange={e => setClozeAnswers(prev => ({ ...prev, [n]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!graded) gradeClozeBlank(n) } }}
                      size={Math.max(6, blank.answer.length + 2)}
                      className="rounded-lg border-2 px-2 py-1 text-center font-sans text-base outline-none"
                      style={{ borderColor, backgroundColor: bg, color: 'var(--ink)' }}
                    />
                    <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>({blank.de})</span>
                  </span>
                  {graded && !correct && (
                    <span className="mt-0.5 text-xs font-semibold" style={{ color: '#16a34a' }}>
                      ✓ {blank.answer}
                    </span>
                  )}
                  {graded && blank.changed && blank.note && (
                    <span className="mt-0.5 max-w-[220px] text-xs italic" style={{ color: 'var(--blue-dark)' }}>
                      ⓘ {blank.note}
                    </span>
                  )}
                </span>
              )
            })}
          </div>

          {!allClozeGraded ? (
            <div className="w-full max-w-sm text-center">
              <p className="mb-4 text-xs" style={{ color: 'var(--ink-faint)' }}>
                Drücke Enter in einer Lücke, um sie zu prüfen.
              </p>
              <button
                onClick={gradeAllCloze}
                className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--blue)' }}
                onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
                onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
              >
                Alle prüfen
              </button>
            </div>
          ) : (
            <div className="w-full max-w-sm">
              <p className="mb-4 text-center text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {clozeCorrectCount} / {current.blanks.length} richtig
              </p>
              <button
                onClick={() => {
                  setPhase('write')
                  setWriteAnswers({})
                  setWriteGraded({})
                }}
                className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--blue)' }}
                onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
                onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
              >
                Weiter: Wörter schreiben →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phase: Write (Deutsch → Französisch, alle Wörter der Gruppe) */}
      {phase === 'write' && (
        <div className="flex flex-col items-center py-12 sm:py-20">
          <div className="mb-8 text-center">
            <div style={{ color: 'var(--ink-soft)' }} className="text-sm">
              Schreibe die Wörter auf Französisch:
            </div>
            {!allWriteGraded && (
              <div className="mt-1 text-xs" style={{ color: 'var(--ink-faint)' }}>
                Drücke Enter, um ein Wort zu prüfen.
              </div>
            )}
          </div>

          <div className="mb-8 w-full max-w-2xl space-y-6">
            {current.words.map((word, idx) => {
              const graded = !!writeGraded[idx]
              const val = writeAnswers[idx] || ''
              const correct = norm(val) === norm(word.french)
              let borderColor = 'var(--line)'
              let bg = 'white'
              if (graded) {
                borderColor = correct ? '#16a34a' : '#ef4444'
                bg = correct ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)'
              }
              return (
                <div key={idx} className="rounded-2xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
                  <div
                    className="mb-2 font-mono text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--ink-faint)' }}
                  >
                    Wort {idx + 1} (Deutsch): {word.german}
                  </div>
                  <input
                    ref={el => { writeInputRefs.current[idx] = el }}
                    type="text"
                    placeholder="Französisch..."
                    value={val}
                    disabled={graded}
                    onChange={e => setWriteAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!graded) gradeWriteWord(idx) } }}
                    className="w-full rounded-lg border-2 px-4 py-3 font-sans text-lg outline-none"
                    style={{ borderColor, backgroundColor: bg, color: 'var(--ink)' }}
                    autoFocus={idx === 0}
                  />
                  {graded && !correct && (
                    <div className="mt-2 text-sm font-semibold" style={{ color: '#16a34a' }}>
                      ✓ {word.french}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!allWriteGraded ? (
            <button
              onClick={gradeAllWrite}
              className="w-full max-w-2xl rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--blue)' }}
              onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
            >
              Alle prüfen
            </button>
          ) : (
            <button
              onClick={handleNextBatch}
              className="w-full max-w-2xl rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--blue)' }}
              onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
            >
              Weiter →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

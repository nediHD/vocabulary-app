import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateSentence } from '../lib/groq'

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function SentenceLearning({ setView, setInSession }) {
  const [sentences, setSentences] = useState([])
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [noDueWords, setNoDueWords] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState('translate')
  const [userTranslation, setUserTranslation] = useState('')
  const [userWord1, setUserWord1] = useState('')
  const [userWord2, setUserWord2] = useState('')
  const [pills, setPills] = useState([])
  const [sessionSize, setSessionSize] = useState(0)
  const [round, setRound] = useState('fr-de')
  const [betweenRounds, setBetweenRounds] = useState(false)

  useEffect(() => {
    setInSession(true)
    loadSentences()
    return () => setInSession(false)
  }, [])

  const loadSentences = async () => {
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

      const dueCards =
        data?.filter(card => new Date(card.next_review_at) <= new Date(now)) ||
        []

      if (dueCards.length === 0) {
        setNoDueWords(true)
        return
      }

      const shuffled = shuffle(dueCards)
      const pairs = []

      for (let i = 0; i < shuffled.length; i += 2) {
        const word1 = shuffled[i]
        const word2 = shuffled[i + 1] || null

        try {
          const sentenceData = await generateSentence(word1, word2)
          pairs.push({
            french: sentenceData.french,
            german: sentenceData.german,
            word1,
            word2,
          })
        } catch (err) {
          console.error('Error generating sentence:', err)
        }
      }

      setSentences(pairs)
      setSessionSize(pairs.length)
      const initialPills = pairs.map((_, i) => ({ id: i, color: 'gray' }))
      setPills(initialPills)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center" style={{ color: 'var(--ink-soft)' }}>Sätze werden generiert...</div>
  }

  if (noDueWords) {
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

  if (betweenRounds) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Runde 1 abgeschlossen! ✅</h2>
        <p className="mb-2 text-lg" style={{ color: 'var(--ink-soft)' }}>Gute Arbeit beim Übersetzen!</p>
        <p className="mb-8" style={{ color: 'var(--ink-soft)' }}>Jetzt üben wir die gleichen Sätze in die andere Richtung.</p>
        <button
          onClick={startRound2}
          className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--blue)' }}
          onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
          onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
        >
          Runde 2 starten →
        </button>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Sitzung abgeschlossen! 🎉</h2>
        <p className="mb-8" style={{ color: 'var(--ink-soft)' }}>Gute Arbeit beim Üben der Sätze!</p>
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

  if (sentences.length === 0) {
    return null
  }

  const current = sentences[currentIdx]
  const doneCount = pills.filter(p => p.color === 'dark-green').length

  const handleStop = () => {
    if (confirm('Sitzung beenden?')) {
      setInSession(false)
      setView('dashboard')
    }
  }

  const handleReveal = () => {
    if (phase === 'translate') {
      setPhase('reveal')
    }
  }

  const handleNext = () => {
    const newPills = [...pills]
    newPills[currentIdx].color = 'dark-green'
    setPills(newPills)

    if (round === 'fr-de') {
      if (currentIdx + 1 >= sentences.length) {
        setBetweenRounds(true)
      } else {
        setCurrentIdx(currentIdx + 1)
        setPhase('translate')
        setUserTranslation('')
        setUserWord1('')
        setUserWord2('')
      }
    } else {
      if (currentIdx + 1 >= sentences.length) {
        setFinished(true)
      } else {
        setCurrentIdx(currentIdx + 1)
        setPhase('de-translate')
        setUserTranslation('')
      }
    }
  }

  const startRound2 = () => {
    setRound('de-fr')
    setBetweenRounds(false)
    setCurrentIdx(0)
    setUserTranslation('')
    setPhase('de-translate')
    const resetPills = sentences.map((_, i) => ({ id: i, color: 'gray' }))
    setPills(resetPills)
  }

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

        {/* Round indicator */}
        <span className="font-mono text-xs whitespace-nowrap" style={{ color: 'var(--ink-faint)' }}>
          {round === 'fr-de' ? 'FR → DE' : 'DE → FR'}
        </span>

        {/* Pills */}
        <div className="flex flex-1 gap-1 items-center">
          {pills.map((pill) => {
            let bgColor = 'var(--line)'
            if (pill.color === 'dark-green') bgColor = '#16a34a'

            return (
              <div
                key={pill.id}
                className="flex-1 h-2 rounded-full transition-all"
                style={{
                  backgroundColor: bgColor,
                }}
              />
            )
          })}
        </div>

        {/* Counter */}
        <div className="font-mono text-xs whitespace-nowrap" style={{ color: 'var(--ink-faint)' }}>
          {doneCount} / {sessionSize}
        </div>
      </div>

      {round === 'fr-de' ? (
        // Runde 1: FR → DE
        <>
      {phase === 'translate' ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20">
          <div className="mb-8 text-center">
            <div className="mb-4 text-lg sm:text-xl" style={{ color: 'var(--ink)' }}>
              {current.french.split(' ').map((word, i) => {
                const isFocusWord =
                  word.toLowerCase().includes(current.word1.french.toLowerCase()) ||
                  (current.word2 && word.toLowerCase().includes(current.word2.french.toLowerCase()))
                return (
                  <span key={i}>
                    <span style={{ fontWeight: isFocusWord ? 'bold' : 'normal' }}>{word}</span>
                    {i < current.french.split(' ').length - 1 ? ' ' : ''}
                  </span>
                )
              })}
            </div>
            <div style={{ color: 'var(--ink-soft)' }} className="text-sm">
              Übersetze diesen Satz ins Deutsche:
            </div>
          </div>
          <input
            type="text"
            placeholder="Antworte hier..."
            value={userTranslation}
            onChange={e => setUserTranslation(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleReveal()}
            className="mb-6 w-full max-w-sm rounded-2xl border-2 px-4 py-4 text-center font-sans text-lg outline-none"
            style={{
              borderColor: 'var(--blue)',
              backgroundColor: 'white',
              color: 'var(--ink)',
            }}
            autoFocus
          />
          <button
            onClick={handleReveal}
            className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
          >
            Aufdecken
          </button>
        </div>
      ) : phase === 'reveal' ? (
        <div className="flex flex-col items-center py-12 sm:py-20">
          <div className="mb-8 text-center">
            <div className="text-lg sm:text-xl" style={{ color: 'var(--ink)' }}>
              {current.french.split(' ').map((word, i) => {
                const isFocusWord =
                  word.toLowerCase().includes(current.word1.french.toLowerCase()) ||
                  (current.word2 && word.toLowerCase().includes(current.word2.french.toLowerCase()))
                return (
                  <span key={i}>
                    <span style={{ fontWeight: isFocusWord ? 'bold' : 'normal' }}>{word}</span>
                    {i < current.french.split(' ').length - 1 ? ' ' : ''}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Answer Comparison */}
          <div className="mb-12 flex w-full flex-col gap-4 sm:flex-row max-w-2xl">
            <div className="flex-1 rounded-2xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
              <div className="mb-1 font-mono text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                Deine Übersetzung
              </div>
              <div className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{userTranslation}</div>
            </div>
            <div className="flex-1 rounded-2xl border p-5" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
              <div className="mb-1 font-mono text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>
                Richtige Übersetzung
              </div>
              <div className="text-lg font-semibold" style={{ color: 'var(--blue-dark)' }}>
                {current.german}
              </div>
            </div>
          </div>

          <button
            onClick={() => setPhase('write')}
            className="w-full max-w-2xl rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
          >
            Weiter: Wörter schreiben
          </button>
        </div>
      ) : (
        // Write Phase
        <div className="flex flex-col items-center py-12 sm:py-20">
          <div className="mb-8 text-center">
            <div style={{ color: 'var(--ink-soft)' }} className="text-sm">
              Schreibe die Wörter auf Französisch:
            </div>
          </div>

          <div className="mb-8 w-full max-w-2xl space-y-6">
            <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
              <div className="mb-2 font-mono text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                Wort 1 (Deutsch): {current.word1.german}
              </div>
              <input
                type="text"
                placeholder="Französisch..."
                value={userWord1}
                onChange={e => setUserWord1(e.target.value)}
                className="w-full rounded-lg border px-4 py-3 font-sans text-lg outline-none"
                style={{
                  borderColor: 'var(--line)',
                  backgroundColor: 'white',
                  color: 'var(--ink)',
                }}
              />
            </div>

            <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
              <div className="mb-2 font-mono text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                Wort 2 (Deutsch): {current.word2 ? current.word2.german : '-'}
              </div>
              <input
                type="text"
                placeholder="Französisch..."
                value={userWord2}
                onChange={e => setUserWord2(e.target.value)}
                disabled={!current.word2}
                className="w-full rounded-lg border px-4 py-3 font-sans text-lg outline-none"
                style={{
                  borderColor: 'var(--line)',
                  backgroundColor: current.word2 ? 'white' : 'var(--line-soft)',
                  color: 'var(--ink)',
                  opacity: current.word2 ? 1 : 0.5,
                }}
              />
            </div>
          </div>

          <div className="mb-8 flex w-full max-w-2xl gap-4">
            <button
              onClick={() => setPhase('reveal')}
              className="flex-1 rounded-2xl border px-6 py-3.5 font-semibold transition-colors"
              style={{
                borderColor: 'var(--line-soft)',
                backgroundColor: 'var(--surface)',
                color: 'var(--ink)',
              }}
              onMouseEnter={e => e.target.style.backgroundColor = 'var(--line-soft)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'var(--surface)'}
            >
              Zurück
            </button>
            <button
              onClick={() => setPhase('wordReveal')}
              className="flex-1 rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--blue)' }}
              onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
            >
              Aufdecken
            </button>
          </div>
        </div>
      )}

      {phase === 'wordReveal' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full" style={{ backgroundColor: 'var(--surface)' }}>
            <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--ink)' }}>Richtige Schreibweise</h3>

            <div className="mb-6">
              <div className="mb-2 text-sm" style={{ color: 'var(--ink-soft)' }}>{current.word1.german}</div>
              <div className="text-2xl font-semibold" style={{ color: 'var(--blue)' }}>{current.word1.french}</div>
            </div>

            {current.word2 && (
              <div className="mb-8">
                <div className="mb-2 text-sm" style={{ color: 'var(--ink-soft)' }}>{current.word2.german}</div>
                <div className="text-2xl font-semibold" style={{ color: 'var(--blue)' }}>{current.word2.french}</div>
              </div>
            )}

            <button
              onClick={handleNext}
              className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--blue)' }}
              onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
            >
              Weiter
            </button>
          </div>
        </div>
      )}
        </>
      ) : (
        // Runde 2: DE → FR
        <>
      {phase === 'de-translate' ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20">
          <div className="mb-8 text-center">
            <div className="mb-4 text-lg sm:text-xl" style={{ color: 'var(--ink)' }}>
              {current.german.split(' ').map((word, i) => {
                const isFocusWord =
                  word.toLowerCase().includes(current.word1.german.toLowerCase()) ||
                  (current.word2 && word.toLowerCase().includes(current.word2.german.toLowerCase()))
                return (
                  <span key={i}>
                    <span style={{ fontWeight: isFocusWord ? 'bold' : 'normal' }}>{word}</span>
                    {i < current.german.split(' ').length - 1 ? ' ' : ''}
                  </span>
                )
              })}
            </div>
            <div style={{ color: 'var(--ink-soft)' }} className="text-sm">
              Übersetze diesen Satz ins Französische:
            </div>
          </div>
          <input
            type="text"
            placeholder="Antworte hier..."
            value={userTranslation}
            onChange={e => setUserTranslation(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && setPhase('de-reveal')}
            className="mb-6 w-full max-w-sm rounded-2xl border-2 px-4 py-4 text-center font-sans text-lg outline-none"
            style={{
              borderColor: 'var(--blue)',
              backgroundColor: 'white',
              color: 'var(--ink)',
            }}
            autoFocus
          />
          <button
            onClick={() => setPhase('de-reveal')}
            className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
          >
            Aufdecken
          </button>
        </div>
      ) : phase === 'de-reveal' ? (
        <div className="flex flex-col items-center py-12 sm:py-20">
          <div className="mb-8 text-center">
            <div className="text-lg sm:text-xl" style={{ color: 'var(--ink)' }}>
              {current.german.split(' ').map((word, i) => {
                const isFocusWord =
                  word.toLowerCase().includes(current.word1.german.toLowerCase()) ||
                  (current.word2 && word.toLowerCase().includes(current.word2.german.toLowerCase()))
                return (
                  <span key={i}>
                    <span style={{ fontWeight: isFocusWord ? 'bold' : 'normal' }}>{word}</span>
                    {i < current.german.split(' ').length - 1 ? ' ' : ''}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Answer Comparison */}
          <div className="mb-12 flex w-full flex-col gap-4 sm:flex-row max-w-2xl">
            <div className="flex-1 rounded-2xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
              <div className="mb-1 font-mono text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                Deine Übersetzung
              </div>
              <div className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{userTranslation}</div>
            </div>
            <div className="flex-1 rounded-2xl border p-5" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
              <div className="mb-1 font-mono text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>
                Richtige Übersetzung
              </div>
              <div className="text-lg font-semibold" style={{ color: 'var(--blue-dark)' }}>
                {current.french}
              </div>
            </div>
          </div>

          <button
            onClick={handleNext}
            className="w-full max-w-2xl rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
          >
            Weiter
          </button>
        </div>
      ) : null}
        </>
      )}
    </div>
  )
}

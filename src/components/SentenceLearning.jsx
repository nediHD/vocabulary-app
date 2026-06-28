import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { groupWords, generateBatch } from '../lib/groq'
import { textToSpeech } from '../lib/openai'

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function SentenceLearning({ setView, setInSession }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingStep, setLoadingStep] = useState('')
  const [finished, setFinished] = useState(false)
  const [noDueWords, setNoDueWords] = useState(false)
  const [error, setError] = useState('')
  const [batchIdx, setBatchIdx] = useState(0)
  const [phase, setPhase] = useState('listen')
  const [questionIdx, setQuestionIdx] = useState(0)
  const [wordWriteIdx, setWordWriteIdx] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [pills, setPills] = useState([])
  const [audioPlaying, setAudioPlaying] = useState(false)

  useEffect(() => {
    setInSession(true)
    loadBatches()
    return () => {
      setInSession(false)
      batches.forEach(batch => {
        if (batch.audioUrl) URL.revokeObjectURL(batch.audioUrl)
      })
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

      const shuffled = shuffle(dueCards).slice(0, 15)

      setLoadingStep('Wörter werden gruppiert...')
      let groups = []
      try {
        groups = await groupWords(shuffled)
      } catch (err) {
        setError('Fehler beim Gruppieren: ' + err.message)
        setLoading(false)
        return
      }

      const generatedBatches = []
      const totalGroups = groups.length
      const failedGroups = []

      for (let i = 0; i < groups.length; i++) {
        setLoadingStep(`Texte werden generiert (${i + 1}/${totalGroups})...`)
        const groupWords_arr = groups[i]

        const matchedCards = groupWords_arr.map(frenchWord => {
          return shuffled.find(card =>
            card.french.toLowerCase().trim() === frenchWord.toLowerCase().trim()
          )
        }).filter(Boolean)

        if (matchedCards.length === 0) {
          console.warn(`Gruppe ${i + 1}: Keine Wörter gefunden für: ${groupWords_arr.join(', ')}`)
          failedGroups.push(i + 1)
          continue
        }

        try {
          const batchData = await generateBatch(matchedCards)

          setLoadingStep(`Audio wird erstellt (${i + 1}/${totalGroups})...`)
          let audioUrl = null
          try {
            audioUrl = await textToSpeech(batchData.french)
          } catch (ttsErr) {
            console.error('TTS Error:', ttsErr.message)
          }

          generatedBatches.push({
            words: matchedCards,
            french: batchData.french,
            questions: batchData.questions || [],
            audioUrl,
          })
        } catch (err) {
          console.error(`Fehler bei Gruppe ${i + 1}:`, err.message)
          failedGroups.push(i + 1)
        }
      }

      if (failedGroups.length > 0) {
        console.warn(`${failedGroups.length} von ${totalGroups} Gruppen konnten nicht generiert werden`)
      }

      if (generatedBatches.length === 0) {
        setError('Fehler: Keine Batches konnten generiert werden. Bitte versuche es erneut.')
        setLoading(false)
        return
      }

      setBatches(generatedBatches)
      const initialPills = generatedBatches.map((_, i) => ({ id: i, color: 'gray' }))
      setPills(initialPills)
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
            setPhase('listen')
            setQuestionIdx(0)
            setWordWriteIdx(0)
            setUserInput('')
            setRevealed(false)
            setAudioPlaying(false)
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

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Sitzung abgeschlossen! 🎉</h2>
        <p className="mb-8" style={{ color: 'var(--ink-soft)' }}>Gute Arbeit beim Üben!</p>
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
      setPhase('listen')
      setQuestionIdx(0)
      setWordWriteIdx(0)
      setUserInput('')
      setRevealed(false)
      setAudioPlaying(false)
    }
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

      {/* Phase: Listen */}
      {phase === 'listen' && (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20">
          <div className="mb-8 text-center">
            <p style={{ color: 'var(--ink-soft)' }} className="text-sm">Höre den Text an</p>
          </div>

          <div className="mb-12">
            {current.audioUrl ? (
              <div className="flex flex-col items-center gap-6">
                <audio
                  src={current.audioUrl}
                  onPlay={() => setAudioPlaying(true)}
                  onEnded={() => setAudioPlaying(false)}
                  style={{ maxWidth: '100%' }}
                  controls
                />
                <button
                  onClick={() => {
                    const audio = document.querySelector('audio')
                    if (audio) audio.play()
                  }}
                  className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
                  style={{ backgroundColor: 'var(--blue)' }}
                  onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
                >
                  Wiederholen
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--ink-faint)' }} className="text-sm">Audio konnte nicht geladen werden</p>
            )}
          </div>

          <button
            onClick={() => {
              setPhase('questions')
              setQuestionIdx(0)
              setUserInput('')
              setRevealed(false)
            }}
            className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
          >
            Weiter zu den Fragen →
          </button>
        </div>
      )}

      {/* Phase: Questions */}
      {phase === 'questions' && (
        <div className="flex flex-col items-center py-12 sm:py-20">
          {current.questions.length === 0 ? (
            <div className="text-center mb-8">
              <p style={{ color: 'var(--ink-soft)' }} className="text-sm mb-6">Keine Fragen für diesen Batch generiert.</p>
              <button
                onClick={() => {
                  setPhase('write')
                  setWordWriteIdx(0)
                  setUserInput('')
                  setRevealed(false)
                }}
                className="rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--blue)' }}
                onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
                onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
              >
                Zu Wörter üben →
              </button>
            </div>
          ) : questionIdx < current.questions.length ? (
            <>
              <div className="mb-8 text-center max-w-2xl">
                <p style={{ color: 'var(--ink-soft)' }} className="text-sm mb-4">
                  Frage {questionIdx + 1} von {current.questions.length}
                </p>
                <div
                  className="text-lg leading-relaxed mb-6"
                  style={{ color: 'var(--ink)' }}
                >
                  {current.questions[questionIdx].sentence.split('_____').map((part, i) => (
                    <span key={i}>
                      {part}
                      {i < current.questions[questionIdx].sentence.split('_____').length - 1 && (
                        <span style={{ fontWeight: 'bold', color: 'var(--blue)' }}>_____</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {!revealed ? (
                <>
                  <input
                    type="text"
                    placeholder="Antwort eingeben..."
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && setRevealed(true)}
                    className="mb-6 w-full max-w-sm rounded-2xl border-2 px-4 py-4 text-center font-sans text-lg outline-none"
                    style={{
                      borderColor: 'var(--blue)',
                      backgroundColor: 'white',
                      color: 'var(--ink)',
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => setRevealed(true)}
                    className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                    style={{ backgroundColor: 'var(--blue)' }}
                    onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
                    onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
                  >
                    Aufdecken
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-8 flex w-full flex-col gap-4 sm:flex-row max-w-2xl">
                    <div
                      className="flex-1 rounded-2xl border p-5"
                      style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}
                    >
                      <div
                        className="mb-1 font-mono text-xs font-medium uppercase tracking-wider"
                        style={{ color: 'var(--ink-faint)' }}
                      >
                        Deine Antwort
                      </div>
                      <div className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                        {userInput}
                      </div>
                    </div>
                    <div
                      className="flex-1 rounded-2xl border p-5"
                      style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}
                    >
                      <div
                        className="mb-1 font-mono text-xs font-medium uppercase tracking-wider"
                        style={{ color: 'var(--blue-dark)' }}
                      >
                        Richtige Antwort
                      </div>
                      <div className="text-lg font-semibold" style={{ color: 'var(--blue-dark)' }}>
                        {current.questions[questionIdx].answer}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (questionIdx + 1 < current.questions.length) {
                        setQuestionIdx(questionIdx + 1)
                        setUserInput('')
                        setRevealed(false)
                      } else {
                        setPhase('write')
                        setWordWriteIdx(0)
                        setUserInput('')
                        setRevealed(false)
                      }
                    }}
                    className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                    style={{ backgroundColor: 'var(--blue)' }}
                    onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
                    onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
                  >
                    {questionIdx + 1 < current.questions.length ? 'Nächste Frage' : 'Weiter: Wörter schreiben'}
                  </button>
                </>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Phase: Write */}
      {phase === 'write' && (
        <div className="flex flex-col items-center py-12 sm:py-20">
          <div className="mb-8 text-center">
            <div style={{ color: 'var(--ink-soft)' }} className="text-sm">
              Schreibe die Wörter auf Französisch:
            </div>
          </div>

          <div className="mb-8 w-full max-w-2xl space-y-6">
            {current.words.map((word, idx) => (
              <div key={idx} className="rounded-2xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
                <div
                  className="mb-2 font-mono text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  Wort {idx + 1} (Deutsch): {word.german}
                </div>
                <input
                  type="text"
                  placeholder="Französisch..."
                  value={idx === wordWriteIdx ? userInput : (idx < wordWriteIdx ? current.words[idx].french : '')}
                  onChange={e => idx === wordWriteIdx && setUserInput(e.target.value)}
                  disabled={idx !== wordWriteIdx || revealed}
                  className="w-full rounded-lg border px-4 py-3 font-sans text-lg outline-none"
                  style={{
                    borderColor: 'var(--line)',
                    backgroundColor: idx === wordWriteIdx ? 'white' : (idx < wordWriteIdx ? 'var(--line-soft)' : 'var(--line-soft)'),
                    color: 'var(--ink)',
                    opacity: idx === wordWriteIdx ? 1 : 0.5,
                  }}
                  autoFocus={idx === wordWriteIdx}
                />
              </div>
            ))}
          </div>

          <div className="flex w-full max-w-2xl gap-4">
            <button
              onClick={() => setPhase('questions')}
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
              onClick={() => {
                if (wordWriteIdx < current.words.length - 1) {
                  setWordWriteIdx(wordWriteIdx + 1)
                  setUserInput('')
                } else {
                  setRevealed(true)
                }
              }}
              className="flex-1 rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--blue)' }}
              onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
            >
              {wordWriteIdx < current.words.length - 1 ? 'Nächstes Wort' : 'Fertig'}
            </button>
          </div>

          {revealed && (
            <div className="mt-8 w-full max-w-2xl">
              <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
                <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--ink)' }}>Richtige Schreibweise</h3>
                <div className="space-y-4">
                  {current.words.map((word, idx) => (
                    <div key={idx}>
                      <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>{word.german}</div>
                      <div className="text-2xl font-semibold" style={{ color: 'var(--blue)' }}>{word.french}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={handleNextBatch}
                className="mt-6 w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--blue)' }}
                onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
                onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
              >
                Weiter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

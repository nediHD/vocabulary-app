import { useState, useEffect } from 'react'
import { contrastFamiliesFor } from '../lib/grammar'
import { generateTenseChoice } from '../lib/groq'
import { gradeForm } from './GrammarPractice'

const NUM_QUESTIONS = 8

// Hebt das Signalwort im Satz farbig hervor (erst nach dem Antworten sichtbar).
function Signalized({ text, signal, on }) {
  if (!on || !signal) return <>{text}</>
  const i = String(text).toLowerCase().indexOf(String(signal).toLowerCase())
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <span style={{ backgroundColor: 'rgba(59,110,240,0.16)', borderRadius: 4, padding: '0 3px', fontWeight: 700, color: 'var(--blue-dark)' }}>
        {text.slice(i, i + signal.length)}
      </span>
      {text.slice(i + signal.length)}
    </>
  )
}

// Eine Zeitform-Wahl-Übung (Positionen 14–17). Der Lerner liest einen Satz mit
// einer Lücke und WÄHLT die richtige Zeit/den richtigen Modus – er tippt nichts.
// Gleicher SRS wie die Formbildung (form_progress, Schlüssel = target.id).
export default function ContrastPractice({ target, setView, setInSession, onNext }) {
  const [phase, setPhase] = useState('generating') // generating | run | finished | error
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState({})  // idx -> gewählte Option (String)
  const [graded, setGraded] = useState(false)

  useEffect(() => { generate() }, [target?.id])

  const generate = async () => {
    try {
      setPhase('generating')
      setError('')
      setGraded(false)
      setItems([])
      setIdx(0)
      setChosen({})
      const families = contrastFamiliesFor(target.family)
      if (families.length === 0) throw new Error('Keine Familie gefunden')
      const { items: gen } = await generateTenseChoice({ families, count: NUM_QUESTIONS })
      if (!gen?.length) throw new Error('Keine Übungssätze erzeugt')
      setItems(gen)
      setPhase('run')
    } catch (e) {
      console.error('ContrastPractice generate error:', e)
      setError(e.message || 'Unerwarteter Fehler')
      setPhase('error')
    }
  }

  const handleStop = () => {
    if (confirm('Sitzung beenden?')) { setInSession(false); setView('dashboard') }
  }

  const choose = (option) => {
    if (chosen[idx] != null) return
    setChosen(prev => ({ ...prev, [idx]: option }))
  }

  const next = () => {
    if (idx + 1 >= items.length) { setPhase('finished'); return }
    setIdx(i => i + 1)
  }

  const gradeAndFinish = async (understood) => {
    setGraded(true)
    try { await gradeForm(target, understood) } catch (e) { console.error('gradeForm error:', e) }
  }

  // ---------- Basiszustände ----------
  if (phase === 'generating') {
    return (
      <div className="text-center py-24">
        <p className="mb-2" style={{ color: 'var(--ink-soft)' }}>Deine Übung wird vorbereitet…</p>
        <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Übungssätze zur Zeitform-Wahl werden erzeugt (einen Moment).</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <p className="mb-4 text-lg" style={{ color: '#ef4444' }}>{error}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={generate}
            className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}>Erneut versuchen</button>
          <button onClick={() => { setInSession(false); setView('dashboard') }}
            className="rounded-2xl border px-6 py-3 font-semibold"
            style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }}>Zur Übersicht</button>
        </div>
      </div>
    )
  }

  if (phase === 'finished') {
    const correct = items.filter((it, i) => chosen[i] === it.answer).length
    const pct = items.length ? Math.round((100 * correct) / items.length) : 0
    const pctColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#b45309' : '#ef4444'
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Übung fertig! 🎉</h2>
        <div className="mx-auto mb-8 max-w-sm rounded-3xl border p-6" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
          <div className="font-mono text-5xl font-bold" style={{ color: pctColor }}>{pct}%</div>
          <div className="mt-1 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>{correct} von {items.length} richtig</div>
        </div>

        {!graded ? (
          <>
            <p className="mb-2" style={{ color: 'var(--ink-soft)' }}>
              Erkennst du <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{target?.name}</span> sicher?
            </p>
            <p className="mb-8 text-sm" style={{ color: 'var(--ink-faint)' }}>Dein Urteil steuert, wann dieses Thema wiederkommt.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => gradeAndFinish(false)}
                className="rounded-2xl border px-6 py-3 font-semibold transition-colors"
                style={{ borderColor: '#e0a83a', backgroundColor: 'rgba(217,119,6,0.10)', color: '#b45309' }}>
                ↻ Noch nicht
              </button>
              <button onClick={() => gradeAndFinish(true)}
                className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
                style={{ backgroundColor: '#16a34a' }}>
                ✓ Verstanden
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-8" style={{ color: 'var(--ink-soft)' }}>Gespeichert. Gute Arbeit! 👏</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => { setInSession(false); setView('dashboard') }}
                className="rounded-2xl border px-6 py-3 font-semibold transition-colors"
                style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }}>Zur Übersicht</button>
              <button onClick={onNext}
                className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--blue)' }}>Nächste Runde</button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ---------- Eine Frage ----------
  const item = items[idx]
  if (!item) return null
  const gi = item.sentence.indexOf('___')
  const before = gi >= 0 ? item.sentence.slice(0, gi) : item.sentence
  const after = gi >= 0 ? item.sentence.slice(gi + 3) : ''
  const picked = chosen[idx]
  const revealed = picked != null
  const isCorrect = picked === item.answer

  return (
    <div className="mx-auto max-w-2xl">
      {/* Kopf mit Fortschritts-Pills */}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={handleStop} className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--ink-soft)' }}>← Beenden</button>
        <div className="flex flex-1 gap-1 items-center">
          {items.map((_, i) => {
            let bg = 'var(--line)'
            if (i < idx) bg = '#16a34a'
            else if (i === idx) bg = 'var(--blue)'
            return <div key={i} className="flex-1 h-2 rounded-full transition-all" style={{ backgroundColor: bg }} />
          })}
        </div>
        <div className="font-mono text-xs whitespace-nowrap" style={{ color: 'var(--ink-faint)' }}>{idx + 1} / {items.length}</div>
      </div>

      <div className="flex flex-col items-center py-2 sm:py-4">
        <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>{target?.name}</div>
        <h3 className="mb-4 text-xl font-bold" style={{ color: 'var(--ink)' }}>Welche Zeit passt?</h3>
        <p className="mb-5 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>
          Lies den Satz und wähle, welche Zeitform in die Lücke gehört. Das Verb steht als Infinitiv daneben.
        </p>

        {/* Satz mit Lücke */}
        <div className="mb-4 w-full rounded-2xl border p-6 text-lg" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink)', lineHeight: 2.2 }}>
          <Signalized text={before} signal={item.signal} on={revealed} />
          {revealed ? (
            <span className="mx-1 rounded-lg border-2 px-2 py-1 font-sans text-base font-semibold"
              style={{ borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.10)', color: '#15803d' }}>
              {item.solution || '—'}
            </span>
          ) : (
            <span className="mx-1 inline-block rounded-lg border-2 border-dashed px-4 py-1 align-middle"
              style={{ borderColor: 'var(--blue)', color: 'var(--blue)', minWidth: 56, textAlign: 'center' }}>?</span>
          )}
          <Signalized text={after} signal={item.signal} on={revealed} />
        </div>

        {/* Verb-Hinweis */}
        <div className="mb-6 rounded-xl border px-3.5 py-2 text-sm" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface-2)', color: 'var(--ink)' }}>
          Verb: <span style={{ fontWeight: 600 }}>{item.verb}</span>
          {item.de && <span style={{ color: 'var(--ink-faint)' }}> · {item.de}</span>}
        </div>

        {/* Optionen */}
        <div className="mb-6 flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
          {item.options.map(opt => {
            let borderColor = 'var(--line)'
            let bg = 'var(--surface)'
            let color = 'var(--ink)'
            if (revealed) {
              if (opt === item.answer) { borderColor = '#16a34a'; bg = 'rgba(22,163,74,0.10)'; color = '#15803d' }
              else if (opt === picked) { borderColor = '#ef4444'; bg = 'rgba(239,68,68,0.10)'; color = '#b91c1c' }
              else { color = 'var(--ink-faint)' }
            }
            return (
              <button key={opt} onClick={() => choose(opt)} disabled={revealed}
                className="rounded-2xl border-2 px-5 py-3 text-base font-semibold transition-colors sm:flex-1"
                style={{ borderColor, backgroundColor: bg, color, cursor: revealed ? 'default' : 'pointer', minWidth: 160 }}>
                {opt}
                {revealed && opt === item.answer && ' ✓'}
                {revealed && opt === picked && opt !== item.answer && ' ✗'}
              </button>
            )
          })}
        </div>

        {/* Feedback / Begründung */}
        {revealed && (
          <div className="mb-6 w-full rounded-2xl border p-4"
            style={{
              borderColor: isCorrect ? 'rgba(22,163,74,0.4)' : 'rgba(217,119,6,0.4)',
              backgroundColor: isCorrect ? 'rgba(22,163,74,0.07)' : 'rgba(217,119,6,0.08)',
            }}>
            <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: isCorrect ? '#15803d' : '#b45309' }}>
              {isCorrect ? '✓ Richtig' : `Richtig wäre: ${item.answer}`}
            </div>
            <div className="text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}>{item.reason || 'Diese Zeitform passt hier zum Kontext.'}</div>
          </div>
        )}

        {revealed && (
          <button onClick={next}
            className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--blue)'}>
            {idx + 1 >= items.length ? 'Übung abschließen →' : 'Weiter →'}
          </button>
        )}
      </div>
    </div>
  )
}

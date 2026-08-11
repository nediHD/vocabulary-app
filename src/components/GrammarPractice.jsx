import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { GRAMMAR } from '../lib/grammar'
import { generateGrammarCloze } from '../lib/groq'
import { Explanation, useTheory } from './Grammar'

// Alle konjugierten Verb-Zeitformen/Modi (Verben-Sektion, Gruppen Zeiten + Modi, style 'form').
function verbForms() {
  const sec = GRAMMAR.find(s => s.id === 'verben')
  if (!sec) return []
  const out = []
  for (const g of sec.groups) {
    if (g.id !== 'zeiten-indikativ' && g.id !== 'modi') continue
    for (const t of g.topics) {
      if (t.style === 'form') {
        out.push({ key: `${sec.id}/${g.id}/${t.id}`, name: t.name, section: sec, group: g, topic: t })
      }
    }
  }
  return out
}

// Zwei zufällige Formen ziehen (Fisher-Yates, Browser-Math.random ist hier ok).
function pickTwo(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, 2)
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

// Eine Zeitform mit aufklappbarer Theorie (nutzt denselben Renderer wie „Grammatik nachschlagen").
function FormTheory({ form }) {
  const [open, setOpen] = useState(false)
  const { loading, data, text } = useTheory(form.key)
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>Zeitform</span>
        <span className="flex-1 text-lg font-bold" style={{ color: 'var(--ink)' }}>{form.name}</span>
        <span className="text-sm font-medium" style={{ color: 'var(--blue)' }}>
          {open ? 'Theorie ausblenden ▴' : 'Theorie ansehen ▾'}
        </span>
      </button>
      {open && (
        <div className="mt-3">
          {loading
            ? <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line-soft)', color: 'var(--ink-soft)' }}>Lädt…</div>
            : <Explanation data={data} text={text} />}
        </div>
      )}
    </div>
  )
}

export default function GrammarPractice({ setView, setInSession }) {
  const [phase, setPhase] = useState('loading') // loading | theory | cloze | finished | error | none
  const [loadingStep, setLoadingStep] = useState('Verben werden geladen...')
  const [error, setError] = useState('')
  const [forms, setForms] = useState([])
  const [verbs, setVerbs] = useState([])
  const [cloze, setCloze] = useState(null) // { text, blanks }
  const [answers, setAnswers] = useState({})
  const [graded, setGraded] = useState(false)

  useEffect(() => {
    setInSession(true)
    load()
    return () => setInSession(false)
  }, [])

  const load = async () => {
    try {
      setPhase('loading')
      setError('')
      setGraded(false)
      setAnswers({})
      setLoadingStep('Fällige Verben werden geladen...')
      const now = new Date().toISOString()

      const { data, error: err } = await supabase
        .from('cards')
        .select('*')
        .eq('status', 'review')
        .eq('wortart', 'Verb')

      if (err) { setError('Fehler beim Laden der Verben: ' + err.message); setPhase('error'); return }

      const due = (data || []).filter(c => new Date(c.next_review_at) <= new Date(now))
      if (due.length === 0) { setPhase('none'); return }

      // durchmischen und höchstens 10 Verben nehmen, damit der Text lösbar bleibt
      const shuffled = pickN(due, 10)
      const chosenVerbs = shuffled.map(c => ({ french: c.french, german: c.german }))

      // 2 zufällige Zeitformen
      const chosenForms = pickTwo(verbForms())
      setForms(chosenForms)
      setVerbs(chosenVerbs)

      setLoadingStep('Lückentext wird erstellt...')
      const result = await generateGrammarCloze(chosenVerbs, chosenForms)
      setCloze(result)
      setPhase('theory')
    } catch (e) {
      console.error('GrammarPractice load error:', e)
      setError(e.message || 'Unerwarteter Fehler')
      setPhase('error')
    }
  }

  // n zufällige Elemente ziehen
  function pickN(arr, n) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a.slice(0, n)
  }

  const handleStop = () => {
    if (confirm('Sitzung beenden?')) { setInSession(false); setView('dashboard') }
  }

  // ---------- Zustände ----------
  if (phase === 'loading') {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--ink-soft)' }} className="mb-2">{loadingStep}</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <p className="mb-4 text-lg" style={{ color: '#ef4444' }}>{error}</p>
        <button
          onClick={load}
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

  if (phase === 'none') {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <p className="mb-4 text-lg" style={{ color: 'var(--ink-soft)' }}>Keine fälligen Verben zum Üben.</p>
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

  if (phase === 'finished') {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Sitzung abgeschlossen! 🎉</h2>
        <p className="mb-8" style={{ color: 'var(--ink-soft)' }}>Gute Arbeit beim Üben der Verbformen!</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => { setInSession(false); setView('dashboard') }}
            className="rounded-2xl border px-6 py-3 font-semibold transition-colors"
            style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--line-soft)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--surface)'}
          >
            Zur Übersicht
          </button>
          <button
            onClick={load}
            className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
          >
            Neue Übung
          </button>
        </div>
      </div>
    )
  }

  // ---------- Theorie-Vorschau ----------
  if (phase === 'theory') {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <button
          onClick={handleStop}
          className="mb-5 text-sm font-medium transition-colors"
          style={{ color: 'var(--ink-soft)' }}
          onMouseEnter={e => e.target.style.color = 'var(--ink)'}
          onMouseLeave={e => e.target.style.color = 'var(--ink-soft)'}
        >
          ← Beenden
        </button>

        <h2 className="mb-2 text-3xl font-bold" style={{ color: 'var(--ink)' }}>Grammatik üben</h2>
        <p className="mb-6 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Du übst deine fälligen Verben in diesen zwei Zeitformen. Schau dir vorher die Theorie an – tippe auf „Theorie ansehen".
        </p>

        <div className="mb-6 flex flex-col gap-3">
          {forms.map(f => <FormTheory key={f.key} form={f} />)}
        </div>

        <div className="mb-6 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface-2)' }}>
          <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
            Verben in dieser Übung ({verbs.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {verbs.map((v, i) => (
              <span key={i} className="rounded-lg border px-2.5 py-1 text-sm"
                style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }}>
                {v.french} <span style={{ color: 'var(--ink-faint)' }}>· {v.german}</span>
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => setPhase('cloze')}
          className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--blue)' }}
          onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
          onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
        >
          Übung starten →
        </button>
      </div>
    )
  }

  // ---------- Lückentext (Cloze) ----------
  if (!cloze) return null
  const correctCount = cloze.blanks.filter(b => norm(answers[b.n]) === norm(b.answer)).length

  return (
    <div className="mx-auto max-w-2xl">
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
        <div className="flex-1 text-center font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
          {forms.map(f => f.name).join('  ·  ')}
        </div>
      </div>

      <div className="flex flex-col items-center py-4 sm:py-8">
        <div className="mb-6 text-center">
          <p style={{ color: 'var(--ink-soft)' }} className="text-sm">
            Fülle die Lücken mit der richtigen Verbform. In Klammern stehen Bedeutung und Zeitform.
          </p>
        </div>

        <div
          className="mb-8 w-full rounded-2xl border p-6 text-lg"
          style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink)', lineHeight: 2.6 }}
        >
          {cloze.text.split(/(\{\{\d+\}\})/).map((part, i) => {
            const m = part.match(/^\{\{(\d+)\}\}$/)
            if (!m) return <span key={i}>{part}</span>
            const n = Number(m[1])
            const blank = cloze.blanks.find(b => b.n === n)
            if (!blank) return <span key={i}>____</span>

            const val = answers[n] || ''
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
                    type="text"
                    value={val}
                    disabled={graded}
                    onChange={e => setAnswers(prev => ({ ...prev, [n]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                    size={Math.max(6, blank.answer.length + 2)}
                    className="rounded-lg border-2 px-2 py-1 text-center font-sans text-base outline-none"
                    style={{ borderColor, backgroundColor: bg, color: 'var(--ink)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>({blank.de} · {blank.tense})</span>
                </span>
                {graded && !correct && (
                  <span className="mt-0.5 text-xs font-semibold" style={{ color: '#16a34a' }}>
                    ✓ {blank.answer}
                  </span>
                )}
                {graded && blank.note && (
                  <span className="mt-0.5 max-w-[240px] text-xs italic" style={{ color: 'var(--blue-dark)' }}>
                    ⓘ {blank.note}
                  </span>
                )}
              </span>
            )
          })}
        </div>

        {!graded ? (
          <button
            onClick={() => setGraded(true)}
            className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
          >
            Fertig
          </button>
        ) : (
          <div className="w-full max-w-sm">
            <p className="mb-4 text-center text-sm font-medium" style={{ color: 'var(--ink)' }}>
              {correctCount} / {cloze.blanks.length} richtig
            </p>
            <button
              onClick={() => setPhase('finished')}
              className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--blue)' }}
              onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
            >
              Abschließen →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

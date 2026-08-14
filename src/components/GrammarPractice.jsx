import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { GRAMMAR } from '../lib/grammar'
import { generateGrammarStoryRun, personLabel } from '../lib/groq'
import { Explanation, useTheory } from './Grammar'

const TOTAL = 7
const ALL_PERSONS = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl']

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

// n zufällige Elemente ziehen (Fisher-Yates, Browser-Math.random ist hier ok).
function pickN(arr, n) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
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

// Robuster Vergleichsschlüssel für Infinitive (Reflexivpronomen se/s' ignorieren),
// damit "se lever" und "lever" bei der Abdeckungsprüfung als gleich gelten.
function baseKey(s) {
  return (s || '').toString().toLowerCase().trim().replace(/^s['’]?\s*/, '').replace(/^se\s+/, '').trim()
}

// Lückentext eines Kapitels in Klartext auflösen (für den Story-Kontext des nächsten Kapitels).
function resolveText(text, blanks) {
  return String(text || '').replace(/\{\{(\d+)\}\}/g, (_, d) => {
    const b = blanks.find(x => x.n === Number(d))
    return b ? b.answer : '___'
  })
}

// Erzwingt: NUR erlaubte (DB-)Verben bleiben Lücken. Lücken für Verben, die nicht in
// der DB-Liste stehen, werden entfernt – ihr Platzhalter wird durch die richtige Form
// ersetzt, sodass der Text normal weiterläuft. (Das Modell blankt sonst zu viele Verben.)
function sanitizeRun(result, allowedKeys) {
  let text = String(result?.text || '')
  const kept = []
  for (const b of (result?.blanks || [])) {
    if (allowedKeys.has(baseKey(b.base))) kept.push(b)
    else text = text.split(`{{${b.n}}}`).join(b.answer) // Nicht-DB-Verb → Klartext
  }
  return { ...result, text, blanks: kept }
}

// Eine Zeitform mit aufklappbarer Theorie (nutzt denselben Renderer wie „Grammatik nachschlagen").
function FormTheory({ form }) {
  const [open, setOpen] = useState(false)
  const { loading, data, text } = useTheory(form.key)
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 text-left">
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

// Hinweis-Overlay zu einer Lücke: welche Zeitform + Person + Begründung (OHNE die Lösung).
// Zentriertes Modal mit deckendem Hintergrund, damit die Erklärung immer gut lesbar ist.
function HintPopover({ blank, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="rounded-3xl border p-7 text-left"
        style={{ width: 'min(480px, 92vw)', borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--surface)', boxShadow: '0 24px 70px rgba(0,0,0,0.35)' }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="font-mono text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>
            Warum diese Zeitform?
          </div>
          <button onClick={onClose} className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-base"
            style={{ backgroundColor: 'var(--surface-2)', color: 'var(--ink-soft)' }}>✕</button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <span className="gr-chip" style={{ fontSize: 14, padding: '4px 12px' }}>{blank.tense || 'Zeitform'}</span>
          {blank.person && (
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>
              {personLabel(blank.person)}
            </span>
          )}
        </div>
        <div className="text-[16px] leading-relaxed" style={{ color: 'var(--ink)' }}>
          {blank.reason || 'Diese Zeitform passt hier zum Kontext.'}
        </div>
      </div>
    </div>
  )
}

export default function GrammarPractice({ setView, setInSession }) {
  const [phase, setPhase] = useState('loading') // loading | theory | run | error | none | finished
  const [loadingStep, setLoadingStep] = useState('Fällige Verben werden geladen...')
  const [error, setError] = useState('')

  const [forms, setForms] = useState([])
  const [verbs, setVerbs] = useState([])

  const [chapterIndex, setChapterIndex] = useState(1)
  const [run, setRun] = useState(null) // { title, text, blanks }
  const [generating, setGenerating] = useState(false)
  const [pending, setPending] = useState(null) // { index, ctx } für Retry

  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState({}) // pro Lücke: { [n]: true } nach Enter/Auswertung
  const [openHint, setOpenHint] = useState(null)
  const [todoOpen, setTodoOpen] = useState(false)

  // Session-Kontext (für Story-Fortsetzung + Abdeckung)
  const [storyResolved, setStoryResolved] = useState('')
  const [coveredBases, setCoveredBases] = useState([]) // baseKey() der bereits als Lücke vorgekommenen Verben
  const [coveredPersons, setCoveredPersons] = useState([])

  useEffect(() => {
    setInSession(true)
    load()
    return () => setInSession(false)
  }, [])

  const load = async () => {
    try {
      setPhase('loading')
      setError('')
      setLoadingStep('Fällige Verben werden geladen...')
      const now = new Date().toISOString()

      const { data, error: err } = await supabase
        .from('cards')
        .select('*')
        .eq('wortart', 'Verb')

      if (err) { setError('Fehler beim Laden der Verben: ' + err.message); setPhase('error'); return }

      const nowMs = new Date(now).getTime()
      const all = data || []
      // Heute fällige Verben (Pflicht).
      const due = all.filter(c => c.status === 'review' && c.next_review_at && new Date(c.next_review_at).getTime() <= nowMs)
      if (due.length === 0) { setPhase('none'); return }

      // Wenn weniger als 10: mit den nächsten anstehenden Verben auffüllen
      // (nach next_review_at sortiert; Verben ohne Datum zuletzt).
      const TARGET = 10
      let pool = pickN(due, due.length)
      if (pool.length < TARGET) {
        const dueIds = new Set(due.map(c => c.id))
        const rest = all
          .filter(c => !dueIds.has(c.id))
          .sort((x, y) => {
            const tx = x.next_review_at ? new Date(x.next_review_at).getTime() : Infinity
            const ty = y.next_review_at ? new Date(y.next_review_at).getTime() : Infinity
            return tx - ty
          })
        pool = [...pool, ...rest.slice(0, TARGET - pool.length)]
      }

      const chosenVerbs = pool.map(c => ({ french: c.french, german: c.german }))
      const chosenForms = pickN(verbForms(), 2)

      setVerbs(chosenVerbs)
      setForms(chosenForms)
      setPhase('theory')
    } catch (e) {
      console.error('GrammarPractice load error:', e)
      setError(e.message || 'Unerwarteter Fehler')
      setPhase('error')
    }
  }

  const generateChapter = async (index, ctx) => {
    setPending({ index, ctx })
    setGenerating(true)
    setError('')
    try {
      // Noch nicht als Lücke vorgekommene Verben ermitteln.
      const remaining = verbs.filter(v => !ctx.coveredBases.includes(baseKey(v.french)))
      const chaptersLeft = TOTAL - index + 1
      let required
      if (remaining.length === 0) {
        // Alles abgedeckt → zur Wiederholung 1–2 bereits geübte Verben nehmen.
        required = pickN(verbs, Math.min(2, verbs.length))
      } else if (index >= TOTAL) {
        // Letztes Kapitel: alle verbliebenen Verben MÜSSEN noch rein.
        required = remaining
      } else {
        // Gleichmäßig auf die restlichen Kapitel verteilen (aber max. 5 pro Kapitel).
        const per = Math.min(5, Math.max(1, Math.ceil(remaining.length / chaptersLeft)))
        required = remaining.slice(0, per)
      }
      const requiredKeys = new Set(required.map(v => baseKey(v.french)))
      const reuse = pickN(
        verbs.filter(v => ctx.coveredBases.includes(baseKey(v.french)) && !requiredKeys.has(baseKey(v.french))),
        3,
      )
      const neededP = ALL_PERSONS.filter(p => !ctx.coveredPersons.includes(p))

      const result = await generateGrammarStoryRun({
        verbs: required, reuseVerbs: reuse, forms,
        chapterIndex: index, totalChapters: TOTAL,
        storySoFar: ctx.story,
        neededPersons: neededP,
      })
      // Nur DB-Verben als Lücken zulassen (gesamter DB-Pool = erlaubt).
      const allowedKeys = new Set(verbs.map(v => baseKey(v.french)))
      setRun(sanitizeRun(result, allowedKeys))
      setAnswers({})
      setRevealed({})
      setOpenHint(null)
      setPhase('run')
    } catch (e) {
      console.error('generateChapter error:', e)
      setError(e.message || 'Kapitel konnte nicht erstellt werden')
      setPhase('error')
    } finally {
      setGenerating(false)
    }
  }

  const startExercise = () => {
    setChapterIndex(1)
    setStoryResolved('')
    setCoveredBases([])
    setCoveredPersons([])
    setPhase('run')
    generateChapter(1, { story: '', coveredBases: [], coveredPersons: [] })
  }

  const handleNext = () => {
    const resolved = resolveText(run.text, run.blanks)
    const newStory = storyResolved ? `${storyResolved}\n\n${resolved}` : resolved
    const newBases = Array.from(new Set([...coveredBases, ...run.blanks.map(b => baseKey(b.base)).filter(Boolean)]))
    const newPersons = Array.from(new Set([...coveredPersons, ...run.blanks.map(b => b.person).filter(Boolean)]))
    setStoryResolved(newStory)
    setCoveredBases(newBases)
    setCoveredPersons(newPersons)

    if (chapterIndex >= TOTAL) { setPhase('finished'); return }
    const next = chapterIndex + 1
    setChapterIndex(next)
    generateChapter(next, { story: newStory, coveredBases: newBases, coveredPersons: newPersons })
  }

  const handleStop = () => {
    if (confirm('Sitzung beenden?')) { setInSession(false); setView('dashboard') }
  }

  // ---------- Basiszustände ----------
  if (phase === 'loading') {
    return <div className="text-center py-20"><p style={{ color: 'var(--ink-soft)' }} className="mb-2">{loadingStep}</p></div>
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <p className="mb-4 text-lg" style={{ color: '#ef4444' }}>{error}</p>
        <button
          onClick={() => (pending ? generateChapter(pending.index, pending.ctx) : load())}
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
        <button onClick={() => setView('dashboard')}
          className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--blue)' }}
          onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
          onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}>
          Zur Übersicht
        </button>
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Geschichte zu Ende! 🎉</h2>
        <p className="mb-8" style={{ color: 'var(--ink-soft)' }}>Gute Arbeit beim Üben der Verbformen!</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => { setInSession(false); setView('dashboard') }}
            className="rounded-2xl border px-6 py-3 font-semibold transition-colors"
            style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--line-soft)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--surface)'}>
            Zur Übersicht
          </button>
          <button onClick={load}
            className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}>
            Neue Geschichte
          </button>
        </div>
      </div>
    )
  }

  // ---------- Theorie-Vorschau ----------
  if (phase === 'theory') {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <button onClick={handleStop} className="mb-5 text-sm font-medium transition-colors"
          style={{ color: 'var(--ink-soft)' }}
          onMouseEnter={e => e.target.style.color = 'var(--ink)'}
          onMouseLeave={e => e.target.style.color = 'var(--ink-soft)'}>
          ← Beenden
        </button>

        <h2 className="mb-2 text-3xl font-bold" style={{ color: 'var(--ink)' }}>Grammatik üben</h2>
        <p className="mb-6 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Eine kleine Geschichte in {TOTAL} Kapiteln. Du übst deine fälligen Verben in diesen zwei Zeitformen –
          schau dir vorher die Theorie an.
        </p>

        <div className="mb-6 flex flex-col gap-3">
          {forms.map(f => <FormTheory key={f.key} form={f} />)}
        </div>

        <div className="mb-6 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface-2)' }}>
          <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
            Verben in dieser Session ({verbs.length})
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

        <button onClick={startExercise}
          className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--blue)' }}
          onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
          onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}>
          Geschichte starten →
        </button>
      </div>
    )
  }

  // ---------- Kapitel (Lückentext) ----------
  const correctCount = run ? run.blanks.filter(b => norm(answers[b.n]) === norm(b.answer)).length : 0
  const allRevealed = run ? run.blanks.every(b => revealed[b.n]) : false

  const revealBlank = (n) => setRevealed(prev => ({ ...prev, [n]: true }))
  const revealAll = () => { setOpenHint(null); setRevealed(Object.fromEntries(run.blanks.map(b => [b.n, true]))) }
  const focusNextBlank = (n) => {
    const idx = run.blanks.findIndex(b => b.n === n)
    const next = run.blanks.slice(idx + 1).find(b => !revealed[b.n])
    if (next) setTimeout(() => { const el = document.querySelector(`[data-blank="${next.n}"]`); if (el) el.focus() }, 0)
  }

  // Session-weite To-do-Liste: ALLE fälligen Verben + alle 6 Personen; Haken sobald
  // irgendwann in der Session (inkl. aktuellem Kapitel) vorgekommen.
  const runBaseKeys = run ? run.blanks.map(b => baseKey(b.base)).filter(Boolean) : []
  const runPersonCodes = run ? run.blanks.map(b => b.person).filter(Boolean) : []
  const sessBases = new Set([...coveredBases, ...runBaseKeys])
  const sessPersons = new Set([...coveredPersons, ...runPersonCodes])
  const verbsDone = verbs.filter(v => sessBases.has(baseKey(v.french))).length
  const personsDone = ALL_PERSONS.filter(p => sessPersons.has(p)).length

  return (
    <div className="mx-auto max-w-2xl">
      {/* Kopf mit Fortschritts-Pills */}
      <div className="mb-8 flex items-center gap-4">
        <button onClick={handleStop}
          className="text-sm font-medium transition-colors whitespace-nowrap"
          style={{ color: 'var(--ink-soft)' }}
          onMouseEnter={e => e.target.style.color = 'var(--ink)'}
          onMouseLeave={e => e.target.style.color = 'var(--ink-soft)'}>
          ← Beenden
        </button>
        <div className="flex flex-1 gap-1 items-center">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const chap = i + 1
            let bg = 'var(--line)'
            if (chap < chapterIndex) bg = '#16a34a'
            else if (chap === chapterIndex) bg = 'var(--blue)'
            return <div key={i} className="flex-1 h-2 rounded-full transition-all" style={{ backgroundColor: bg }} />
          })}
        </div>
        <div className="font-mono text-xs whitespace-nowrap" style={{ color: 'var(--ink-faint)' }}>
          {chapterIndex} / {TOTAL}
        </div>
      </div>

      {generating || !run ? (
        <div className="text-center py-24">
          <p style={{ color: 'var(--ink-soft)' }}>Kapitel {chapterIndex} wird geschrieben…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center py-2 sm:py-6">
          {run.title && (
            <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>
              Kapitel {chapterIndex}
            </div>
          )}
          {run.title && <h3 className="mb-4 text-xl font-bold" style={{ color: 'var(--ink)' }}>{run.title}</h3>}

          <p className="mb-5 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>
            Fülle die Lücken mit der richtigen Verbform. In Klammern steht das deutsche Wort.
            Drücke <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Enter</span> für das Ergebnis dieser Lücke.
            Tippe auf <span style={{ color: 'var(--blue)', fontWeight: 600 }}>ⓘ</span>, um Zeitform &amp; Begründung zu sehen.
          </p>

          <div className="mb-8 w-full rounded-2xl border p-6 text-lg"
            style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink)', lineHeight: 2.9 }}>
            {run.text.split(/(\{\{\d+\}\})/).map((part, i) => {
              const m = part.match(/^\{\{(\d+)\}\}$/)
              if (!m) return <span key={i}>{part}</span>
              const n = Number(m[1])
              const blank = run.blanks.find(b => b.n === n)
              if (!blank) return <span key={i}>____</span>

              const val = answers[n] || ''
              const correct = norm(val) === norm(blank.answer)
              const isRev = !!revealed[n]
              let borderColor = 'var(--blue)'
              let bg = 'white'
              if (isRev) {
                borderColor = correct ? '#16a34a' : '#ef4444'
                bg = correct ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)'
              }

              return (
                <span key={i} style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', margin: '0 3px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                    <input
                      type="text"
                      data-blank={n}
                      value={val}
                      disabled={isRev}
                      onChange={e => setAnswers(prev => ({ ...prev, [n]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (!isRev) { revealBlank(n); focusNextBlank(n) }
                        }
                      }}
                      size={Math.max(6, blank.answer.length + 2)}
                      className="rounded-lg border-2 px-2 py-1 text-center font-sans text-base outline-none"
                      style={{ borderColor, backgroundColor: bg, color: 'var(--ink)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setOpenHint(openHint === n ? null : n)}
                      title="Zeitform & Begründung"
                      className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: openHint === n ? 'var(--blue)' : 'var(--blue-tint)', color: openHint === n ? '#fff' : 'var(--blue-dark)', lineHeight: 1 }}
                    >
                      i
                    </button>
                    <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>({blank.de})</span>
                  </span>

                  {openHint === n && <HintPopover blank={blank} onClose={() => setOpenHint(null)} />}

                  {isRev && (
                    <span className="mt-0.5 text-xs font-semibold" style={{ color: correct ? '#16a34a' : '#16a34a' }}>
                      {correct ? '✓ richtig' : `✓ ${blank.answer}`}
                    </span>
                  )}
                  {isRev && blank.note && (
                    <span className="mt-0.5 max-w-[240px] text-xs italic" style={{ color: 'var(--blue-dark)' }}>ⓘ {blank.note}</span>
                  )}
                </span>
              )
            })}
          </div>

          {/* Session-Fortschritt: alle Verben + alle Personen, aufklappbar */}
          <div className="mb-8 w-full rounded-2xl border" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface-2)' }}>
            <button onClick={() => setTodoOpen(o => !o)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>
                Fortschritt der Session
              </span>
              <span className="ml-auto flex items-center gap-3 font-mono text-xs" style={{ color: 'var(--ink-faint)' }}>
                <span>Verben {verbsDone}/{verbs.length}</span>
                <span>Personen {personsDone}/{ALL_PERSONS.length}</span>
                <span style={{ transform: todoOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▸</span>
              </span>
            </button>

            {todoOpen && (
              <div className="grid gap-5 px-5 pb-5 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>Verben (alle fälligen)</div>
                  <ul className="flex flex-col gap-1.5">
                    {verbs.map((v, i) => {
                      const on = sessBases.has(baseKey(v.french))
                      return (
                        <li key={i} className="flex items-baseline gap-2 text-sm" style={{ color: on ? 'var(--ink)' : 'var(--ink-faint)' }}>
                          <span style={{ color: on ? '#16a34a' : 'var(--line)' }}>{on ? '✓' : '○'}</span>
                          <span className={on ? 'font-medium' : ''}>{v.german}</span>
                          <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>({v.french})</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>Personen</div>
                  <ul className="flex flex-col gap-1.5">
                    {ALL_PERSONS.map(code => {
                      const on = sessPersons.has(code)
                      return (
                        <li key={code} className="flex items-center gap-2 text-sm" style={{ color: on ? 'var(--ink)' : 'var(--ink-faint)' }}>
                          <span style={{ color: on ? '#16a34a' : 'var(--line)' }}>{on ? '✓' : '○'}</span>
                          <span>{personLabel(code)}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {!allRevealed ? (
            <button onClick={revealAll}
              className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--blue)' }}
              onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}>
              Alle auflösen
            </button>
          ) : (
            <div className="w-full max-w-sm">
              <p className="mb-4 text-center text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {correctCount} / {run.blanks.length} richtig
              </p>
              <button onClick={handleNext}
                className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--blue)' }}
                onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
                onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}>
                {chapterIndex >= TOTAL ? 'Geschichte abschließen →' : 'Weiter zum nächsten Kapitel →'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { orderedForms, IRREGULAR_VERBS, REGULAR_ER, REGULAR_IR, REGULAR_RE } from '../lib/grammar'
import { generateGrammarStory, conjugateVerbs, personLabel } from '../lib/groq'
import { Explanation, useTheory } from './Grammar'

const ALL_PERSONS = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl']
const NUM_PARTS = 7
const NUM_IRREGULAR = 3   // unregelmäßige Verben pro Runde (durchkonjugieren + im Lückentext)
const TARGET_DUE = 10      // so viele fällige DB-Verben pro Runde anvisieren

function pickN(arr, n) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

function baseKey(s) {
  return (s || '').toString().toLowerCase().trim().replace(/^s['’]?\s*/, '').replace(/^se\s+/, '').trim()
}

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

// Eine Zeitform mit aufklappbarer Theorie (gleicher Renderer wie „Grammatik nachschlagen").
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

const SUBJ = { '1sg': 'je', '2sg': 'tu', '3sg': 'il/elle', '1pl': 'nous', '2pl': 'vous', '3pl': 'ils/elles' }
const PERSON_ORDER = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl']

// Hebt die Endung (letzte Zeichen) farbig hervor, wenn sie zur Form passt.
function withEnding(form, ending) {
  const f = String(form || '')
  const e = String(ending || '')
  if (e && f.endsWith(e) && f.length > e.length) {
    return <>{f.slice(0, f.length - e.length)}<span className="gr-mark">{e}</span></>
  }
  return f
}

// Aktives Konjugations-Training: die 3 unregelmäßigen Verben dieser Runde
// (Formen kommen vorkonjugiert aus `rows`), alle Personen selbst ausfüllen.
function ConjugationDrill({ tenseId, tenseName, rows, answers, setAnswers }) {
  const [revealed, setRevealed] = useState({})
  const [open, setOpen] = useState(false)

  if (!rows || rows.length === 0) return null

  const k = (vi, p) => `${vi}:${p}`
  const revealOne = (vi, p) => setRevealed(prev => ({ ...prev, [k(vi, p)]: true }))
  const revealVerb = (vi, persons) => setRevealed(prev => { const c = { ...prev }; persons.forEach(p => { c[k(vi, p)] = true }); return c })
  const focusNext = (vi, persons, p) => {
    const idx = persons.indexOf(p)
    const next = persons[idx + 1]
    if (next) setTimeout(() => { const el = document.querySelector(`[data-cj="${tenseId}-${vi}-${next}"]`); if (el) el.focus() }, 0)
  }

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 text-left">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>Endungen üben</span>
        <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{rows.length} Verben in {tenseName} durchkonjugieren</span>
        <span className="text-sm font-medium" style={{ color: 'var(--blue)' }}>{open ? 'ausblenden ▴' : 'öffnen ▾'}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {rows.map((r, vi) => {
            const persons = PERSON_ORDER.filter(p => r.forms && r.forms[p] != null)
            return (
              <div key={r.verb || vi} className="rounded-xl border p-3" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
                <div className="mb-2 text-sm font-bold" style={{ color: 'var(--ink)' }}>
                  {r.verb} <span className="text-xs font-normal" style={{ color: 'var(--ink-faint)' }}>· {r.german || r.label}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {persons.map(p => {
                    const key = k(vi, p)
                    const val = answers[key] || ''
                    const isRev = !!revealed[key]
                    const form = r.forms[p]
                    const correct = norm(val) === norm(form)
                    let borderColor = 'var(--line)'
                    if (isRev) borderColor = correct ? '#16a34a' : '#ef4444'
                    return (
                      <div key={p} className="flex items-center gap-2 text-sm">
                        <span className="w-24 flex-none text-right" style={{ color: 'var(--ink-soft)' }}>{SUBJ[p]}</span>
                        <input
                          type="text"
                          data-cj={`${tenseId}-${vi}-${p}`}
                          value={val}
                          disabled={isRev}
                          onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!isRev) { revealOne(vi, p); focusNext(vi, persons, p) } } }}
                          className="w-40 rounded-lg border-2 px-2 py-1 font-sans text-base outline-none"
                          style={{ borderColor, backgroundColor: isRev ? (correct ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)') : 'white', color: 'var(--ink)' }}
                        />
                        {isRev && (
                          <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>
                            ✓ {withEnding(form, r.endings && r.endings[p])}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button onClick={() => revealVerb(vi, persons)} className="mt-2 text-xs font-medium" style={{ color: 'var(--blue)' }}>Lösung zeigen</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Zentriertes Hinweis-Overlay: Zeitform + Person + Begründung (OHNE Lösung).
function HintPopover({ blank, onClose }) {
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="rounded-3xl border p-7 text-left"
        style={{ width: 'min(480px, 92vw)', borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--surface)', boxShadow: '0 24px 70px rgba(0,0,0,0.35)' }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="font-mono text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>Warum diese Zeitform?</div>
          <button onClick={onClose} className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-base"
            style={{ backgroundColor: 'var(--surface-2)', color: 'var(--ink-soft)' }}>✕</button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <span className="gr-chip" style={{ fontSize: 14, padding: '4px 12px' }}>{blank.tense || 'Zeitform'}</span>
          {blank.person && (
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{personLabel(blank.person)}</span>
          )}
        </div>
        <div className="text-[16px] leading-relaxed" style={{ color: 'var(--ink)' }}>
          {blank.reason || 'Diese Zeitform passt hier zum Kontext.'}
        </div>
      </div>
    </div>
  )
}

// Wählt die Zielform dieser Runde nach der Form-SRS:
//  1) noch NICHT verstandene Formen (Status 'learning') – sofort wieder dran,
//  2) sonst die am stärksten überfällige Wiederhol-Form,
//  3) sonst die nächste NEUE Form in der Lern-Reihenfolge,
//  4) sonst die als Nächstes anstehende Wiederhol-Form.
export function pickTargetForm(forms, progressRows) {
  const prog = new Map((progressRows || []).map(r => [r.form_key, r]))
  const now = Date.now()
  const t = (r) => (r?.next_review_at ? new Date(r.next_review_at).getTime() : Infinity)

  const learning = forms
    .filter(f => prog.get(f.id)?.status === 'learning')
    .sort((a, b) => t(prog.get(a.id)) - t(prog.get(b.id)))
  if (learning.length) return learning[0]

  const due = forms
    .filter(f => { const p = prog.get(f.id); return p && p.status === 'review' && p.next_review_at && t(p) <= now })
    .sort((a, b) => t(prog.get(a.id)) - t(prog.get(b.id)))
  if (due.length) return due[0]

  const nextNew = forms.find(f => { const p = prog.get(f.id); return !p || p.status === 'new' })
  if (nextNew) return nextNew

  const soonest = [...forms].sort((a, b) => t(prog.get(a.id)) - t(prog.get(b.id)))
  return soonest[0] || forms[0]
}

// Speichert das Selbst-Urteil zur Zielform.
//  verstanden      → Status 'review', längeres Intervall (gilt als gelernt).
//  nicht verstanden → Status 'learning', sofort wieder fällig (NICHT gelernt).
async function gradeForm(form, understood) {
  if (!form) return
  const { data } = await supabase.from('form_progress').select('interval_days').eq('form_key', form.id).maybeSingle()
  const prev = data?.interval_days || 0
  if (understood) {
    const interval = prev >= 1 ? Math.min(prev * 2, 90) : 2
    const next = new Date(Date.now() + interval * 86400000).toISOString()
    await supabase.from('form_progress').upsert({
      form_key: form.id,
      status: 'review',
      interval_days: interval,
      next_review_at: next,
      updated_at: new Date().toISOString(),
    })
  } else {
    // Nicht verstanden: bleibt „am Üben", sofort wieder dran, Intervall zurück auf 0.
    await supabase.from('form_progress').upsert({
      form_key: form.id,
      status: 'learning',
      interval_days: 0,
      next_review_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }
}

export default function GrammarPractice({ setView, setInSession }) {
  const [phase, setPhase] = useState('loading') // loading | generating | theory | run | finished | error | none
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)          // die eine Zielform dieser Runde
  const [verbs, setVerbs] = useState([])          // fällige DB-Verben (für die Lücken)
  const [drillRows, setDrillRows] = useState([])  // 3 unregelmäßige, vorkonjugiert

  const [runs, setRuns] = useState([])
  const [runIndex, setRunIndex] = useState(0)
  const [storyTitle, setStoryTitle] = useState('')

  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState({})
  const [openHint, setOpenHint] = useState(null)
  const [todoOpen, setTodoOpen] = useState(false)
  const [graded, setGraded] = useState(false)
  const [drillAnswers, setDrillAnswers] = useState({})       // Antworten des Endungen-Drills
  const [storyScore, setStoryScore] = useState({ correct: 0, total: 0 }) // Treffer über alle Story-Teile

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
      const now = new Date().toISOString()
      const { data, error: err } = await supabase
        .from('cards')
        .select('*')
        .eq('wortart', 'Verb')

      if (err) { setError('Fehler beim Laden der Verben: ' + err.message); setPhase('error'); return }

      const nowMs = new Date(now).getTime()
      const all = data || []
      const due = all.filter(c => c.status === 'review' && c.next_review_at && new Date(c.next_review_at).getTime() <= nowMs)
      if (due.length === 0) { setPhase('none'); return }

      // Fällige DB-Verben auf 10 auffüllen (sonst die als Nächstes anstehenden).
      let pool = pickN(due, due.length)
      if (pool.length < TARGET_DUE) {
        const dueIds = new Set(due.map(c => c.id))
        const rest = all.filter(c => !dueIds.has(c.id)).sort((x, y) => {
          const tx = x.next_review_at ? new Date(x.next_review_at).getTime() : Infinity
          const ty = y.next_review_at ? new Date(y.next_review_at).getTime() : Infinity
          return tx - ty
        })
        pool = [...pool, ...rest.slice(0, TARGET_DUE - pool.length)]
      }
      const dueVerbs = pool.map(c => ({ french: c.french, german: c.german }))

      // Zielform nach Form-SRS bestimmen.
      const { data: progressRows } = await supabase.from('form_progress').select('*')
      const target = pickTargetForm(orderedForms(), progressRows || [])

      // Drill-Verben ziehen: je 1 regelmäßiges pro Endungs-Gruppe (-er, -ir, -re)
      // zum Endungen-Üben + immer 3 unregelmäßige.
      const irregulars = pickN(IRREGULAR_VERBS, NUM_IRREGULAR)
      const regulars = [
        { ...pickN(REGULAR_ER, 1)[0], label: '-er (regelmäßig)' },
        { ...pickN(REGULAR_IR, 1)[0], label: '-ir (regelmäßig)' },
        { ...pickN(REGULAR_RE, 1)[0], label: '-re (andere Endung)' },
      ]
      const drillVerbs = [
        ...regulars,
        ...irregulars.map(v => ({ ...v, label: 'unregelmäßig' })),
      ]

      setForm(target)
      setVerbs(dueVerbs)

      // ---- Übung erzeugen (Konjugationen + Geschichte) ----
      setPhase('generating')

      // 1) Alle Drill-Verben (3 regelmäßige + 3 unregelmäßige) vollständig
      //    durchkonjugieren – für den Endungen-Drill (und als Referenz).
      const rows = await conjugateVerbs({ form: target, verbs: drillVerbs })
      setDrillRows(rows)

      // 2) Geschichte erzeugen – Lücken = fällige DB-Verben + dieselben 3 Unregelmäßigen,
      //    alle in der Zielform. Die konjugierten Formen der Unregelmäßigen werden erzwungen.
      const knownForms = {}
      for (const r of rows) knownForms[baseKey(r.verb)] = r.forms

      const result = await generateGrammarStory({
        verbs: [...dueVerbs, ...irregulars],
        forms: [target],
        knownForms,
        parts: NUM_PARTS,
      })
      if (!result?.runs?.length) throw new Error('Keine Geschichte erzeugt')

      setStoryTitle(result.title || '')
      setRuns(result.runs)
      setRunIndex(0)
      setAnswers({})
      setRevealed({})
      setDrillAnswers({})
      setStoryScore({ correct: 0, total: 0 })
      setOpenHint(null)
      setPhase('theory')
    } catch (e) {
      console.error('GrammarPractice load error:', e)
      setError(e.message || 'Unerwarteter Fehler')
      setPhase('error')
    }
  }

  const startExercise = () => {
    setAnswers({})
    setRevealed({})
    setOpenHint(null)
    setRunIndex(0)
    setStoryScore({ correct: 0, total: 0 })
    setPhase('run')
  }

  const handleNext = () => {
    // aktuellen Story-Teil auswerten und zur Gesamtwertung addieren
    const run = runs[runIndex]
    if (run) {
      const correct = run.blanks.filter(b => norm(answers[b.n]) === norm(b.answer)).length
      setStoryScore(s => ({ correct: s.correct + correct, total: s.total + run.blanks.length }))
    }
    if (runIndex + 1 >= runs.length) { setPhase('finished'); return }
    setRunIndex(i => i + 1)
    setAnswers({})
    setRevealed({})
    setOpenHint(null)
  }

  const handleStop = () => {
    if (confirm('Sitzung beenden?')) { setInSession(false); setView('dashboard') }
  }

  const gradeAndFinish = async (understood) => {
    setGraded(true)
    try { await gradeForm(form, understood) } catch (e) { console.error('gradeForm error:', e) }
  }

  // ---------- Basiszustände ----------
  if (phase === 'loading') {
    return <div className="text-center py-20"><p style={{ color: 'var(--ink-soft)' }}>Fällige Verben werden geladen…</p></div>
  }

  if (phase === 'generating') {
    return (
      <div className="text-center py-24">
        <p className="mb-2" style={{ color: 'var(--ink-soft)' }}>Deine Übung wird vorbereitet…</p>
        <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Konjugationen &amp; Geschichte werden erzeugt (einen Moment).</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <p className="mb-4 text-lg" style={{ color: '#ef4444' }}>{error}</p>
        <button onClick={load}
          className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--blue)' }}
          onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
          onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}>
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
          style={{ backgroundColor: 'var(--blue)' }}>Zur Übersicht</button>
      </div>
    )
  }

  if (phase === 'finished') {
    // Endauswertung: Endungen-Drill (nur ausgefüllte Felder) + Geschichte (alle Lücken).
    let drillCorrect = 0, drillAttempted = 0
    drillRows.forEach((r, vi) => {
      ALL_PERSONS.filter(p => r.forms && r.forms[p] != null).forEach(p => {
        const val = drillAnswers[`${vi}:${p}`]
        if (val && val.trim()) {
          drillAttempted++
          if (norm(val) === norm(r.forms[p])) drillCorrect++
        }
      })
    })
    const totalCorrect = drillCorrect + storyScore.correct
    const totalItems = drillAttempted + storyScore.total
    const pct = totalItems ? Math.round((100 * totalCorrect) / totalItems) : 0
    const pctColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#b45309' : '#ef4444'

    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Geschichte zu Ende! 🎉</h2>

        {/* Ergebnis in Prozent */}
        <div className="mx-auto mb-8 max-w-sm rounded-3xl border p-6" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
          <div className="font-mono text-5xl font-bold" style={{ color: pctColor }}>{pct}%</div>
          <div className="mt-1 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>
            {totalCorrect} von {totalItems} richtig
          </div>
          <div className="mt-4 flex justify-center gap-6 text-sm" style={{ color: 'var(--ink-faint)' }}>
            <span>Konjugationen: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{drillAttempted ? `${drillCorrect}/${drillAttempted}` : '–'}</span></span>
            <span>Geschichte: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{storyScore.total ? `${storyScore.correct}/${storyScore.total}` : '–'}</span></span>
          </div>
        </div>

        {!graded ? (
          <>
            <p className="mb-2" style={{ color: 'var(--ink-soft)' }}>
              Hast du <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{form?.name}</span> verstanden?
            </p>
            <p className="mb-8 text-sm" style={{ color: 'var(--ink-faint)' }}>Dein Urteil steuert, wann diese Form wiederkommt.</p>
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
              <button onClick={load}
                className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--blue)' }}>Nächste Runde</button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ---------- Theorie-Vorschau ----------
  if (phase === 'theory') {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <button onClick={handleStop} className="mb-5 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>← Beenden</button>
        <h2 className="mb-2 text-3xl font-bold" style={{ color: 'var(--ink)' }}>Grammatik üben</h2>
        <p className="mb-6 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Diese Runde übst du <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{form?.name}</span>.
          Schau dir zuerst die Theorie an und konjugiere die Verben durch (regelmäßige Endungen -er/-ir/-re + 3 unregelmäßige) – danach folgt die Geschichte.
        </p>

        {form && (
          <div className="mb-6 flex flex-col gap-3">
            <FormTheory form={form} />
            <ConjugationDrill tenseId={form.id} tenseName={form.name} rows={drillRows} answers={drillAnswers} setAnswers={setDrillAnswers} />
          </div>
        )}

        <div className="mb-6 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface-2)' }}>
          <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
            Fällige Verben in dieser Runde ({verbs.length})
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

  // ---------- Ein Abschnitt (Run) ----------
  const run = runs[runIndex]
  if (!run) return null
  const TOTAL = runs.length

  const correctCount = run.blanks.filter(b => norm(answers[b.n]) === norm(b.answer)).length
  const allRevealed = run.blanks.every(b => revealed[b.n])
  const revealBlank = (n) => setRevealed(prev => ({ ...prev, [n]: true }))
  const revealAll = () => { setOpenHint(null); setRevealed(Object.fromEntries(run.blanks.map(b => [b.n, true]))) }
  const focusNextBlank = (n) => {
    const idx = run.blanks.findIndex(b => b.n === n)
    const next = run.blanks.slice(idx + 1).find(b => !revealed[b.n])
    if (next) setTimeout(() => { const el = document.querySelector(`[data-blank="${next.n}"]`); if (el) el.focus() }, 0)
  }

  // Session-Fortschritt kumulativ bis inkl. aktuellem Abschnitt.
  const seenBases = new Set()
  const seenPersons = new Set()
  runs.slice(0, runIndex + 1).forEach(r => r.blanks.forEach(b => {
    if (b.base) seenBases.add(baseKey(b.base))
    if (b.person) seenPersons.add(b.person)
  }))
  const verbsDone = verbs.filter(v => seenBases.has(baseKey(v.french))).length
  const personsDone = ALL_PERSONS.filter(p => seenPersons.has(p)).length

  const canProceed = run.blanks.length === 0 || allRevealed

  return (
    <div className="mx-auto max-w-2xl">
      {/* Kopf mit Fortschritts-Pills */}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={handleStop} className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--ink-soft)' }}>← Beenden</button>
        <div className="flex flex-1 gap-1 items-center">
          {runs.map((_, i) => {
            let bg = 'var(--line)'
            if (i < runIndex) bg = '#16a34a'
            else if (i === runIndex) bg = 'var(--blue)'
            return <div key={i} className="flex-1 h-2 rounded-full transition-all" style={{ backgroundColor: bg }} />
          })}
        </div>
        <div className="font-mono text-xs whitespace-nowrap" style={{ color: 'var(--ink-faint)' }}>{runIndex + 1} / {TOTAL}</div>
      </div>

      <div className="flex flex-col items-center py-2 sm:py-4">
        {storyTitle && <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>{storyTitle}</div>}
        <h3 className="mb-4 text-xl font-bold" style={{ color: 'var(--ink)' }}>Teil {runIndex + 1} · {form?.name}</h3>

        <p className="mb-5 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>
          Fülle die Lücken mit der richtigen Verbform. In Klammern steht das deutsche Wort.
          Drücke <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Enter</span> für das Ergebnis dieser Lücke.
          Tippe auf <span style={{ color: 'var(--blue)', fontWeight: 600 }}>ⓘ</span> für Zeitform &amp; Begründung.
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
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!isRev) { revealBlank(n); focusNextBlank(n) } } }}
                    size={Math.max(6, blank.answer.length + 2)}
                    className="rounded-lg border-2 px-2 py-1 text-center font-sans text-base outline-none"
                    style={{ borderColor, backgroundColor: bg, color: 'var(--ink)' }}
                  />
                  <button type="button" onClick={() => setOpenHint(openHint === n ? null : n)} title="Zeitform & Begründung"
                    className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: openHint === n ? 'var(--blue)' : 'var(--blue-tint)', color: openHint === n ? '#fff' : 'var(--blue-dark)', lineHeight: 1 }}>i</button>
                  <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>({blank.de})</span>
                </span>

                {openHint === n && <HintPopover blank={blank} onClose={() => setOpenHint(null)} />}

                {isRev && (
                  <span className="mt-0.5 text-xs font-semibold" style={{ color: '#16a34a' }}>{correct ? '✓ richtig' : `✓ ${blank.answer}`}</span>
                )}
                {isRev && blank.note && (
                  <span className="mt-0.5 max-w-[240px] text-xs italic" style={{ color: 'var(--blue-dark)' }}>ⓘ {blank.note}</span>
                )}
              </span>
            )
          })}
        </div>

        {/* Session-Fortschritt (aufklappbar) */}
        <div className="mb-8 w-full rounded-2xl border" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface-2)' }}>
          <button onClick={() => setTodoOpen(o => !o)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>Fortschritt der Session</span>
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
                    const on = seenBases.has(baseKey(v.french))
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
                    const on = seenPersons.has(code)
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

        {!canProceed ? (
          <button onClick={revealAll}
            className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}>
            Alle auflösen
          </button>
        ) : (
          <div className="w-full max-w-sm">
            {run.blanks.length > 0 && (
              <p className="mb-4 text-center text-sm font-medium" style={{ color: 'var(--ink)' }}>{correctCount} / {run.blanks.length} richtig</p>
            )}
            <button onClick={handleNext}
              className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--blue)' }}
              onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}>
              {runIndex + 1 >= TOTAL ? 'Geschichte abschließen →' : 'Weiter zum nächsten Teil →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

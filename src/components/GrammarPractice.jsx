import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Explanation, Marked, useTheory } from './Grammar'
import { generateGrammarSet, gradeOpenAnswer, explainGrammarWrong } from '../lib/groq'
import { buildQueue, nextSchedule, topicMode, todayStr, MAX_NEW_PER_DAY, targetPosForItem, splitWords } from '../lib/grammarSrs'

// ── Antwortprüfung: Akzente streng, aber Groß/Klein, Bindestriche & Satzzeichen egal ──
function norm(s) {
  return String(s || '')
    .trim().toLowerCase()
    .replace(/[-–—]/g, '')
    .replace(/[.,;:!?»«""''`()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
const eq = (a, b) => norm(a).length > 0 && norm(a) === norm(b)

// ── Sonderzeichen-Knöpfe (nur Desktop) ──
let activeField = null
function AInput({ value, onChange, className, style, ...rest }) {
  const ref = useRef(null)
  return (
    <input ref={ref} value={value}
      onFocus={() => { activeField = ref.current }}
      onChange={e => onChange(e.target.value)}
      className={className} style={style} {...rest} />
  )
}
function insertAccent(ch) {
  const el = activeField
  if (!el) return
  const s = el.selectionStart ?? el.value.length
  const e = el.selectionEnd ?? el.value.length
  const nv = el.value.slice(0, s) + ch + el.value.slice(e)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, nv)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  requestAnimationFrame(() => { el.focus(); const p = s + ch.length; el.setSelectionRange(p, p) })
}
const ACCENTS = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'ù', 'û', 'œ']
function AccentBar() {
  return (
    <div className="hidden sm:flex flex-wrap gap-1 mb-3">
      {ACCENTS.map(c => (
        <button key={c} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insertAccent(c)}
          className="rounded-lg border px-2.5 py-1 font-mono text-sm"
          style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }}>{c}</button>
      ))}
    </div>
  )
}

// Übersetzung der DB-Wörter, die in der Übung vorkommen
function wordHints(text, words) {
  const low = String(text || '').toLowerCase()
  return (words || []).filter(w => {
    const base = String(w.french || '').toLowerCase().replace(/^(le |la |les |un |une |l'|des )/, '').trim()
    return base.length > 1 && low.includes(base)
  })
}
function WordHints({ texts, words }) {
  const joined = texts.join(' ')
  const hits = wordHints(joined, words)
  if (hits.length === 0) return null
  const seen = new Set(), uniq = []
  for (const w of hits) { if (!seen.has(w.french)) { seen.add(w.french); uniq.push(w) } }
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--ink-faint)' }}>
      {uniq.map((w, i) => <span key={i}>📖 {w.french} = {w.german}</span>)}
    </div>
  )
}

const cardStyle = { borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface-2)' }
function Num({ i }) {
  return <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full font-mono text-[10px] font-bold text-white" style={{ background: 'var(--aurora-grad)' }}>{i + 1}</span>
}
function typeBadge(t) {
  const m = { choice: 'Auswahl', cloze: 'Lücke', table: 'Tabelle', transform: 'Umformen', open: 'Frei · KI' }
  return m[t] || t
}

// ── Einzel-Übungen (melden Ergebnis via onResult) ──
function ChoiceEx({ ex, i, words, onResult }) {
  const [picked, setPicked] = useState(null)
  const [checked, setChecked] = useState(false)
  const ok = checked && picked === ex.correct
  const check = () => { setChecked(true); onResult({ frac: picked === ex.correct ? 1 : 0, weight: 1, type: 'choice', prompt: ex.prompt, correctText: ex.options[ex.correct], userText: ex.options[picked] }) }
  return (
    <ExShell i={i} badge="choice" ex={ex} words={words} texts={[ex.prompt, ...ex.options]}>
      <div className="mb-3 flex flex-col gap-2">
        {ex.options.map((o, idx) => {
          const isP = picked === idx, isC = idx === ex.correct
          let bd = 'var(--line-soft)', bg = 'var(--surface)'
          if (checked) { if (isC) { bd = '#12a45a'; bg = 'rgba(18,164,90,0.10)' } else if (isP) { bd = '#e0564f'; bg = 'rgba(224,86,79,0.10)' } }
          else if (isP) { bd = 'var(--blue)'; bg = 'var(--blue-tint)' }
          return (
            <button key={idx} onClick={() => !checked && setPicked(idx)} disabled={checked}
              className="rounded-xl border px-3.5 py-2 text-left text-sm" style={{ borderColor: bd, backgroundColor: bg, color: 'var(--ink)' }}>
              {o}{checked && isC && <span className="ml-1.5 font-semibold" style={{ color: '#12a45a' }}>✓</span>}{checked && isP && !isC && <span className="ml-1.5 font-semibold" style={{ color: '#e0564f' }}>✗</span>}
            </button>
          )
        })}
      </div>
      {!checked ? <CheckBtn can={picked != null} onClick={check} /> : <Explain ok={ok} explain={ex.explain} />}
    </ExShell>
  )
}

function ClozeEx({ ex, i, words, showHints, onResult }) {
  const [vals, setVals] = useState({})
  const [checked, setChecked] = useState(false)
  const parts = String(ex.prompt).split(/_{2,}|_/)
  const nB = Math.min(ex.blanks.length, Math.max(1, parts.length - 1))
  const allFilled = Array.from({ length: nB }).every((_, k) => (vals[k] || '').trim().length > 0)
  const check = () => {
    let c = 0
    for (let k = 0; k < nB; k++) { if (eq(vals[k], ex.blanks[k].answer)) c++ }
    setChecked(true)
    onResult({ frac: c / nB, weight: ex.weight || 2, type: 'cloze', prompt: ex.prompt, correctText: ex.blanks.slice(0, nB).map(b => b.answer).join(' / '), userText: Array.from({ length: nB }).map((_, k) => vals[k] || '—').join(' / ') })
  }
  return (
    <ExShell i={i} badge="cloze" ex={ex} words={words} texts={[ex.prompt, ...ex.blanks.map(b => b.answer)]}>
      <div className="mb-2 text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}>
        {parts.map((seg, k) => {
          const b = ex.blanks[k]
          const res = checked && b ? eq(vals[k], b.answer) : null
          return (
            <span key={k}>
              {seg}
              {k < nB && (
                <AInput value={vals[k] || ''} onChange={v => setVals(s => ({ ...s, [k]: v }))} disabled={checked} placeholder="…"
                  className="mx-1 inline-block rounded-lg border px-2 py-0.5 font-semibold outline-none"
                  style={{ minWidth: 84, width: `${Math.max(84, (vals[k] || '').length * 11 + 24)}px`, borderColor: checked ? (res ? '#12a45a' : '#e0564f') : 'var(--blue)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }} />
              )}
            </span>
          )
        })}
      </div>
      {showHints && !checked && ex.blanks.some(b => b.hint) && (
        <div className="mb-1 font-mono text-xs" style={{ color: 'var(--ink-faint)' }}>💡 {ex.blanks.filter(b => b.hint).map(b => b.hint).join(' · ')}</div>
      )}
      {!checked ? <CheckBtn can={allFilled} onClick={check} />
        : <div className="space-y-1.5"><Explain ok={Array.from({ length: nB }).every((_, k) => eq(vals[k], ex.blanks[k].answer))} explain={ex.explain} />
          <div className="text-sm" style={{ color: 'var(--ink)' }}>Richtig: {ex.blanks.slice(0, nB).map((b, k) => <span key={k} className="font-mono font-semibold" style={{ color: 'var(--blue-dark)' }}><Marked text={b.display || b.answer} />{k < nB - 1 ? ' · ' : ''}</span>)}</div>
        </div>}
    </ExShell>
  )
}

function TableEx({ ex, i, words, onResult }) {
  const [vals, setVals] = useState({})
  const [checked, setChecked] = useState(false)
  const allFilled = ex.rows.every(r => (vals[r.p] || '').trim().length > 0)
  const check = () => {
    let c = 0
    ex.rows.forEach(r => { if (eq(vals[r.p], r.answer)) c++ })
    setChecked(true)
    onResult({ frac: c / ex.rows.length, weight: ex.weight || 3, type: 'table', prompt: `Konjugation: ${ex.label || ex.verb}`, correctText: ex.rows.map(r => `${r.p} ${r.answer}`).join(', '), userText: ex.rows.map(r => `${r.p} ${vals[r.p] || '—'}`).join(', ') })
  }
  return (
    <ExShell i={i} badge="table" ex={ex} words={words} texts={[ex.label, ex.verb]}>
      <div className="mb-2 text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>Konjugiere: <span style={{ color: 'var(--blue-dark)' }}>{ex.label || ex.verb}</span></div>
      <div className="flex flex-col gap-2">
        {ex.rows.map(r => {
          const res = checked ? eq(vals[r.p], r.answer) : null
          return (
            <div key={r.p} className="flex items-center gap-2">
              <span className="w-20 flex-none font-mono text-sm" style={{ color: 'var(--ink-soft)' }}>{r.p}</span>
              <AInput value={vals[r.p] || ''} onChange={v => setVals(s => ({ ...s, [r.p]: v }))} disabled={checked} placeholder="…"
                className="flex-1 rounded-lg border px-2.5 py-1 font-mono text-sm outline-none"
                style={{ borderColor: checked ? (res ? '#12a45a' : '#e0564f') : 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }} />
              {checked && !res && <span className="w-24 flex-none font-mono text-sm font-semibold" style={{ color: 'var(--blue-dark)' }}><Marked text={r.display || r.answer} /></span>}
            </div>
          )
        })}
      </div>
      <div className="mt-3">{!checked ? <CheckBtn can={allFilled} onClick={check} /> : <Explain ok={ex.rows.every(r => eq(vals[r.p], r.answer))} explain={ex.explain} />}</div>
    </ExShell>
  )
}

function TransformEx({ ex, i, words, showHints, onResult }) {
  const [input, setInput] = useState('')
  const [checked, setChecked] = useState(false)
  const ok = checked && eq(input, ex.answer)
  const check = () => { setChecked(true); onResult({ frac: eq(input, ex.answer) ? 1 : 0, weight: ex.weight || 3, type: 'transform', prompt: ex.prompt, correctText: ex.answer, userText: input }) }
  return (
    <ExShell i={i} badge="transform" ex={ex} words={words} texts={[ex.prompt, ex.answer]}>
      {showHints && ex.hint && !checked && <div className="mb-1 font-mono text-xs" style={{ color: 'var(--ink-faint)' }}>💡 {ex.hint}</div>}
      <AInput value={input} onChange={setInput} disabled={checked && ok} placeholder="Deine Umformung…"
        className="mb-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
        style={{ borderColor: checked ? (ok ? '#12a45a' : '#e0564f') : 'var(--blue)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }} />
      {!checked ? <CheckBtn can={input.trim().length > 0} onClick={check} />
        : <div className="space-y-1.5"><Explain ok={ok} explain={ex.explain} />{!ok && <div className="text-sm" style={{ color: 'var(--ink)' }}>Richtig: <span className="font-mono font-semibold" style={{ color: 'var(--blue-dark)' }}><Marked text={ex.answer_display || ex.answer} /></span></div>}</div>}
    </ExShell>
  )
}

function OpenEx({ ex, i, words, item, onResult }) {
  const [input, setInput] = useState('')
  const [state, setState] = useState('idle') // idle | grading | done
  const [res, setRes] = useState(null)
  const check = async () => {
    setState('grading')
    const r = await gradeOpenAnswer({ path: `${item.sectionName} › ${item.groupName}`, topic: item.name, prompt: ex.prompt, sample: ex.sample, userAnswer: input })
    setRes(r); setState('done')
    onResult({ frac: r.correct ? 1 : 0, weight: ex.weight || 3, type: 'open', prompt: ex.prompt, correctText: ex.sample, userText: input })
  }
  return (
    <ExShell i={i} badge="open" ex={ex} words={words} texts={[ex.prompt, ex.sample]}>
      <AInput value={input} onChange={setInput} disabled={state !== 'idle'} placeholder="Dein Satz auf Französisch…"
        className="mb-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
        style={{ borderColor: state === 'done' ? (res?.correct ? '#12a45a' : '#e0564f') : 'var(--blue)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }} />
      {state === 'idle' && <CheckBtn can={input.trim().length > 0} onClick={check} />}
      {state === 'grading' && <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>✨ KI bewertet…</div>}
      {state === 'done' && (
        <div className="space-y-1.5">
          <div className="text-sm font-semibold" style={{ color: res.correct ? '#12a45a' : '#c0453f' }}>{res.correct ? 'Richtig ✓' : 'Nicht ganz ✗'}</div>
          {res.feedback && <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--blue-tint)', color: 'var(--ink)' }}>{res.feedback}</div>}
          {ex.sample && <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>Beispiel: {ex.sample}</div>}
        </div>
      )}
    </ExShell>
  )
}

function ExShell({ i, badge, ex, words, texts, children }) {
  return (
    <div className="rounded-2xl border p-4" style={cardStyle}>
      <div className="mb-2 flex items-start gap-2">
        <Num i={i} />
        <div className="min-w-0 flex-1">
          <span className="mb-1 inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold" style={{ backgroundColor: 'var(--blue-tint)', color: 'var(--blue-dark)' }}>{typeBadge(badge)}</span>
          {ex.prompt && badge !== 'table' && badge !== 'cloze' && <div className="text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}>{ex.prompt}</div>}
        </div>
      </div>
      {children}
      <WordHints texts={texts} words={words} />
    </div>
  )
}
function CheckBtn({ can, onClick }) {
  return <button onClick={onClick} disabled={!can} className="rounded-xl px-4 py-1.5 text-sm font-semibold text-white" style={{ backgroundColor: can ? 'var(--blue)' : 'var(--ink-faint)', cursor: can ? 'pointer' : 'not-allowed' }}>Prüfen</button>
}
function Explain({ ok, explain }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold" style={{ color: ok ? '#12a45a' : '#c0453f' }}>{ok ? 'Richtig ✓' : 'Nicht ganz ✗'}</div>
      {explain && <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--blue-tint)', color: 'var(--ink)' }}>{explain}</div>}
    </div>
  )
}
function Exercise({ ex, i, words, item, showHints, onResult }) {
  const common = { ex, i, words, onResult }
  if (ex.type === 'choice') return <ChoiceEx {...common} />
  if (ex.type === 'table') return <TableEx {...common} />
  if (ex.type === 'transform') return <TransformEx {...common} showHints={showHints} />
  if (ex.type === 'open') return <OpenEx {...common} item={item} />
  return <ClozeEx {...common} showHints={showHints} />
}

// ── Übungsrunde ──
function Runner({ exercises, words, item, showHints, ctaLabel, onDone }) {
  const [results, setResults] = useState(() => exercises.map(() => null))
  const answered = results.filter(Boolean).length
  const onResult = useCallback((idx, r) => setResults(prev => { if (prev[idx]) return prev; const n = [...prev]; n[idx] = r; return n }), [])
  return (
    <div>
      <AccentBar />
      <div className="space-y-3">
        {exercises.map((ex, idx) => <Exercise key={idx} ex={ex} i={idx} words={words} item={item} showHints={showHints} onResult={r => onResult(idx, r)} />)}
      </div>
      <div className="mt-4 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>{answered} / {exercises.length} beantwortet</div>
      <button onClick={() => onDone(results.map((r, k) => r || { frac: 0, weight: exercises[k].weight || 1, type: exercises[k].type, prompt: exercises[k].prompt || '', correctText: '', userText: '(nicht beantwortet)' }))}
        disabled={answered < exercises.length}
        className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold text-white"
        style={{ background: answered < exercises.length ? 'var(--ink-faint)' : 'var(--aurora-grad)', cursor: answered < exercises.length ? 'not-allowed' : 'pointer' }}>{ctaLabel}</button>
    </div>
  )
}

// „Warum falsch?"-Zeile in der Auswertung
function WrongItem({ item, r }) {
  const [exp, setExp] = useState('')
  const [loading, setLoading] = useState(false)
  const ask = async () => {
    setLoading(true)
    try { setExp(await explainGrammarWrong({ path: `${item.sectionName} › ${item.groupName}`, topic: item.name, prompt: r.prompt, correct: r.correctText, userAnswer: r.userText })) }
    catch { setExp('Erklärung nicht möglich.') }
    finally { setLoading(false) }
  }
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface-2)' }}>
      <div className="text-sm" style={{ color: 'var(--ink)' }}>{r.prompt}</div>
      <div className="mt-1 text-xs" style={{ color: '#c0453f' }}>Deine Antwort: {r.userText || '—'}</div>
      <div className="text-xs" style={{ color: '#12a45a' }}>Richtig: {r.correctText || '—'}</div>
      {exp
        ? <div className="mt-2 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--blue-tint)', color: 'var(--ink)' }}>{exp}</div>
        : <button onClick={ask} disabled={loading} className="mt-2 rounded-lg border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'var(--blue-tint-line)', color: 'var(--blue-dark)', backgroundColor: 'var(--blue-tint)' }}>{loading ? 'KI erklärt…' : '🤖 Warum falsch?'}</button>}
    </div>
  )
}

const LoadCard = ({ label }) => (
  <div className="rounded-3xl border p-8 text-center" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink-soft)' }}>
    <div className="mb-2 text-2xl">✨</div>{label}
  </div>
)
const ErrCard = ({ msg, onRetry }) => (
  <div className="rounded-3xl border p-6" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
    <div className="mb-3 text-sm" style={{ color: '#c0453f' }}>{msg}</div>
    <button onClick={onRetry} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--blue)' }}>Erneut versuchen</button>
  </div>
)

async function genMany(item, words, target, withHints) {
  const { targetWords, contextWords } = splitWords(words, targetPosForItem(item))
  const acc = []
  let guard = 0
  while (acc.length < target && guard++ < 3) {
    const batch = await generateGrammarSet({
      path: `${item.sectionName} › ${item.groupName}`, topic: item.name, style: item.style,
      targetWords, contextWords, words, count: Math.min(10, target - acc.length), withHints,
    })
    acc.push(...batch)
  }
  return acc.slice(0, target)
}

// ── Ein Thema durcharbeiten ──
function TopicSession({ item, progressRow, words, index, total, onFinish }) {
  const mode = topicMode(progressRow) // 'guided' | 'test'
  const theory = useTheory(item.key)
  const [stage, setStage] = useState(mode === 'guided' ? 'theory' : 'test')
  const [learnEx, setLearnEx] = useState(null)
  const [testEx, setTestEx] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [score, setScore] = useState(0)
  const [wrong, setWrong] = useState([])

  const testCount = mode === 'guided' ? 10 : 20

  // Testmenge direkt laden, wenn Testmodus
  useEffect(() => {
    if (mode === 'test') startTest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startLearn = async () => {
    setBusy(true); setErr('')
    try { setLearnEx(await genMany(item, words, 10, true)); setStage('learn') }
    catch (e) { setErr(e.message || 'Fehler beim Erstellen der Übungen.') }
    finally { setBusy(false) }
  }
  const startTest = async () => {
    setBusy(true); setErr('')
    try { setTestEx(await genMany(item, words, testCount, false)); setStage('test') }
    catch (e) { setErr(e.message || 'Fehler beim Erstellen der Übungen.') }
    finally { setBusy(false) }
  }

  const finishTest = (results) => {
    const tw = results.reduce((a, r) => a + (r.weight || 1), 0)
    const gw = results.reduce((a, r) => a + (r.frac || 0) * (r.weight || 1), 0)
    const sc = tw ? Math.round((gw / tw) * 100) : 0
    setScore(sc)
    setWrong(results.filter(r => (r.frac || 0) < 1))
    setStage('result')
  }

  const header = (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>{item.sectionName} · Thema {index + 1}/{total}</span>
        <span className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold" style={{ backgroundColor: mode === 'guided' ? 'var(--blue-tint)' : 'rgba(18,164,90,0.12)', color: mode === 'guided' ? 'var(--blue-dark)' : '#12a45a' }}>{mode === 'guided' ? 'Lernen' : 'Wiederholung'}</span>
      </div>
      <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{item.name}</h2>
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl py-6">
      {header}

      {stage === 'theory' && (
        <>
          {theory.loading ? <LoadCard label="Lädt…" /> : <Explanation data={theory.data} text={theory.text} />}
          {err && <div className="mt-3"><ErrCard msg={err} onRetry={startLearn} /></div>}
          <button onClick={startLearn} disabled={busy} className="mt-5 w-full rounded-2xl py-3 text-sm font-semibold text-white" style={{ background: 'var(--aurora-grad)' }}>
            {busy ? 'Übungen werden erstellt…' : 'Übungen erzeugen →'}
          </button>
        </>
      )}

      {stage === 'learn' && learnEx && (
        <>
          <div className="mb-4"><Explanation data={theory.data} text={theory.text} /></div>
          <div className="mb-2 font-semibold" style={{ color: 'var(--ink)' }}>✏️ Übung mit Hinweisen</div>
          <Runner exercises={learnEx} words={words} item={item} showHints={true} ctaLabel={busy ? 'Test wird erstellt…' : 'Weiter zum Test →'} onDone={startTest} />
        </>
      )}

      {stage === 'test' && (
        busy || !testEx
          ? <LoadCard label="Test wird erstellt…" />
          : err
            ? <ErrCard msg={err} onRetry={startTest} />
            : <>
              <div className="mb-2 font-semibold" style={{ color: 'var(--ink)' }}>🎯 Test {mode === 'guided' ? '(ohne Hinweise)' : ''} · {testEx.length} Aufgaben</div>
              <Runner exercises={testEx} words={words} item={item} showHints={false} ctaLabel="Auswerten →" onDone={finishTest} />
            </>
      )}

      {stage === 'result' && (
        <div>
          <div className="rounded-3xl border p-6 text-center" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
            <div className="font-mono text-5xl font-bold" style={{ color: score >= 80 ? '#12a45a' : '#c0453f' }}>{score}%</div>
            <div className="mt-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{score >= 80 ? 'Verstanden ✓ — kommt in die Wiederholung' : 'Noch nicht (unter 80%) — morgen nochmal mit Hinweisen'}</div>
          </div>
          {wrong.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 font-semibold" style={{ color: 'var(--ink)' }}>Das war falsch:</div>
              <div className="space-y-2">{wrong.map((r, k) => <WrongItem key={k} item={item} r={r} />)}</div>
            </div>
          )}
          <button onClick={() => onFinish(score >= 80, score)} className="mt-6 w-full rounded-2xl py-3 text-sm font-semibold text-white" style={{ background: 'var(--aurora-grad)' }}>
            {index + 1 < total ? 'Nächstes Thema →' : 'Session beenden →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Hauptkomponente: Tagesplan ──
export default function GrammarPractice({ setView }) {
  const [phase, setPhase] = useState('loading')
  const [rows, setRows] = useState([])
  const [words, setWords] = useState([])
  const [plan, setPlan] = useState(null)
  const [idx, setIdx] = useState(0)
  const [stats, setStats] = useState({ done: 0, passed: 0 })

  const load = async () => {
    setPhase('loading')
    const [{ data: pr }, { data: wd }] = await Promise.all([
      supabase.from('grammar_progress').select('*'),
      supabase.from('cards').select('german, french, status, wortart, genus, verbgruppe').eq('status', 'review').limit(80),
    ])
    const progress = pr || []
    setRows(progress)
    setWords(wd || [])
    setPlan(buildQueue(progress, new Date()))
    setPhase('overview')
  }
  useEffect(() => { load() }, [])

  const pickWords = () => {
    if (words.length <= 12) return words
    const start = Math.floor((Date.now() / 1000) % Math.max(1, words.length - 12))
    return words.slice(start, start + 12)
  }

  const finishTopic = async (passed, score) => {
    const item = plan.queue[idx]
    const prev = rows.find(r => r.topic_key === item.key)
    const sched = nextSchedule(prev, passed)
    const next = new Date(Date.now() + sched.days * 86400000).toISOString()
    await supabase.from('grammar_progress').upsert({
      topic_key: item.key, status: sched.status, box: sched.box, last_score: score,
      attempts: (prev?.attempts || 0) + 1, next_review_at: next, updated_at: new Date().toISOString(),
    }, { onConflict: 'topic_key' })
    setStats(s => ({ done: s.done + 1, passed: s.passed + (passed ? 1 : 0) }))
    if (idx + 1 < plan.queue.length) setIdx(idx + 1)
    else setPhase('done')
  }

  if (phase === 'loading') return <div className="mx-auto max-w-2xl py-10"><LoadCard label="Lädt…" /></div>

  if (phase === 'overview') {
    const c = plan?.counts || { due: 0, newRemaining: 0 }
    const total = plan?.queue.length || 0
    return (
      <div className="mx-auto max-w-2xl py-8">
        <button onClick={() => setView('dashboard')} className="mb-5 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>← Zur Übersicht</button>
        <h1 className="mb-2 text-3xl font-bold" style={{ color: 'var(--ink)' }}>Grammatik heute</h1>
        <p className="mb-6 text-sm" style={{ color: 'var(--ink-soft)' }}>Zufällige Themen · max. {MAX_NEW_PER_DAY} neue pro Tag · Wiederholungen unbegrenzt.</p>
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
            <div className="font-mono text-3xl font-semibold" style={{ color: 'var(--ink)' }}>{c.due}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>Wiederholungen fällig</div>
          </div>
          <div className="aurora-cta rounded-3xl border-0 p-5">
            <div className="font-mono text-3xl font-semibold">{plan?.fresh.length || 0}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider opacity-80">Neue Themen heute</div>
          </div>
        </div>
        {total === 0
          ? <div className="rounded-3xl border p-8 text-center" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink-soft)' }}>Heute ist alles erledigt 🎉<br />Komm morgen für neue Themen & Wiederholungen wieder.</div>
          : <button onClick={() => { setIdx(0); setStats({ done: 0, passed: 0 }); setPhase('session') }} className="aurora-cta lift w-full rounded-2xl px-6 py-4 font-semibold text-white">Los geht's — {total} {total === 1 ? 'Thema' : 'Themen'} →</button>}
      </div>
    )
  }

  if (phase === 'session') {
    const item = plan.queue[idx]
    const prev = rows.find(r => r.topic_key === item.key)
    return <TopicSession key={item.key} item={item} progressRow={prev} words={pickWords()} index={idx} total={plan.queue.length} onFinish={finishTopic} />
  }

  // done
  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="rounded-3xl border p-8 text-center" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
        <div className="mb-2 text-4xl">🎉</div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>Session fertig</h2>
        <p className="mt-2" style={{ color: 'var(--ink-soft)' }}>{stats.passed} von {stats.done} Themen verstanden (≥ 80 %).</p>
      </div>
      <button onClick={() => setView('dashboard')} className="mt-6 w-full rounded-2xl border py-3 text-sm font-semibold" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--blue)' }}>Zur Übersicht</button>
    </div>
  )
}

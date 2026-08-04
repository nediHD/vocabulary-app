import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { GRAMMAR } from '../lib/grammar'
import { generateGrammarExercises } from '../lib/groq'

// ── Antwort-Normalisierung für Lückentext ──
function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?»«"'’`(){}\[\]]/g, '')
    .replace(/\s+/g, ' ')
}
function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// ── Eine einzelne Übung (Lücke oder Auswahl) mit eigenem Zustand ──
function Exercise({ ex, index }) {
  const [input, setInput] = useState('')
  const [picked, setPicked] = useState(null)
  const [checked, setChecked] = useState(false)

  // Ergebnis bestimmen
  let ok = false
  let accentHint = false
  if (checked) {
    if (ex.type === 'choice') {
      ok = picked === ex.correct
    } else {
      const a = norm(input)
      const b = norm(ex.answer)
      if (a === b) ok = true
      else if (stripAccents(a) === stripAccents(b) && a.length) { ok = true; accentHint = true }
    }
  }

  const canCheck = ex.type === 'choice' ? picked != null : input.trim().length > 0

  const parts = ex.type === 'cloze' ? String(ex.prompt).split(/_{2,}|_/) : null

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface-2)' }}
    >
      <div className="mb-3 flex items-start gap-2">
        <span
          className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full font-mono text-[10px] font-bold text-white"
          style={{ background: 'var(--aurora-grad)' }}
        >
          {index + 1}
        </span>

        {ex.type === 'cloze' ? (
          <div className="text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}>
            {parts[0]}
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canCheck) setChecked(true) }}
              disabled={checked && ok}
              placeholder="…"
              className="mx-1 inline-block rounded-lg border px-2 py-0.5 font-semibold outline-none"
              style={{
                minWidth: '90px',
                width: `${Math.max(90, input.length * 11 + 28)}px`,
                borderColor: checked ? (ok ? '#12a45a' : '#e0564f') : 'var(--blue)',
                backgroundColor: 'var(--surface)',
                color: 'var(--ink)',
              }}
            />
            {parts.slice(1).join(' ')}
          </div>
        ) : (
          <div className="text-[15px] leading-relaxed font-medium" style={{ color: 'var(--ink)' }}>
            {ex.prompt}
          </div>
        )}
      </div>

      {/* Auswahl-Optionen */}
      {ex.type === 'choice' && (
        <div className="mb-3 flex flex-col gap-2 pl-7">
          {ex.options.map((o, i) => {
            const isPicked = picked === i
            const isCorrect = i === ex.correct
            let bd = 'var(--line-soft)', bg = 'var(--surface)', col = 'var(--ink)'
            if (checked) {
              if (isCorrect) { bd = '#12a45a'; bg = 'rgba(18,164,90,0.10)'; col = 'var(--ink)' }
              else if (isPicked) { bd = '#e0564f'; bg = 'rgba(224,86,79,0.10)'; col = 'var(--ink)' }
            } else if (isPicked) { bd = 'var(--blue)'; bg = 'var(--blue-tint)' }
            return (
              <button
                key={i}
                onClick={() => !checked && setPicked(i)}
                disabled={checked}
                className="rounded-xl border px-3.5 py-2 text-left text-sm transition-colors"
                style={{ borderColor: bd, backgroundColor: bg, color: col, cursor: checked ? 'default' : 'pointer' }}
              >
                {o}
                {checked && isCorrect && <span className="ml-1.5 font-semibold" style={{ color: '#12a45a' }}>✓</span>}
                {checked && isPicked && !isCorrect && <span className="ml-1.5 font-semibold" style={{ color: '#e0564f' }}>✗</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Hinweis (nur Lücke, vor dem Prüfen) */}
      {ex.type === 'cloze' && ex.hint && !checked && (
        <div className="pl-7 font-mono text-xs" style={{ color: 'var(--ink-faint)' }}>💡 {ex.hint}</div>
      )}

      {/* Aktion / Ergebnis */}
      <div className="pl-7">
        {!checked ? (
          <button
            onClick={() => setChecked(true)}
            disabled={!canCheck}
            className="mt-1 rounded-xl px-4 py-1.5 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: canCheck ? 'var(--blue)' : 'var(--ink-faint)', cursor: canCheck ? 'pointer' : 'not-allowed' }}
          >
            Prüfen
          </button>
        ) : (
          <div className="mt-1 space-y-1.5">
            <div className="text-sm font-semibold" style={{ color: ok ? '#12a45a' : '#c0453f' }}>
              {ok ? (accentHint ? 'Richtig – achte nur auf die Akzente ✓' : 'Richtig ✓') : 'Nicht ganz ✗'}
            </div>
            {ex.type === 'cloze' && (!ok || accentHint) && (
              <div className="text-sm" style={{ color: 'var(--ink)' }}>
                Richtige Form: <span className="font-semibold" style={{ color: 'var(--blue-dark)' }}>{ex.answer}</span>
              </div>
            )}
            {ex.explain && (
              <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--blue-tint)', color: 'var(--ink)' }}>
                {ex.explain}
              </div>
            )}
            {!ok && (
              <button
                onClick={() => { setChecked(false); if (ex.type === 'choice') setPicked(null); else setInput('') }}
                className="text-xs font-medium underline"
                style={{ color: 'var(--ink-soft)' }}
              >
                Nochmal versuchen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Themen-Ansicht: Erklärung + generierte Übungen ──
function TopicView({ section, group, topic, words, cache, setCache, onBack }) {
  const cacheKey = `${section.id}/${group.id}/${topic.id}`
  const cached = cache[cacheKey]
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState('')
  const data = cached || null

  const load = async (force = false) => {
    setLoading(true)
    setError('')
    try {
      // Erklärung: fest aus der DB (grammar_explanations). Nur laden, wenn noch nicht vorhanden.
      let explanation = data?.explanation
      if (explanation == null) {
        const { data: row } = await supabase
          .from('grammar_explanations')
          .select('explanation')
          .eq('topic_key', cacheKey)
          .maybeSingle()
        explanation = row?.explanation || ''
      }
      // Übungen: frisch generiert (nur diese werden bei „Neue Übungen" neu erzeugt).
      const res = await generateGrammarExercises({
        path: `${section.name} › ${group.name}`,
        topic: topic.name,
        style: topic.style,
        words,
      })
      setCache(prev => ({ ...prev, [cacheKey]: { explanation, exercises: res.exercises } }))
    } catch (err) {
      setError(err.message || 'Fehler beim Erstellen der Übungen.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!cached) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey])

  return (
    <div className="mx-auto max-w-2xl py-6">
      <button onClick={onBack} className="mb-5 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>
        ← {section.name}
      </button>

      <div className="mb-1 font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
        {section.name} › {group.name}
      </div>
      <h2 className="mb-5 text-2xl font-bold" style={{ color: 'var(--ink)' }}>{topic.name}</h2>

      {loading && (
        <div className="rounded-3xl border p-8 text-center" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink-soft)' }}>
          <div className="mb-2 text-2xl">✨</div>
          Übungen werden erstellt…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-3xl border p-6" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
          <div className="mb-3 text-sm" style={{ color: '#c0453f' }}>{error}</div>
          <button onClick={() => load(true)} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--blue)' }}>
            Erneut versuchen
          </button>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Erklärung (fest aus der DB) */}
          {data.explanation && (
            <div className="mb-6 rounded-3xl border p-5" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
              <div className="mb-2 flex items-center gap-2 font-semibold" style={{ color: 'var(--blue-dark)' }}>
                <span>📖</span> Erklärung
              </div>
              <div className="whitespace-pre-line text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}>
                {data.explanation}
              </div>
            </div>
          )}

          {/* Übungen */}
          <div className="mb-2 flex items-center gap-2 font-semibold" style={{ color: 'var(--ink)' }}>
            <span>✏️</span> Übungen
            {words.length > 0 && (
              <span className="font-mono text-xs font-normal" style={{ color: 'var(--ink-faint)' }}>
                · mit deinen Wörtern
              </span>
            )}
          </div>
          <div className="space-y-3">
            {data.exercises.map((ex, i) => (
              <Exercise key={i} ex={ex} index={i} />
            ))}
          </div>

          <button
            onClick={() => load(true)}
            className="mt-6 w-full rounded-2xl border py-3 text-sm font-semibold transition-colors"
            style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--blue)' }}
          >
            ↻ Neue Übungen
          </button>
        </>
      )}
    </div>
  )
}

// ── Hauptkomponente: Sektions-Browser (Akkordeon) ──
export default function Grammar({ setView }) {
  const [openSection, setOpenSection] = useState(null)
  const [active, setActive] = useState(null) // { section, group, topic }
  const [words, setWords] = useState([])
  const [cache, setCache] = useState({})

  // Wiederholungs-Wörter des Lerners laden (status = 'review')
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('german, french, status')
        .eq('status', 'review')
        .limit(60)
      if (alive && !error && Array.isArray(data)) {
        setWords(data)
      }
    })()
    return () => { alive = false }
  }, [])

  const pickWords = () => {
    if (words.length <= 12) return words
    const start = Math.floor((Date.now() / 1000) % Math.max(1, words.length - 12))
    return words.slice(start, start + 12)
  }

  if (active) {
    return (
      <TopicView
        section={active.section}
        group={active.group}
        topic={active.topic}
        words={pickWords()}
        cache={cache}
        setCache={setCache}
        onBack={() => setActive(null)}
      />
    )
  }

  const toggle = (id, e) => {
    const el = e.currentTarget.closest('.svc-acc')
    if (el) {
      const r = el.getBoundingClientRect()
      const mx = e.clientX ? ((e.clientX - r.left) / r.width) * 100 : 50
      el.style.setProperty('--mx', `${mx}%`)
    }
    setOpenSection(prev => (prev === id ? null : id))
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <button onClick={() => setView('dashboard')} className="mb-5 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>
        ← Zur Übersicht
      </button>

      <div className="svc-card mb-6">
        <h2 className="mb-2 text-3xl font-bold" style={{ color: 'var(--ink)' }}>Grammatik</h2>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Alle Bereiche der französischen Grammatik. Wähle ein Thema – erst die Erklärung,
          dann Übungen{words.length > 0 ? ' mit deinen Wiederholungs-Wörtern' : ''}.
        </p>
      </div>

      <div className="space-y-3">
        {GRAMMAR.map((s, i) => {
          const open = openSection === s.id
          const topicCount = s.groups.reduce((n, g) => n + g.topics.length, 0)
          return (
            <div
              key={s.id}
              className={`svc-card svc-acc rounded-3xl border${open ? ' open' : ''}`}
              style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', animationDelay: `${100 + i * 45}ms` }}
            >
              <button onClick={e => toggle(s.id, e)} className="flex w-full items-center gap-3.5 px-4 py-4 text-left sm:px-5">
                <div
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-xl"
                  style={{ background: `linear-gradient(135deg, ${s.accent}, ${s.accent}bb)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }}
                >
                  {s.icon}
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="font-bold" style={{ color: 'var(--ink)' }}>{s.name}</span>
                  <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>{s.intro}</span>
                </div>
                <span className="ml-auto flex-none font-mono text-xs" style={{ color: 'var(--ink-faint)' }}>{topicCount}</span>
                <svg className="svc-chev flex-none" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="var(--ink-faint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>

              <div className="svc-body">
                <div className="svc-body-in">
                  <div className="svc-body-pad flex flex-col gap-4 px-4 pb-5 sm:px-5">
                    {s.groups.map(g => (
                      <div key={g.id}>
                        <div className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                          {g.name}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {g.topics.map(t => (
                            <button
                              key={t.id}
                              onClick={() => setActive({ section: s, group: g, topic: t })}
                              className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors"
                              style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface-2)', color: 'var(--ink)' }}
                            >
                              {t.style === 'contrast' && <span title="Unterscheidungs-Übung">🔀</span>}
                              <span className="flex-1">{t.name}</span>
                              <span style={{ color: 'var(--blue)' }}>→</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="svc-card mt-6 rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink-soft)', animationDelay: '620ms' }}>
        <span style={{ color: 'var(--ink)' }}>🔀</span> markiert <span className="font-semibold" style={{ color: 'var(--ink)' }}>Unterscheidungs-Übungen</span> –
        da geht es darum zu erkennen, <em>welche</em> Form/Zeit man wann benutzt (z. B. Futur simple vs. Futur proche).
      </div>
    </div>
  )
}

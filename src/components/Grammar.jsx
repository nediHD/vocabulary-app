import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { GRAMMAR } from '../lib/grammar'

// Rendert Text mit ~Tilden~-Markierungen: markierter Teil (Endung) farbig.
export function Marked({ text }) {
  const parts = String(text ?? '').split('~')
  return parts.map((p, i) =>
    i % 2 === 1 ? <span key={i} className="gr-mark">{p}</span> : <span key={i}>{p}</span>
  )
}

// Ein französisches Beispiel: „Le café. — Der Kaffee." Der Teil nach „ — " ist die
// deutsche Übersetzung und wird gedämpft dargestellt; der französische Teil bekommt
// die ~Endungs~-Farbe.
function ExLine({ text }) {
  const s = String(text ?? '')
  const m = s.split(/\s+—\s+/)
  const fr = m[0]
  const de = m.length > 1 ? m.slice(1).join(' — ') : ''
  return (
    <div className="flex gap-2 text-[14px] leading-relaxed">
      <span className="flex-none select-none" style={{ color: 'var(--blue)' }}>•</span>
      <span>
        <span style={{ color: 'var(--ink)' }}><Marked text={fr} /></span>
        {de && <span style={{ color: 'var(--ink-faint)' }}>{'  — '}{de}</span>}
      </span>
    </div>
  )
}

// Kleiner Baustein: eine deutsche Erklärung + darunter französische Beispiele.
function Block({ label, explain, examples, labelColor = 'var(--blue-dark)' }) {
  const ex = Array.isArray(examples) ? examples : (examples ? [examples] : [])
  return (
    <div>
      {label && <div className="font-semibold text-[15px]" style={{ color: labelColor }}>{label}</div>}
      {explain && <div className="mt-0.5 text-[14px] leading-relaxed" style={{ color: 'var(--ink)' }}><Marked text={explain} /></div>}
      {ex.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-1 border-l-2 pl-3" style={{ borderColor: 'var(--blue-tint-line)' }}>
          {ex.map((e, i) => <ExLine key={i} text={e} />)}
        </div>
      )}
    </div>
  )
}

function SectionHead({ children }) {
  return (
    <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>{children}</div>
  )
}

// Normalisiert Ausnahmen/Fehler: alte Form (String[]) → ein Block mit Beispielen;
// neue Form ([{explain, examples}]) → unverändert.
function normBlocks(arr) {
  if (!Array.isArray(arr)) return []
  const strings = arr.filter(x => typeof x === 'string')
  const objects = arr.filter(x => x && typeof x === 'object')
  const out = objects.map(o => ({ explain: o.explain || o.label || '', examples: o.examples || [] }))
  if (strings.length) out.unshift({ explain: '', examples: strings })
  return out
}

// Strukturierte Erklärung (aus DB `data`), Fallback: reiner Text.
export function Explanation({ data, text }) {
  if (data && typeof data === 'object') {
    const uses = Array.isArray(data.uses) ? data.uses : []
    const forms = Array.isArray(data.forms) ? data.forms : []
    const signals = Array.isArray(data.signals) ? data.signals : []
    const exceptions = normBlocks(data.exceptions)
    const mistakes = Array.isArray(data.mistakes)
      ? normBlocks(data.mistakes)
      : (data.mistake ? [{ explain: '', examples: [data.mistake] }] : [])

    return (
      <div className="flex flex-col gap-5 rounded-3xl border p-5" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
        {/* WANN */}
        {(data.when || uses.length > 0 || signals.length > 0) && (
          <div>
            <SectionHead>Wann benutze ich das?</SectionHead>
            {data.when && <div className="mb-3 text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}><Marked text={data.when} /></div>}
            {uses.length > 0 && (
              <div className="flex flex-col gap-3">
                {uses.map((u, i) => <Block key={i} label={u.label} explain={u.explain} examples={u.examples} />)}
              </div>
            )}
            {signals.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-[13px]" style={{ color: 'var(--ink-soft)' }}>Signalwörter:</div>
                <div className="flex flex-wrap gap-1.5">
                  {signals.map((s, i) => <span key={i} className="gr-chip">{s}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BILDUNG */}
        {(data.build || forms.length > 0) && (
          <div>
            <SectionHead>Bildung{data.formsLabel ? ` · ${data.formsLabel}` : ''}</SectionHead>
            {data.build && <div className="mb-2.5 text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}><Marked text={data.build} /></div>}
            {forms.length > 0 && (
              <div className="flex flex-wrap gap-2">{forms.map((f, i) => <span key={i} className="gr-form"><Marked text={f} /></span>)}</div>
            )}
          </div>
        )}

        {/* AUSNAHMEN */}
        {exceptions.length > 0 && (
          <div>
            <SectionHead>Ausnahmen &amp; Besonderheiten</SectionHead>
            <div className="flex flex-col gap-3">
              {exceptions.map((e, i) => <Block key={i} explain={e.explain} examples={e.examples} />)}
            </div>
          </div>
        )}

        {/* FEHLER */}
        {mistakes.length > 0 && (
          <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'rgba(201,130,10,0.12)' }}>
            <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: '#b5760a' }}>⚠️ Häufiger Fehler</div>
            <div className="flex flex-col gap-3">
              {mistakes.map((m, i) => (
                <div key={i}>
                  {m.explain && <div className="text-[14px] leading-relaxed" style={{ color: 'var(--ink)' }}><Marked text={m.explain} /></div>}
                  {Array.isArray(m.examples) && m.examples.length > 0 && (
                    <div className="mt-1.5 flex flex-col gap-1 border-l-2 pl-3" style={{ borderColor: 'rgba(201,130,10,0.35)' }}>
                      {m.examples.map((e, j) => <ExLine key={j} text={e} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  if (text) {
    return (
      <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
        <div className="whitespace-pre-line text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}>{text}</div>
      </div>
    )
  }
  return null
}

// Lädt & cached die Theorie eines Themas aus der DB (data + Fallbacktext).
export function useTheory(topicKey) {
  const [state, setState] = useState({ loading: true, data: null, text: null })
  useEffect(() => {
    let alive = true
    setState({ loading: true, data: null, text: null })
    ;(async () => {
      const { data: row } = await supabase
        .from('grammar_explanations')
        .select('data, explanation')
        .eq('topic_key', topicKey)
        .maybeSingle()
      if (alive) setState({ loading: false, data: row?.data || null, text: row?.explanation || null })
    })()
    return () => { alive = false }
  }, [topicKey])
  return state
}

// Theorie-Ansicht eines Themas (nur Nachschlagen – keine Übungen)
function TheoryView({ section, group, topic, onBack }) {
  const { loading, data, text } = useTheory(`${section.id}/${group.id}/${topic.id}`)
  return (
    <div className="mx-auto max-w-2xl py-6">
      <button onClick={onBack} className="mb-5 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>← {section.name}</button>
      <div className="mb-1 font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>{section.name} › {group.name}</div>
      <h2 className="mb-5 text-2xl font-bold" style={{ color: 'var(--ink)' }}>{topic.name}</h2>
      {loading
        ? <div className="rounded-3xl border p-8 text-center" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink-soft)' }}>Lädt…</div>
        : <Explanation data={data} text={text} />}
    </div>
  )
}

// Nachschlage-Browser (Theorie)
export default function Grammar({ setView }) {
  const [openSection, setOpenSection] = useState(null)
  const [active, setActive] = useState(null)

  if (active) {
    return <TheoryView section={active.section} group={active.group} topic={active.topic} onBack={() => setActive(null)} />
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
      <button onClick={() => setView('dashboard')} className="mb-5 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>← Zur Übersicht</button>

      <div className="svc-card mb-6">
        <h2 className="mb-2 text-3xl font-bold" style={{ color: 'var(--ink)' }}>Grammatik nachschlagen</h2>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Alle Themen zum Nachlesen.</p>
      </div>

      <div className="space-y-3">
        {GRAMMAR.map((s, i) => {
          const open = openSection === s.id
          const topicCount = s.groups.reduce((n, g) => n + g.topics.length, 0)
          return (
            <div key={s.id} className={`svc-card svc-acc rounded-3xl border${open ? ' open' : ''}`}
              style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', animationDelay: `${100 + i * 45}ms` }}>
              <button onClick={e => toggle(s.id, e)} className="flex w-full items-center gap-3.5 px-4 py-4 text-left sm:px-5">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-xl"
                  style={{ background: `linear-gradient(135deg, ${s.accent}, ${s.accent}bb)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }}>{s.icon}</div>
                <div className="min-w-0 flex flex-col">
                  <span className="font-bold" style={{ color: 'var(--ink)' }}>{s.name}</span>
                  <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>{s.intro}</span>
                </div>
                <span className="ml-auto flex-none font-mono text-xs" style={{ color: 'var(--ink-faint)' }}>{topicCount}</span>
                <svg className="svc-chev flex-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
              <div className="svc-body">
                <div className="svc-body-in">
                  <div className="svc-body-pad flex flex-col gap-4 px-4 pb-5 sm:px-5">
                    {s.groups.map(g => (
                      <div key={g.id}>
                        <div className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>{g.name}</div>
                        <div className="flex flex-col gap-1.5">
                          {g.topics.map(t => (
                            <button key={t.id} onClick={() => setActive({ section: s, group: g, topic: t })}
                              className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm"
                              style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface-2)', color: 'var(--ink)' }}>
                              {t.style === 'contrast' && <span title="Unterscheidung">🔀</span>}
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
    </div>
  )
}

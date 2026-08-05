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

// Strukturierte Erklärung (aus DB `data`), Fallback: reiner Text.
export function Explanation({ data, text }) {
  if (data && typeof data === 'object') {
    const forms = Array.isArray(data.forms) ? data.forms : []
    const signals = Array.isArray(data.signals) ? data.signals : []
    const exceptions = Array.isArray(data.exceptions) ? data.exceptions : []
    return (
      <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
        {data.when && (
          <div className="mb-4">
            <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>Wann</div>
            <div className="text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}>{data.when}</div>
            {signals.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {signals.map((s, i) => <span key={i} className="gr-chip">{s}</span>)}
              </div>
            )}
          </div>
        )}
        {(data.build || forms.length > 0) && (
          <div className="mb-4">
            <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>
              Bildung{data.formsLabel ? ` · ${data.formsLabel}` : ''}
            </div>
            {data.build && <div className="mb-2 text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}><Marked text={data.build} /></div>}
            {forms.length > 0 && (
              <div className="flex flex-wrap gap-2">{forms.map((f, i) => <span key={i} className="gr-form"><Marked text={f} /></span>)}</div>
            )}
          </div>
        )}
        {exceptions.length > 0 && (
          <div className="mb-4">
            <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>Ausnahmen</div>
            <div className="flex flex-wrap gap-2">{exceptions.map((f, i) => <span key={i} className="gr-form"><Marked text={f} /></span>)}</div>
          </div>
        )}
        {data.mistake && (
          <div className="rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: 'rgba(201,130,10,0.12)', color: 'var(--ink)' }}>
            <span style={{ color: '#c9820a', fontWeight: 700 }}>⚠️ Fehler</span> · <Marked text={data.mistake} />
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
      <div className="mt-5 rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink-soft)' }}>
        Üben kannst du dieses Thema über <span className="font-semibold" style={{ color: 'var(--blue)' }}>Grammatik üben</span> auf der Startseite.
      </div>
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
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Alle Themen zum Nachlesen. Zum Üben: „Grammatik üben" auf der Startseite.</p>
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

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { orderedForms } from '../lib/grammar'
import { pickTargetForm } from './GrammarPractice'

// Status einer Zeitform aus ihrem Fortschritts-Eintrag ableiten.
function formStatus(progressRow, nowMs) {
  if (!progressRow || progressRow.status === 'new') return { key: 'new' }
  const t = progressRow.next_review_at ? new Date(progressRow.next_review_at).getTime() : null
  if (t == null) return { key: 'new' }
  if (t <= nowMs) return { key: 'due' }
  const days = Math.max(1, Math.round((t - nowMs) / 86400000))
  return { key: 'scheduled', days }
}

const BADGE = {
  next:      { label: 'Als Nächstes', bg: 'var(--blue)', color: '#fff' },
  due:       { label: 'fällig', bg: 'rgba(217,119,6,0.15)', color: '#b45309' },
  scheduled: { label: 'gelernt', bg: 'rgba(22,163,74,0.12)', color: '#15803d' },
  new:       { label: 'neu', bg: 'var(--surface-2)', color: 'var(--ink-faint)' },
}

export default function FormOverview({ setView }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      setLoading(true)
      const { data } = await supabase.from('form_progress').select('*')
      setRows(data || [])
    } finally {
      setLoading(false)
    }
  }

  const forms = orderedForms()
  const nowMs = Date.now()
  const prog = new Map(rows.map(r => [r.form_key, r]))
  const nextId = forms.length ? pickTargetForm(forms, rows)?.id : null
  const nextForm = forms.find(f => f.id === nextId)

  return (
    <div className="mx-auto max-w-2xl py-6">
      <button onClick={() => setView('dashboard')} className="mb-5 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>← Zurück</button>
      <h1 className="mb-2 text-3xl font-bold" style={{ color: 'var(--ink)' }}>Zeitform-Fortschritt</h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--ink-soft)' }}>
        Alle 13 Zeitformen in Lern-Reihenfolge. Markiert ist, welche als Nächstes dran ist.
      </p>

      {loading ? (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--line-soft)', color: 'var(--ink-soft)' }}>Lädt…</div>
      ) : (
        <>
          {/* Als-Nächstes-Karte */}
          {nextForm && (
            <div className="mb-6 rounded-2xl border p-5" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
              <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>Als Nächstes dran</div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{nextForm.name}</span>
                <button onClick={() => setView('grammar-practice')}
                  className="rounded-2xl px-5 py-2.5 font-semibold text-white transition-colors"
                  style={{ backgroundColor: 'var(--blue)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--blue-dark)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--blue)'}>
                  Jetzt üben →
                </button>
              </div>
            </div>
          )}

          {/* Liste aller 13 Formen */}
          <ol className="flex flex-col gap-2">
            {forms.map((f, i) => {
              const st = formStatus(prog.get(f.id), nowMs)
              const isNext = f.id === nextId
              const badge = isNext ? BADGE.next : BADGE[st.key]
              return (
                <li key={f.id} className="flex items-center gap-3 rounded-2xl border p-3.5"
                  style={{
                    borderColor: isNext ? 'var(--blue)' : 'var(--line-soft)',
                    backgroundColor: 'var(--surface)',
                    borderWidth: isNext ? 2 : 1,
                  }}>
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full font-mono text-xs font-bold"
                    style={{ backgroundColor: 'var(--surface-2)', color: 'var(--ink-faint)' }}>{i + 1}</span>
                  <span className="flex-1 font-semibold" style={{ color: 'var(--ink)' }}>{f.name}</span>
                  {st.key === 'scheduled' && !isNext && (
                    <span className="font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>in {st.days} T.</span>
                  )}
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span>
                </li>
              )
            })}
          </ol>

          <p className="mt-6 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>
            „fällig" = zur Wiederholung dran · „gelernt" = kommt später wieder · „neu" = noch nicht geübt
          </p>
        </>
      )}
    </div>
  )
}

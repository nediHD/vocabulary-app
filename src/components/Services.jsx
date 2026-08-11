import { useState } from 'react'

const services = [
  { name: 'Supabase', mono: 'S', accent: '#3ecf8e', cat: 'Backend', url: 'https://supabase.com',
    use: 'Datenbank, Storage & Edge Functions (Projekt „vokabular")', key: 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY', where: 'Client' },
  { name: 'Groq', mono: 'G', accent: '#f55036', cat: 'KI', url: 'https://console.groq.com',
    use: 'LLM llama-3.3-70b — Texte, Gruppierung, Segmente, Podcast, Fragen', key: 'VITE_GROQ_API_KEY', where: 'Client' },
  { name: 'Supadata', mono: 'Sd', accent: '#3b6ef0', cat: 'Medien', url: 'https://supadata.ai',
    use: 'YouTube-Transkripte für „Hören"', key: 'SUPADATA_API_KEY', where: 'Serverseitig (Edge Function)' },
  { name: 'fal.ai', mono: 'f', accent: '#a855f7', cat: 'KI', url: 'https://fal.ai',
    use: 'Inworld TTS-1.5 Max — Podcast-Audio für „Hören"', key: 'FAL_KEY', where: 'Serverseitig (Edge Function)' },
  { name: 'SponsorBlock', mono: 'SB', accent: '#ec4899', cat: 'Medien', url: 'https://sponsor.ajay.app',
    use: 'Erkennt platzierte Werbung/Eigenwerbung im Video (zum Überspringen)', key: '—', where: 'kein Key (Community-DB)' },
  { name: 'YouTube', mono: 'YT', accent: '#ff3b3b', cat: 'Medien', url: 'https://youtube.com',
    use: 'Player-Embed (Original-Audio) & Videoquelle', key: '—', where: 'kein Key' },
  { name: 'GitHub Pages', mono: 'GH', accent: '#5b6472', cat: 'Hosting', url: 'https://pages.github.com',
    use: 'Hosting der App & Deploy (GitHub Actions)', key: '—', where: 'kein Key' },
]

const cats = ['Alle', 'Backend', 'KI', 'Medien', 'Hosting']

function security(s) {
  if (s.key === '—') return { label: 'kein Key', color: 'var(--ink-faint)', bg: 'rgba(20,32,58,0.06)' }
  if (/Edge/.test(s.where)) return { label: 'Key geschützt', color: '#12a45a', bg: 'rgba(18,164,90,0.12)' }
  return { label: 'Key sichtbar', color: '#c9820a', bg: 'rgba(201,130,10,0.14)' }
}

export default function Services({ setView }) {
  const [openName, setOpenName] = useState(null)
  const [filter, setFilter] = useState('Alle')

  const list = services.filter(s => filter === 'Alle' || s.cat === filter)

  const toggle = (name, e) => {
    const el = e.currentTarget.closest('.svc-acc')
    if (el) {
      const r = el.getBoundingClientRect()
      const mx = e.clientX ? ((e.clientX - r.left) / r.width) * 100 : 50
      el.style.setProperty('--mx', `${mx}%`)
    }
    setOpenName(prev => (prev === name ? null : name))
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="svc-card mb-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Genutzte Dienste</h2>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Alle externen Dienste (Daten, KI, TTS, Hosting), die die App verwendet. Tippe eine Karte für Details.
        </p>
      </div>

      {/* Kategorie-Filter */}
      <div className="svc-card mb-6 flex flex-wrap gap-2" style={{ animationDelay: '60ms' }}>
        {cats.map(c => {
          const active = filter === c
          return (
            <button
              key={c}
              onClick={() => { setFilter(c); setOpenName(null) }}
              className="rounded-full border px-3.5 py-1.5 font-mono text-xs tracking-wide transition-colors"
              style={{
                borderColor: active ? 'var(--blue)' : 'var(--line-soft)',
                color: active ? 'var(--blue)' : 'var(--ink-faint)',
                backgroundColor: active ? 'var(--blue-tint)' : 'transparent',
              }}
            >
              {c}
            </button>
          )
        })}
      </div>

      {/* Dienste-Karten (Akkordeon) */}
      <div className="space-y-3">
        {list.map((s, i) => {
          const sec = security(s)
          const open = openName === s.name
          return (
            <div
              key={s.name}
              className={`svc-card svc-acc rounded-3xl border${open ? ' open' : ''}`}
              style={{
                borderColor: 'var(--line-soft)',
                backgroundColor: 'var(--surface)',
                animationDelay: `${120 + i * 55}ms`,
              }}
            >
              <button
                onClick={e => toggle(s.name, e)}
                className="flex w-full items-center gap-3.5 px-4 py-4 text-left sm:px-5"
                style={{ color: 'var(--ink)' }}
              >
                <div
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-xl font-mono text-base font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${s.accent}, ${s.accent}cc)`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
                  }}
                >
                  {s.mono}
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="font-bold" style={{ color: 'var(--ink)' }}>{s.name}</span>
                  <span className="font-mono text-xs" style={{ color: 'var(--ink-faint)' }}>
                    {s.url.replace('https://', '')}
                  </span>
                </div>
                <span
                  className="ml-auto flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide"
                  style={{ color: sec.color, backgroundColor: sec.bg }}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sec.color }} />
                  <span>{sec.label}</span>
                </span>
                <svg className="svc-chev flex-none" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="var(--ink-faint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>

              <div className="svc-body">
                <div className="svc-body-in">
                  <div className="svc-body-pad flex flex-col gap-2.5 px-4 pb-4 pl-[70px] sm:px-5 sm:pl-[74px]">
                    <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>{s.use}</div>
                    <div className="font-mono text-xs" style={{ color: 'var(--ink-soft)' }}>
                      <span style={{ color: 'var(--ink-faint)' }}>Key: </span>{s.key}
                    </div>
                    <div className="font-mono text-xs" style={{ color: 'var(--ink-soft)' }}>
                      <span style={{ color: 'var(--ink-faint)' }}>Liegt: </span>{s.where}
                    </div>
                    <a href={s.url} target="_blank" rel="noreferrer"
                      className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--blue)' }}>
                      {s.url.replace('https://', '')} ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="svc-card mt-6 rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)', color: 'var(--ink)', animationDelay: '360ms' }}>
        <div className="font-semibold mb-1" style={{ color: 'var(--blue-dark)' }}>Hinweis zur Sicherheit</div>
        <span style={{ color: '#c9820a', fontWeight: 600 }}>Key sichtbar</span> (Client-Keys <span className="font-mono">VITE_*</span>) liegen im Browser-Bundle.
        {' '}<span style={{ color: '#12a45a', fontWeight: 600 }}>Key geschützt</span> (<span className="font-mono">SUPADATA_API_KEY</span>, <span className="font-mono">FAL_KEY</span>) liegt nur in den Supabase Edge Functions — nicht im öffentlichen Repo. Hier werden nur die <em>Namen</em> der Keys gezeigt, keine Werte.
      </div>

      <button onClick={() => setView('dashboard')} className="mt-8 w-full text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>
        ← Zur Übersicht
      </button>
    </div>
  )
}

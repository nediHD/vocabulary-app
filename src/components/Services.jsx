const services = [
  { name: 'Supabase', url: 'https://supabase.com', use: 'Datenbank, Storage, Edge Functions (Projekt „fre")', key: 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY', where: 'Client' },
  { name: 'Groq', url: 'https://console.groq.com', use: 'LLM llama-3.3-70b — Texte, Gruppierung, Segmentierung, Podcast, Fragen', key: 'VITE_GROQ_API_KEY', where: 'Client' },
  { name: 'Supadata', url: 'https://supadata.ai', use: 'YouTube-Transkripte („Hören")', key: 'SUPADATA_API_KEY', where: 'Serverseitig (Edge Function)' },
  { name: 'SponsorBlock', url: 'https://sponsor.ajay.app', use: 'Erkennt platzierte Werbung/Eigenwerbung im Video (zum Überspringen)', key: '—', where: 'kein Key (Community-DB)' },
  { name: 'fal.ai', url: 'https://fal.ai', use: 'Inworld TTS-1.5 Max — Podcast-Audio („Hören")', key: 'FAL_KEY', where: 'Serverseitig (Edge Function)' },
  { name: 'YouTube', url: 'https://youtube.com', use: 'Player-Embed (Original-Audio) + Videoquelle', key: '—', where: 'kein Key' },
  { name: 'GitHub Pages', url: 'https://pages.github.com', use: 'Hosting der App + Deploy (GitHub Actions)', key: '—', where: '—' },
]

export default function Services({ setView }) {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Genutzte Dienste</h2>
      <p className="mb-6 text-sm" style={{ color: 'var(--ink-soft)' }}>
        Alle externen Webseiten/Dienste (Daten, LLMs, TTS, Hosting), die die App verwendet.
      </p>

      <div className="space-y-3">
        {services.map((s) => (
          <div
            key={s.name}
            className="rounded-2xl border p-5"
            style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{s.name}</div>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium"
                style={{ color: 'var(--blue)' }}
              >
                {s.url.replace('https://', '')} ↗
              </a>
            </div>
            <div className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>{s.use}</div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: 'var(--ink-faint)' }}>
              <span><span className="font-mono">{s.key}</span></span>
              <span>· {s.where}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)', color: 'var(--ink)' }}>
        <div className="font-semibold mb-1" style={{ color: 'var(--blue-dark)' }}>Hinweis zur Sicherheit</div>
        Client-Keys (<span className="font-mono">VITE_*</span>) liegen im Browser-Bundle und sind sichtbar.
        Serverseitige Keys (<span className="font-mono">SUPADATA_API_KEY</span>, <span className="font-mono">FAL_KEY</span>)
        liegen nur in den Supabase Edge Functions — nicht im öffentlichen Repo. Hier werden nur die <em>Namen</em> der Keys gezeigt, keine Werte.
      </div>

      <button onClick={() => setView('dashboard')} className="mt-8 w-full text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>
        Zur Übersicht
      </button>
    </div>
  )
}

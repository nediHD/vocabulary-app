import { useState, useEffect } from 'react'
import { PODCAST_EPISODES, audioUrl, fetchEpisodeCards } from '../lib/podcast'

// Eine Folge: Player, Wortliste (Zusatzblatt mit Übersetzung) und Start der Übung.
function Episode({ ep, onStart }) {
  const [cards, setCards] = useState(null)
  const [error, setError] = useState('')
  const [showWords, setShowWords] = useState(false)

  useEffect(() => {
    fetchEpisodeCards(ep).then(setCards).catch(e => setError(e.message || 'Fehler beim Laden'))
  }, [ep])

  return (
    <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
      <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>
        Folge {ep.id} · {ep.tense}
      </div>
      <div className="mb-4 text-lg font-bold" style={{ color: 'var(--ink)' }}>{ep.title}</div>

      <audio controls preload="none" src={audioUrl(ep)} className="mb-4 w-full" />

      <button onClick={() => setShowWords(s => !s)} className="mb-3 text-sm font-medium" style={{ color: 'var(--blue)' }}>
        {showWords ? 'Wortliste ausblenden ▴' : 'Wortliste mit Übersetzung ▾'}
      </button>

      {showWords && (
        <div className="mb-4 rounded-2xl border p-4" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
          {error && <div className="text-sm" style={{ color: '#ef4444' }}>{error}</div>}
          {!cards && !error && <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>Lädt…</div>}
          {cards && (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-[14px] sm:grid-cols-2">
              {cards.map(c => (
                <li key={c.id}>
                  <span className="font-semibold" style={{ color: 'var(--ink)' }}>{c.french}</span>
                  <span style={{ color: 'var(--ink-faint)' }}> — {c.german}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        onClick={onStart}
        disabled={!cards || cards.length === 0}
        className="aurora-cta lift flex w-full items-center justify-between rounded-2xl px-6 py-3.5 font-semibold text-white"
        style={{ opacity: !cards || cards.length === 0 ? 0.6 : 1 }}
      >
        <span>Wörter üben + Grammatik ({ep.tense})</span>
        <span className="font-mono text-sm opacity-80">{cards ? `${cards.length} Wörter →` : '…'}</span>
      </button>
    </div>
  )
}

export default function Podcast({ setView, setPodcastEpisode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => setView('dashboard')} className="mb-5 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>← Zurück</button>
      <h2 className="mb-2 text-3xl font-bold" style={{ color: 'var(--ink)' }}>Podcast 🎧</h2>
      <p className="mb-6 text-sm" style={{ color: 'var(--ink-soft)' }}>
        Erst die Folge hören, dann die Wörter der Folge üben (Lückentext, Schreiben, Karteikarten) und danach die Grammatik zur Zeitform.
        Die Wörter zählen als normale Wiederholung.
      </p>
      <div className="flex flex-col gap-5">
        {PODCAST_EPISODES.map(ep => (
          <Episode
            key={ep.id}
            ep={ep}
            onStart={() => { setPodcastEpisode(ep.id); setView('podcast-practice') }}
          />
        ))}
      </div>
    </div>
  )
}

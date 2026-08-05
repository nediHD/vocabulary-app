import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { buildQueue } from '../lib/grammarSrs'
import { ensureWortarten } from '../lib/classify'

export default function Dashboard({ setView, setInSession }) {
  const [stats, setStats] = useState({
    total: 0,
    learning: 0,
    review: 0,
    dueToday: 0,
  })
  const [grammar, setGrammar] = useState({ due: 0, fresh: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    ensureWortarten() // Wortarten der Wörter einmalig im Hintergrund bestimmen
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const now = new Date().toISOString()

      const [{ data, error }, { data: gp }] = await Promise.all([
        supabase.from('cards').select('id, status, next_review_at'),
        supabase.from('grammar_progress').select('*'),
      ])

      if (error) {
        console.error('Error fetching stats:', error)
        return
      }

      const total = data.length
      const learning = data.filter(d => d.status === 'learning').length
      const review = data.filter(d => d.status === 'review').length
      const dueToday = data.filter(
        d => d.status === 'review' && new Date(d.next_review_at) <= new Date(now)
      ).length

      setStats({ total, learning, review, dueToday })

      const plan = buildQueue(gp || [], new Date())
      setGrammar({ due: plan.counts.due, fresh: plan.fresh.length })
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const sectionLabel = txt => (
    <div className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>{txt}</div>
  )

  const handleStartLearning = () => {
    if (stats.learning === 0) {
      alert('Keine Wörter zum Lernen verfügbar.')
      return
    }
    setView('learning')
  }

  const handleStartReview = () => {
    if (stats.dueToday === 0) {
      alert('Keine Wörter fällig.')
      return
    }
    setView('review')
  }

  if (loading) {
    return <div style={{ color: 'var(--ink-soft)' }} className="text-center">Lädt...</div>
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--ink-faint)' }}>Guten Tag 👋</p>
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Dein Vokabular</h1>
        <p style={{ color: 'var(--ink-soft)' }}>Bereit zum Lernen?</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
          <div className="font-mono text-3xl font-semibold" style={{ color: 'var(--ink)' }}>{stats.total}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
            Wörter insgesamt
          </div>
        </div>

        <div className="aurora-cta rounded-3xl border-0 p-5">
          <div className="font-mono text-3xl font-semibold">{stats.dueToday}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider opacity-80">
            Heute fällig
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {sectionLabel('Vokabeln')}
        <button
          onClick={handleStartLearning}
          className="aurora-cta lift flex items-center justify-between rounded-2xl px-6 py-3.5 font-semibold text-white sm:h-16"
        >
          <span>Lernsitzung starten</span>
          <span className="font-mono text-sm opacity-75">
            {stats.learning} Wörter →
          </span>
        </button>

        <button
          onClick={handleStartReview}
          disabled={stats.dueToday === 0}
          className={`lift flex items-center justify-between rounded-2xl px-6 py-3.5 font-semibold sm:h-16 border`}
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--line-soft)',
            color: stats.dueToday === 0 ? 'var(--ink-soft)' : 'var(--ink)',
            cursor: stats.dueToday === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <span>Wiederholung starten</span>
          <span className="font-mono text-sm" style={{ color: 'var(--blue)' }}>
            {stats.dueToday > 0 ? `${stats.dueToday} heute →` : 'Keine fällig'}
          </span>
        </button>

        {sectionLabel('Grammatik')}
        <button
          onClick={() => setView('grammar-practice')}
          className="aurora-cta lift flex items-center justify-between rounded-2xl px-6 py-3.5 font-semibold text-white sm:h-16"
        >
          <span>Grammatik üben 📐</span>
          <span className="font-mono text-sm opacity-80">
            {grammar.due + grammar.fresh > 0 ? `${grammar.due} fällig · ${grammar.fresh} neu →` : 'Erledigt →'}
          </span>
        </button>

        <button
          onClick={() => setView('grammar')}
          className="lift flex items-center justify-between rounded-2xl px-6 py-3.5 font-semibold sm:h-16 border"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line-soft)', color: 'var(--ink)' }}
        >
          <span>Grammatik nachschlagen 📖</span>
          <span className="font-mono text-sm" style={{ color: 'var(--blue)' }}>Theorie →</span>
        </button>

        {sectionLabel('Weiteres')}
        <button
          onClick={() => setView('audio')}
          className="lift flex items-center justify-between rounded-2xl px-6 py-3.5 font-semibold sm:h-16 border"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--line-soft)',
            color: 'var(--ink)',
          }}
        >
          <span>Hören 🎧</span>
          <span className="font-mono text-sm" style={{ color: 'var(--blue)' }}>
            Video &amp; Podcast →
          </span>
        </button>

        <button
          onClick={() => setView('sentences')}
          className="lift flex items-center justify-between rounded-2xl px-6 py-3.5 font-semibold sm:h-16 border"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--line-soft)',
            color: 'var(--ink)',
          }}
        >
          <span>Lückentext ✏️</span>
          <span className="font-mono text-sm" style={{ color: 'var(--blue)' }}>
            Text schreiben →
          </span>
        </button>

        <button
          onClick={() => setView('words')}
          className="lift flex items-center justify-between rounded-2xl px-6 py-3.5 font-semibold sm:h-16 border"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--line-soft)',
            color: 'var(--ink)',
          }}
        >
          <span>Wörter verwalten 📖</span>
          <span className="font-mono text-sm" style={{ color: 'var(--blue)' }}>
            {stats.total} →
          </span>
        </button>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => setView('services')}
          className="text-xs font-medium"
          style={{ color: 'var(--ink-faint)' }}
        >
          Genutzte Dienste
        </button>
      </div>
    </div>
  )
}

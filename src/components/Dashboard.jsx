import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard({ setView }) {
  const [stats, setStats] = useState({
    total: 0,
    learning: 0,
    review: 0,
    dueToday: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('cards')
        .select('id, status, next_review_at')

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
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

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
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
          <div className="font-mono text-3xl font-semibold" style={{ color: 'var(--ink)' }}>{stats.total}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
            Wörter insgesamt
          </div>
        </div>

        <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
          <div className="font-mono text-3xl font-semibold" style={{ color: 'var(--ink)' }}>
            {stats.learning}
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
            Im Lernen
          </div>
        </div>

        <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
          <div className="font-mono text-3xl font-semibold" style={{ color: 'var(--ink)' }}>
            {stats.review}
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
            In Wiederholung
          </div>
        </div>

        <div className="rounded-3xl border-0 p-5" style={{ backgroundColor: 'var(--blue)', color: 'white' }}>
          <div className="font-mono text-3xl font-semibold">{stats.dueToday}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider opacity-80">
            Heute fällig
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleStartLearning}
          className="flex items-center justify-between rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors sm:h-16"
          style={{ backgroundColor: 'var(--blue)' }}
          onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
          onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
        >
          <span>Lernsitzung starten</span>
          <span className="font-mono text-sm opacity-75">
            {stats.learning} Wörter →
          </span>
        </button>

        <button
          onClick={handleStartReview}
          disabled={stats.dueToday === 0}
          className={`flex items-center justify-between rounded-2xl px-6 py-3.5 font-semibold transition-colors sm:h-16 border`}
          style={{
            backgroundColor: stats.dueToday === 0 ? 'var(--surface)' : 'var(--surface)',
            borderColor: stats.dueToday === 0 ? 'var(--line-soft)' : 'var(--line-soft)',
            color: stats.dueToday === 0 ? 'var(--ink-soft)' : 'var(--ink)',
            cursor: stats.dueToday === 0 ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => {
            if (stats.dueToday > 0) e.target.style.backgroundColor = 'var(--line-soft)'
          }}
          onMouseLeave={e => {
            e.target.style.backgroundColor = 'var(--surface)'
          }}
        >
          <span>Wiederholung starten</span>
          <span className="font-mono text-sm" style={{ color: 'var(--blue)' }}>
            {stats.dueToday > 0 ? `${stats.dueToday} heute →` : 'Keine fällig'}
          </span>
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const WORTARTEN = ['Nomen', 'Verb', 'Adjektiv', 'Adverb', 'Präposition', 'Konjunktion', 'Pronomen', 'Ausdruck', 'Sonstiges']

export default function ManageWords({ setView }) {
  const [words, setWords] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWords()
  }, [])

  const updateWortart = async (id, wortart) => {
    setWords(ws => ws.map(w => (w.id === id ? { ...w, wortart } : w)))
    await supabase.from('cards').update({ wortart }).eq('id', id)
  }

  const fetchWords = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching words:', error)
        return
      }

      setWords(data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWord = async (id) => {
    if (!confirm('Dieses Wort löschen?')) return

    try {
      const { error } = await supabase.from('cards').delete().eq('id', id)

      if (error) {
        console.error('Error deleting word:', error)
        alert('Fehler beim Löschen des Wortes.')
        return
      }

      await fetchWords()
    } catch (err) {
      console.error('Error:', err)
      alert('Fehler beim Löschen des Wortes.')
    }
  }

  const getStatusLabel = status => {
    return status === 'learning' ? 'Im Lernen' : 'In Wiederholung'
  }

  const getStatusStyle = status => {
    return status === 'learning'
      ? { backgroundColor: 'var(--blue-tint)', color: 'var(--blue-dark)' }
      : { backgroundColor: '#f0f2f5', color: 'var(--ink-soft)' }
  }

  const q = search.trim().toLowerCase()
  const shown = q
    ? words.filter(w => (w.german || '').toLowerCase().includes(q) || (w.french || '').toLowerCase().includes(q))
    : words

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={() => setView('dashboard')}
        className="mb-5 text-sm font-medium"
        style={{ color: 'var(--ink-soft)' }}
      >
        ← Zur Übersicht
      </button>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Meine Wörter</h2>
        <p style={{ color: 'var(--ink-soft)' }}>{q ? `${shown.length} von ${words.length} Wörtern` : `${words.length} Wörter insgesamt`}</p>
      </div>

      {/* Suche */}
      <div className="mb-8 relative">
        <input
          type="text"
          placeholder="Wörter suchen (Deutsch oder Französisch)…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-2xl border px-4 py-3 pr-10 font-sans text-sm outline-none"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }}
          onFocus={e => e.target.style.borderColor = 'var(--blue)'}
          onBlur={e => e.target.style.borderColor = 'var(--line)'}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
            style={{ color: 'var(--ink-faint)' }}
            title="Suche leeren"
          >
            ×
          </button>
        )}
      </div>

      {/* Words List */}
      {loading ? (
        <div style={{ color: 'var(--ink-soft)' }} className="text-center">Lädt...</div>
      ) : words.length === 0 ? (
        <div className="rounded-3xl border p-8 text-center" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink-soft)' }}>
          Keine Wörter vorhanden.
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl border p-8 text-center" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink-soft)' }}>
          Keine Treffer für „{search.trim()}".
        </div>
      ) : (
        <div className="rounded-3xl border overflow-hidden" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
          {/* Desktop Table Header */}
          <div className="hidden sm:grid grid-cols-[1fr_1fr_130px_60px] gap-4 border-b px-6 py-3 font-mono text-xs font-medium uppercase tracking-wider"
            style={{ borderColor: 'var(--line-soft)', backgroundColor: '#f6f7f9', color: 'var(--ink-faint)' }}>
            <div>Deutsches Wort</div>
            <div>Französisches Wort</div>
            <div>Status</div>
            <div></div>
          </div>

          {/* Word Rows */}
          <div>
            {shown.map(word => (
              <div
                key={word.id}
                className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_130px_60px] gap-3 sm:gap-4 border-b px-4 py-4 sm:px-6 sm:py-4 last:border-b-0"
                style={{ borderColor: 'var(--line-soft)' }}
              >
                {/* Mobile labels */}
                <div className="sm:hidden text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                  Deutsch
                </div>
                <div className="font-semibold" style={{ color: 'var(--ink)' }}>{word.german}</div>

                <div className="sm:hidden text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                  Französisch
                </div>
                <div className="flex flex-col gap-1" style={{ color: 'var(--ink-soft)' }}>
                  <span>{word.french}</span>
                  <select
                    value={word.wortart || ''}
                    onChange={e => updateWortart(word.id, e.target.value)}
                    className="w-fit rounded-md border px-1.5 py-0.5 text-xs outline-none"
                    style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface-2)', color: word.wortart ? 'var(--blue-dark)' : 'var(--ink-faint)' }}
                    title="Wortart"
                  >
                    <option value="">Wortart …</option>
                    {WORTARTEN.map(wa => <option key={wa} value={wa}>{wa}</option>)}
                  </select>
                </div>

                <div className="sm:hidden text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                  Status
                </div>
                <div className="flex items-center">
                  <span
                    className="inline-block rounded-lg px-2.5 py-1 text-xs font-medium uppercase tracking-wider"
                    style={getStatusStyle(word.status)}
                  >
                    {getStatusLabel(word.status)}
                  </span>
                </div>

                <div className="text-right">
                  <button
                    onClick={() => handleDeleteWord(word.id)}
                    className="transition-colors text-lg"
                    style={{ color: 'var(--ink-faint)' }}
                    onMouseEnter={e => e.target.style.color = 'var(--ink)'}
                    onMouseLeave={e => e.target.style.color = 'var(--ink-faint)'}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

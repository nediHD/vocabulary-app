import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ManageWords() {
  const [words, setWords] = useState([])
  const [german, setGerman] = useState('')
  const [french, setFrench] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWords()
  }, [])

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

  const handleAddWord = async (e) => {
    e.preventDefault()

    if (!german.trim() || !french.trim()) {
      alert('Bitte füllen Sie beide Felder aus.')
      return
    }

    try {
      const { error } = await supabase.from('cards').insert([
        {
          german: german.trim(),
          french: french.trim(),
          status: 'learning',
          learning_correct_count: 0,
        },
      ])

      if (error) {
        console.error('Error adding word:', error)
        alert('Fehler beim Hinzufügen des Wortes.')
        return
      }

      setGerman('')
      setFrench('')
      await fetchWords()
    } catch (err) {
      console.error('Error:', err)
      alert('Fehler beim Hinzufügen des Wortes.')
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

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>Meine Wörter</h2>
        <p style={{ color: 'var(--ink-soft)' }}>{words.length} Wörter insgesamt</p>
      </div>

      {/* Add Word Form */}
      <form
        onSubmit={handleAddWord}
        className="mb-8 rounded-3xl border p-4"
        style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
          <input
            type="text"
            placeholder="Deutsches Wort"
            value={german}
            onChange={e => setGerman(e.target.value)}
            className="flex-1 rounded-2xl border px-4 py-3 font-sans text-sm outline-none"
            style={{
              borderColor: 'var(--line)',
              backgroundColor: 'var(--surface-2)',
              color: 'var(--ink)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--blue)'}
            onBlur={e => e.target.style.borderColor = 'var(--line)'}
          />
          <input
            type="text"
            placeholder="Französisches Wort"
            value={french}
            onChange={e => setFrench(e.target.value)}
            className="flex-1 rounded-2xl border px-4 py-3 font-sans text-sm outline-none"
            style={{
              borderColor: 'var(--line)',
              backgroundColor: 'var(--surface-2)',
              color: 'var(--ink)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--blue)'}
            onBlur={e => e.target.style.borderColor = 'var(--line)'}
          />
          <button
            type="submit"
            className="rounded-2xl px-4 py-3 font-semibold text-white transition-colors sm:w-auto"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
          >
            Hinzufügen
          </button>
        </div>
      </form>

      {/* Words List */}
      {loading ? (
        <div style={{ color: 'var(--ink-soft)' }} className="text-center">Lädt...</div>
      ) : words.length === 0 ? (
        <div className="rounded-3xl border p-8 text-center" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)', color: 'var(--ink-soft)' }}>
          Keine Wörter vorhanden. Füge dein erstes Wort hinzu!
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
            {words.map(word => (
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
                <div style={{ color: 'var(--ink-soft)' }}>{word.french}</div>

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

import { supabase } from './supabase'
import { classifyWords } from './groq'

let running = false

// Klassifiziert noch nicht bestimmte Wörter (wortart IS NULL) einmalig im Hintergrund.
// Läuft pro Session höchstens einmal; scheitert leise.
export async function ensureWortarten() {
  if (running) return
  running = true
  try {
    for (let batch = 0; batch < 5; batch++) {
      const { data } = await supabase
        .from('cards')
        .select('id, french, german')
        .is('wortart', null)
        .limit(60)
      if (!data || data.length === 0) break
      const res = await classifyWords(data)
      const byId = new Map(res.map(r => [r.id, r]))
      await Promise.all(
        data.map(w => {
          const r = byId.get(w.id) || { wortart: 'Sonstiges', genus: null, verbgruppe: null }
          return supabase.from('cards').update({ wortart: r.wortart, genus: r.genus, verbgruppe: r.verbgruppe }).eq('id', w.id)
        })
      )
      if (data.length < 60) break
    }
  } catch {
    /* leise */
  } finally {
    running = false
  }
}

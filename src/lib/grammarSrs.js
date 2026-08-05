import { GRAMMAR } from './grammar'

// Flache Liste aller Themen mit Pfad-Infos
export function allTopics() {
  const out = []
  for (const s of GRAMMAR) {
    for (const g of s.groups) {
      for (const t of g.topics) {
        out.push({
          key: `${s.id}/${g.id}/${t.id}`,
          sectionId: s.id, groupId: g.id, topicId: t.id,
          sectionName: s.name, groupName: g.name,
          name: t.name, style: t.style,
          section: s, group: g, topic: t,
        })
      }
    }
  }
  return out
}

export const TOTAL_TOPICS = allTopics().length
export const MAX_NEW_PER_DAY = 3

// SRS-Intervalle je Box (in Tagen). Box 0 = Lernen.
const DAYS = [1, 1, 3, 7, 16, 35, 60]

// Nächster Zustand nach einem Test. passed = Score >= 80%.
// prev: { status, box } oder null (brandneues Thema)
export function nextSchedule(prev, passed) {
  const box = prev?.box || 0
  if (passed) {
    const newBox = Math.min(box + 1, DAYS.length - 1)
    return { status: 'review', box: newBox, days: DAYS[newBox] }
  }
  // durchgefallen -> zurück auf Lernen, morgen wieder (mit Hinweisen)
  return { status: 'learning', box: 0, days: 1 }
}

export function todayStr(now) {
  // now: Date (vom Aufrufer übergeben, damit die Lib testbar bleibt)
  const d = now || new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Baut die Tages-Warteschlange:
// - alle fälligen Wiederholungen (status review, next_review_at <= jetzt)
// - + zufällige neue Themen, bis MAX_NEW_PER_DAY heute erreicht ist
// progressRows: [{topic_key, status, box, next_review_at, started_on}]
export function buildQueue(progressRows, now) {
  const nowMs = (now || new Date()).getTime()
  const today = todayStr(now)
  const byKey = new Map(progressRows.map(r => [r.topic_key, r]))
  const topics = allTopics()

  // fällige Wiederholungen + fällige Lern-Themen (learning, next <= jetzt)
  const due = topics.filter(t => {
    const r = byKey.get(t.key)
    return r && new Date(r.next_review_at).getTime() <= nowMs
  })

  const newStartedToday = progressRows.filter(r => r.started_on === today).length
  const newRemaining = Math.max(0, MAX_NEW_PER_DAY - newStartedToday)

  const unstarted = topics.filter(t => !byKey.has(t.key))
  // deterministisch „zufällig" pro Tag mischen (kein Math.random-Zwang, aber wechselnd)
  const seed = today.split('-').reduce((a, c) => a + Number(c), 0)
  const shuffled = [...unstarted].sort((a, b) => hashStr(a.key + seed) - hashStr(b.key + seed))
  const fresh = shuffled.slice(0, newRemaining)

  return {
    due,
    fresh,
    queue: [...due, ...fresh],
    counts: { due: due.length, newRemaining, newStartedToday },
  }
}

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000
  return h
}

// Modus für ein Thema: brandneu oder status learning -> 'guided'; status review -> 'test'
export function topicMode(progressRow) {
  if (!progressRow || progressRow.status === 'learning') return 'guided'
  return 'test'
}

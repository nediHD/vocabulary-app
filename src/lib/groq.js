import { jsonrepair } from 'jsonrepair'

function cleanJSON(str) {
  // Uklanja markdown fence: ```json ... ``` ili ``` ... ```
  let cleaned = String(str || '').trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  }
  // Falls das Modell Text um das JSON herum schreibt: das äußerste
  // Objekt/Array von der ersten Klammer bis zur letzten passenden herausschneiden.
  const firstObj = cleaned.indexOf('{')
  const firstArr = cleaned.indexOf('[')
  let start = -1
  if (firstObj === -1) start = firstArr
  else if (firstArr === -1) start = firstObj
  else start = Math.min(firstObj, firstArr)
  if (start >= 0) {
    const close = cleaned[start] === '{' ? '}' : ']'
    const end = cleaned.lastIndexOf(close)
    if (end > start) cleaned = cleaned.slice(start, end + 1)
  }
  return cleaned.trim()
}

// Kürzt Text sinnvoll: endet am letzten vollständigen Satz (.!?) innerhalb des Limits,
// nie mitten im Satz. Notfalls am letzten Wortende (nie mitten im Wort).
function capText(text, max) {
  if (typeof text !== 'string' || text.length <= max) return text
  const slice = text.slice(0, max)
  const lastEnd = Math.max(
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('?'),
  )
  if (lastEnd > 0) return slice.slice(0, lastEnd + 1).trim()
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim()
}

export async function groupWords(words) {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error('Groq: API Key nicht gesetzt (VITE_GROQ_API_KEY)')
  }

  const wordList = words.map(w => `"${w.french}" (${w.german})`).join(', ')
  const prompt = `Gruppiere diese französischen Wörter intelligent in thematisch zusammenhängende Gruppen mit 2-5 Wörtern pro Gruppe. Verwende nur die französischen Wörter wie unten angegeben:

${wordList}

WICHTIG: Antworte NUR mit gültigem JSON ohne Markdown. Keine Backticks, keine Erklärung.

Beispiel:
{"groups": [["faire", "aller"], ["manger", "faim", "cuisiner"]]}

Jetzt deine Antwort mit der obigen Liste:`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 512,
      }),
    })

    if (!res.ok) {
      let errorMsg = res.statusText
      try {
        const errorData = await res.json()
        errorMsg = errorData.error?.message || errorMsg
      } catch {}
      throw new Error(`Groq: ${errorMsg} (Status ${res.status})`)
    }

    const data = await res.json()
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Groq: Ungültige Antwortstruktur')
    }
    const cleanedContent = cleanJSON(data.choices[0].message.content)
    const parsed = JSON.parse(cleanedContent)
    return parsed.groups
  } catch (err) {
    if (err.message.startsWith('Groq:')) {
      throw err
    }
    if (err instanceof SyntaxError) {
      throw new Error('Groq: Ungültige JSON-Antwort')
    }
    throw new Error(`Groq: Netzwerkfehler - ${err.message}`)
  }
}

export async function generateBatch(words) {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error('Groq: API Key nicht gesetzt (VITE_GROQ_API_KEY)')
  }

  const wordList = words.map(w => `"${w.french}" (${w.german})`).join(', ')
  const prompt = `Schreibe eine kurze, zusammenhängende Geschichte oder Szene auf Französisch mit diesen Wörtern:

${wordList}

LÄNGE: Der Text soll ungefähr 700-800 Zeichen lang sein (mindestens 600 Zeichen, etwa 8-12 vollständige Sätze). Baue eine kleine Situation mit Details, Handlung und Kontext aus, damit der Text natürlich lang genug wird – nicht nur ein paar Sätze, die die Wörter aneinanderreihen.

Jedes der Wörter oben muss mindestens 2-3 Mal im Text vorkommen, in verschiedenen Sätzen und Kontexten. Der Text soll natürlich, flüssig und sinnvoll klingen.

Generiere außerdem Lückentext-Fragen: für jedes Wort ein Satz mit _____ und die richtige Antwort.

WICHTIG: Antworte NUR mit gültigem JSON ohne Markdown. Keine Backticks, keine Erklärung.

Beispiel JSON Format:
{"french": "Je vais faire les devoirs. C'est important faire mes études. Quand je fais le travail, je vais à l'école. Je vais faire de mon mieux.", "questions": [{"sentence": "Je vais _____ les devoirs demain.", "answer": "faire"}, {"sentence": "Je vais _____ à l'école.", "answer": "aller"}]}

Jetzt deine Antwort:`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    if (!res.ok) {
      let errorMsg = res.statusText
      try {
        const errorData = await res.json()
        errorMsg = errorData.error?.message || errorMsg
      } catch {}
      throw new Error(`Groq: ${errorMsg} (Status ${res.status})`)
    }

    const data = await res.json()
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Groq: Ungültige Antwortstruktur')
    }
    const cleanedContent = cleanJSON(data.choices[0].message.content)
    const parsed = JSON.parse(cleanedContent)
    // Sicherheits-Deckel: französischer Text max 800 Zeichen (Kostenbegrenzung TTS)
    if (parsed && typeof parsed.french === 'string') {
      parsed.french = capText(parsed.french, 800)
    }
    return parsed
  } catch (err) {
    if (err.message.startsWith('Groq:')) {
      throw err
    }
    if (err instanceof SyntaxError) {
      throw new Error('Groq: Ungültige JSON-Antwort')
    }
    throw new Error(`Groq: Netzwerkfehler - ${err.message}`)
  }
}

// Lückentext (Cloze) für „Sätze üben": ein zusammenhängender französischer Text (~1600 Zeichen),
// in dem jedes Vorkommen eines Lernworts durch einen Platzhalter {{n}} ersetzt ist.
// Für jede Lücke: exakte Form (answer), deutsche Bedeutung (de), Grundform (base),
// ob die Form von der Grundform abweicht (changed) + kurze deutsche Erklärung (note).
export async function generateCloze(words) {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error('Groq: API Key nicht gesetzt (VITE_GROQ_API_KEY)')
  }

  const wordList = words.map(w => `"${w.french}" (${w.german})`).join(', ')
  const prompt = `Schreibe eine kurze zusammenhängende Erzählung auf Französisch – eine kleine Szene oder Geschichte mit Anfang, Mitte und Ende – mit diesen Lernwörtern:

${wordList}

LÄNGE: ungefähr 1600 Zeichen (mindestens 1400, höchstens 1900).

WICHTIGSTE REGEL – Lückentext: Jedes Vorkommen eines Lernworts im Text wird durch einen Platzhalter {{1}}, {{2}}, {{3}} … ersetzt (fortlaufend nummeriert in der Reihenfolge des Auftretens). Das Lernwort selbst darf an dieser Stelle NICHT im Klartext stehen – dort steht nur der Platzhalter. Jedes Lernwort muss mindestens einmal vorkommen; kommt es mehrmals vor, ist JEDES Vorkommen ein eigener Platzhalter.

Die Wörter dürfen natürlich gebeugt sein (Plural, konjugierte Verbform, weibliche Form, Zeitform usw.), so wie es der Satz verlangt. Andere (nicht gelernte) Wörter bleiben normal im Text.

Für jede Lücke gib an:
- "n": die Nummer des Platzhalters
- "answer": die EXAKTE Form, wie sie an dieser Stelle in den Satz gehört (die gebeugte Form)
- "de": die deutsche Bedeutung (aus der Liste oben)
- "base": die Grundform des französischen Worts (wie in der Liste)
- "changed": true, wenn "answer" von "base" abweicht (gebeugt), sonst false
- "note": NUR wenn changed=true, eine kurze deutsche Erklärung, warum die Form so ist und worauf man achten muss (z. B. "1. Person Singular Präsens von boire", "Plural, weil mehrere", "weibliche Form"). Wenn changed=false, leerer String "".

WICHTIG: Antworte NUR mit gültigem JSON ohne Markdown. Keine Backticks, keine Erklärung außerhalb des JSON.

Beispiel-Format:
{"text":"Le matin, je {{1}} un café avant d'aller au {{2}}. Mes collègues {{3}} aussi beaucoup de café.","blanks":[{"n":1,"answer":"bois","de":"trinken","base":"boire","changed":true,"note":"1. Person Singular Präsens von boire"},{"n":2,"answer":"travail","de":"Arbeit","base":"travail","changed":false,"note":""},{"n":3,"answer":"boivent","de":"trinken","base":"boire","changed":true,"note":"3. Person Plural Präsens von boire"}]}

Jetzt deine Antwort:`

  const content = await callGroq(prompt, { maxTokens: 3000, temperature: 0.6 })
  const parsed = parseGroqJSON(content)

  const text = String(parsed?.text || '')
  const blanks = (Array.isArray(parsed?.blanks) ? parsed.blanks : [])
    .map(b => ({
      n: Number(b.n),
      answer: String(b.answer || '').trim(),
      de: String(b.de || '').trim(),
      base: String(b.base || '').trim(),
      changed: !!b.changed,
      note: String(b.note || '').trim(),
    }))
    .filter(b => Number.isInteger(b.n) && b.answer.length > 0 && text.includes(`{{${b.n}}}`))

  if (!text || blanks.length === 0) throw new Error('Groq: Kein gültiger Lückentext erzeugt')
  return { text, blanks }
}

export async function segmentTranscript(transcript, durationSec) {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error('Groq: API Key nicht gesetzt (VITE_GROQ_API_KEY)')
  }

  // Transkript als Zeilen "[Sekunde] Text" (begrenzt, um Kontext klein zu halten)
  let lines = transcript.map(t => `[${Math.round(t.start)}] ${t.text}`)
  let joined = lines.join('\n')
  if (joined.length > 9000) {
    joined = joined.slice(0, 9000)
  }

  const suggested = Math.min(5, Math.max(2, Math.round((durationSec || 300) / 120)))
  const lastEnd = transcript.length
    ? Math.round(transcript[transcript.length - 1].start + (transcript[transcript.length - 1].dur || 0))
    : durationSec || 0

  const prompt = `Du bekommst das Transkript eines französischen Videos mit Zeitstempeln in Sekunden.
Teile es in ${suggested} (zwischen 2 und 5) sinnvolle Abschnitte an natürlichen Themengrenzen.
Das Video ist ca. ${lastEnd} Sekunden lang.

Für jeden Abschnitt gib zurück:
- "start": Startsekunde (Ganzzahl, = Zeitstempel der ersten Zeile des Abschnitts)
- "end": Endsekunde (Ganzzahl, = ungefähres Ende des Abschnitts; letzter Abschnitt endet bei ${lastEnd})
- "title": kurzer französischer Titel (max 6 Wörter)
- "questions": 2-3 Verständnisfragen AUF FRANZÖSISCH zum Inhalt des Abschnitts, jeweils mit kurzer Musterantwort auf Französisch

WICHTIG: Antworte NUR mit gültigem JSON ohne Markdown. Keine Backticks, keine Erklärung.
Format:
{"segments":[{"start":0,"end":90,"title":"...","questions":[{"question":"...","answer":"..."}]}]}

Transkript:
${joined}`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 2048,
      }),
    })

    if (!res.ok) {
      let errorMsg = res.statusText
      try {
        const errorData = await res.json()
        errorMsg = errorData.error?.message || errorMsg
      } catch {}
      throw new Error(`Groq: ${errorMsg} (Status ${res.status})`)
    }

    const data = await res.json()
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Groq: Ungültige Antwortstruktur')
    }
    const parsed = JSON.parse(cleanJSON(data.choices[0].message.content))
    const segments = (parsed.segments || [])
      .filter(s => typeof s.start === 'number' && typeof s.end === 'number' && s.end > s.start)
      .map(s => ({
        start: Math.max(0, Math.round(s.start)),
        end: Math.round(s.end),
        title: s.title || '',
        questions: Array.isArray(s.questions) ? s.questions.filter(q => q.question && q.answer) : [],
      }))
    if (segments.length === 0) throw new Error('Groq: Keine Abschnitte erzeugt')
    return segments
  } catch (err) {
    if (err.message.startsWith('Groq:')) throw err
    if (err instanceof SyntaxError) throw new Error('Groq: Ungültige JSON-Antwort')
    throw new Error(`Groq: Netzwerkfehler - ${err.message}`)
  }
}

export async function generateSentence(word1, word2) {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error('Groq: API Key nicht gesetzt (VITE_GROQ_API_KEY)')
  }

  const prompt = word2
    ? `Schreibe einen kurzen zusammenhängenden französischen Text (2-5 Sätze) in dem die Wörter "${word1.french}" (= ${word1.german}) und "${word2.french}" (= ${word2.german}) natürlich vorkommen. Die Wörter müssen nicht im gleichen Satz sein. Antworte NUR mit JSON: {"french": "...", "german": "..."}`
    : `Schreibe einen kurzen zusammenhängenden französischen Text (2-5 Sätze) in dem das Wort "${word1.french}" (= ${word1.german}) natürlich vorkommt. Antworte NUR mit JSON: {"french": "...", "german": "..."}`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 256,
      }),
    })

    if (!res.ok) {
      let errorMsg = res.statusText
      try {
        const errorData = await res.json()
        errorMsg = errorData.error?.message || errorMsg
      } catch {}
      throw new Error(`Groq: ${errorMsg} (Status ${res.status})`)
    }

    const data = await res.json()
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Groq: Ungültige Antwortstruktur')
    }
    const cleanedContent = cleanJSON(data.choices[0].message.content)
    return JSON.parse(cleanedContent)
  } catch (err) {
    if (err.message.startsWith('Groq:')) {
      throw err
    }
    if (err instanceof SyntaxError) {
      throw new Error('Groq: Ungültige JSON-Antwort')
    }
    throw new Error(`Groq: Netzwerkfehler - ${err.message}`)
  }
}

// ---- Gemeinsamer Groq-Aufruf (für Hörübung) ----
async function callGroq(prompt, { maxTokens = 1024, temperature = 0.5 } = {}) {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error('Groq: API Key nicht gesetzt (VITE_GROQ_API_KEY)')
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  })
  if (!res.ok) {
    let errorMsg = res.statusText
    try { const e = await res.json(); errorMsg = e.error?.message || errorMsg } catch {}
    throw new Error(`Groq: ${errorMsg} (Status ${res.status})`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Groq: Ungültige Antwortstruktur')
  return content
}

function parseGroqJSON(content) {
  const cleaned = cleanJSON(content)
  try { return JSON.parse(cleaned) }
  catch {
    // llama liefert oft leicht kaputtes JSON (unescapte "-Zeichen, Zeilenumbrüche
    // in Strings, überflüssige Kommas, abgeschnittene Klammern) → automatisch reparieren.
    try { return JSON.parse(jsonrepair(cleaned)) }
    catch (e) {
      // Diagnose: die Roh-Antwort in die Konsole schreiben, damit man sieht, WAS kam.
      const raw = String(content || '')
      try { console.error('[Groq] Roh-Antwort (nicht parsebar):\n', raw) } catch { /* egal */ }
      const snippet = raw.trim().slice(0, 300).replace(/\s+/g, ' ')
      throw new Error(`Groq: Ungültige JSON-Antwort — Anfang der Antwort: „${snippet}…"`)
    }
  }
}

// Segmentiert ein (auch langes) Transkript in sinnvolle Abschnitte (~3 Min, flexibel 2-5 Min).
// transcript: [{start, dur, text}] ; adRanges: [{start,end}] (Werbung, wird aus den Slices entfernt)
// return: [{start, end, title, transcript_slice}]
export async function segmentTranscriptLong(transcript, durationSec, adRanges = []) {
  if (!Array.isArray(transcript) || transcript.length === 0) return []
  const isAd = (sec) => Array.isArray(adRanges) && adRanges.some(a => sec >= a.start && sec < a.end)
  const last = transcript[transcript.length - 1]
  const total = Math.round(durationSec || (last.start + (last.dur || 0)))
  if (total <= 0) return []

  // 1) Kandidaten-Grenzen (Sek) via Groq, fensterweise (damit lange Videos ins Kontextfenster passen)
  const lines = transcript.map(t => `[${Math.round(t.start)}] ${t.text}`)
  const windows = []
  let cur = [], curLen = 0
  for (const ln of lines) {
    if (curLen + ln.length > 7000 && cur.length) { windows.push(cur); cur = []; curLen = 0 }
    cur.push(ln); curLen += ln.length + 1
  }
  if (cur.length) windows.push(cur)

  const candidates = new Set()
  for (const win of windows) {
    const prompt = `Hier ist ein Ausschnitt eines Video-Transkripts (Format: [Sekunde] Text).
Finde die besten Schnittpunkte an natürlichen Themengrenzen. Abschnitte sollen ungefähr 2 Minuten (120 Sek) lang sein, erlaubt 60-240 Sek. Kürzere Abschnitte sind ausdrücklich OK, wenn dort eine klare Themengrenze ist – schneide lieber an einer sinnvollen Grenze als starr nach Zeit.
Antworte NUR mit JSON ohne Markdown: {"boundaries":[Sekunde, Sekunde, ...]} (Startsekunden neuer Abschnitte).

Transkript:
${win.join('\n')}`
    try {
      const parsed = parseGroqJSON(await callGroq(prompt, { maxTokens: 300, temperature: 0.2 }))
      for (const b of (parsed.boundaries || [])) {
        const s = Math.round(Number(b))
        if (Number.isFinite(s) && s > 30 && s < total - 30) candidates.add(s)
      }
    } catch { /* Fenster ignorieren, JS-Fallback greift */ }
  }

  // 2) Grenzen sortieren + zu nahe (<90s) verwerfen
  const merged = []
  for (const b of [...candidates].sort((a, b) => a - b)) {
    if (!merged.length || b - merged[merged.length - 1] >= 45) merged.push(b)
  }

  const nearestLineStart = (sec) => {
    for (const t of transcript) if (t.start >= sec) return Math.round(t.start)
    return sec
  }

  // 3) Segmentgrenzen deterministisch bauen (min 60, max 240 Sek; kürzer an klaren KI-Grenzen erlaubt)
  const segStarts = [0]
  let pos = 0
  let guard = 0
  while (pos < total && guard++ < 500) {
    if (total - pos <= 240) break
    let next = merged.find(b => b >= pos + 60 && b <= pos + 240)
    if (next == null) {
      next = nearestLineStart(pos + 150)
      if (next <= pos + 45 || next >= pos + 240) next = pos + 150
    }
    if (next >= total - 45) break
    segStarts.push(next)
    pos = next
  }

  // 4) Segmente + transcript_slice
  const segs = []
  for (let i = 0; i < segStarts.length; i++) {
    const start = segStarts[i]
    const end = i + 1 < segStarts.length ? segStarts[i + 1] : total
    const slice = transcript
      .filter(t => t.start >= start && t.start < end && !isAd(t.start))
      .map(t => t.text).join(' ').replace(/\s+/g, ' ').trim()
    segs.push({ start, end, title: '', transcript_slice: slice })
  }
  return segs.filter(s => s.transcript_slice.length > 0)
}

// KI-Fallback: erkennt vom Creator platzierte Werbung/Sponsoren im Transkript.
// return: [{start, end}] (Sekunden)
export async function detectAds(transcript) {
  if (!Array.isArray(transcript) || transcript.length === 0) return []
  const lines = transcript.map(t => `[${Math.round(t.start)}] ${t.text}`)
  const windows = []
  let cur = [], curLen = 0
  for (const ln of lines) {
    if (curLen + ln.length > 7000 && cur.length) { windows.push(cur); cur = []; curLen = 0 }
    cur.push(ln); curLen += ln.length + 1
  }
  if (cur.length) windows.push(cur)

  const ranges = []
  for (const win of windows) {
    const prompt = `Hier ist ein Ausschnitt eines Video-Transkripts (Format: [Sekunde] Text).
Finde die Zeitbereiche, die vom CREATOR platzierte WERBUNG / SPONSOR / EIGENWERBUNG sind (z. B. "cette vidéo est sponsorisée par ...", Rabattcodes, Produkt- oder Kurs-Werbung, "va voir mon partenaire ..."). NICHT der eigentliche Inhalt, NICHT normale "abonnez-vous"-Sätze.
Antworte NUR mit JSON ohne Markdown: {"ads":[{"start":Sekunde,"end":Sekunde}]} (leeres Array, wenn keine Werbung vorkommt).

Transkript:
${win.join('\n')}`
    try {
      const parsed = parseGroqJSON(await callGroq(prompt, { maxTokens: 300, temperature: 0.1 }))
      for (const a of (parsed.ads || [])) {
        const s = Math.floor(Number(a.start)), e = Math.ceil(Number(a.end))
        if (Number.isFinite(s) && Number.isFinite(e) && e > s) ranges.push({ start: s, end: e })
      }
    } catch { /* Fenster ignorieren */ }
  }
  // überlappende/benachbarte Bereiche zusammenfassen
  ranges.sort((a, b) => a.start - b.start)
  const merged = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r.start <= last.end + 5) last.end = Math.max(last.end, r.end)
    else merged.push({ ...r })
  }
  return merged
}

// Erzeugt den Podcast-Text (B2, baut auf priorSummary auf) + eine kurze summary für den nächsten Abschnitt.
export async function generatePodcastText(segmentSlice, priorSummaries, segIdx) {
  const sums = Array.isArray(priorSummaries) ? priorSummaries.filter(Boolean) : (priorSummaries ? [priorSummaries] : [])
  const context = sums.length
    ? `Kontext der vorigen Abschnitte (NUR damit dir Namen/Bezüge klar sind – NICHT nacherzählen, NICHT zusammenfassen, NICHT erwähnen):\n${sums.map(s => '- ' + s).join('\n')}\n\n`
    : ''
  const prompt = `Du bist ein Französischlehrer. Du erzählst einem Lerner (Niveau B2) den Inhalt eines Video-Abschnitts VEREINFACHT auf Französisch nach, damit er das Original versteht. Du sprichst ihn per "tu" an.

${context}Transkript DIESES Abschnitts (Französisch, kann Erkennungsfehler enthalten):
"""${segmentSlice}"""

Aufgabe – schreibe den Text auf FRANZÖSISCH:
1. Erzähle NUR den Inhalt DIESES Abschnitts vereinfacht nach – NAH am Original ("fast dasselbe": gleiche Aussagen, gleiche Reihenfolge), nur in einfacherem, klarerem Französisch, damit der Lerner es versteht. Ein schwieriges Wort/einen Ausdruck darfst du ganz kurz eingebettet erklären, wo nötig – aber KEINE langen Exkurse, es bleibt eine Nacherzählung.
2. VERBOTEN am Anfang: keine Begrüßung, KEINE Wiederholung/Zusammenfassung vorheriger Abschnitte, kein "tu te souviens…", kein "on avait vu…", keine Ankündigung ("dans le prochain épisode…").
3. VERBOTEN am Ende: KEINE Fragen an den Lerner ("qu'en penses-tu ?", "tu es prêt ?"), KEINE Floskeln ("reste à l'écoute", "on continue…"), KEINE Moral/Ratschläge. Hör einfach auf, sobald der Inhalt durch ist.
4. Das Transkript enthält oft Erkennungsfehler (falsch geschriebene Namen/Wörter). Korrigiere erkennbare Fehler STILL (nutze den Kontext oben) und plappere die falschen Formen NICHT nach.
5. Kein Füllwerk, keine wiederholten Vergleiche ("c'est comme si…"), kein doppelter Satz.

Flüssiger, gesprochener Stil, KEINE Aufzählungszeichen/Nummerierung. Mindestens 1200 Zeichen, höchstens 4000 Zeichen. Antworte NUR mit JSON ohne Markdown:
{"podcast_text":"...","summary":"1-2 Sätze Zusammenfassung dieses Abschnitts auf Französisch"}`
  const parsed = parseGroqJSON(await callGroq(prompt, { maxTokens: 3500, temperature: 0.6 }))
  return {
    podcast_text: capText(String(parsed.podcast_text || ''), 4500), // ~5 Min Audio; harte TTS-Grenze in inworld.js
    summary: String(parsed.summary || '').slice(0, 500),
  }
}

// 3-4 Multiple-Choice-Fragen (4 Optionen, 1-2 richtig, mit Begründung), an den Podcast gekoppelt.
export async function generateMCQuestions(podcastText, segmentSlice) {
  const prompt = `Erstelle 3-4 Multiple-Choice-Fragen auf FRANZÖSISCH, die prüfen, ob der Lerner den französischen Abschnitt SPRACHLICH VERSTANDEN hat.

Transkript des Abschnitts (Original-Audio – DAS ist maßgeblich):
"""${String(segmentSlice || '').slice(0, 3500)}"""

Podcast (Erklärung dazu, nur Hilfskontext):
"""${String(podcastText || '').slice(0, 4000)}"""

ZIEL: KEIN bloßes Faktenraten, sondern Textverständnis auf Französisch – der Sinn einer Aussage, die Bedeutung eines Ausdrucks/Worts IM KONTEXT, wer/was mit etwas gemeint ist, was eine Formulierung impliziert.

Regeln:
- Jede Frage hat genau 4 Antwortoptionen. 1 ODER 2 sind richtig (variiere). Verrate NICHT, wie viele.
- STRENG VERANKERT: Jede richtige Antwort muss sich WÖRTLICH aus dem TRANSKRIPT belegen lassen. Rate NICHTS, erfinde keine Fakten, kein "probablement".
- Baue MINDESTENS EINE knifflige Frage ein (feines Detail, leicht zu überhören), damit echtes Verstehen geprüft wird – nicht zu offensichtlich.
- KEINE zwei Fragen mit derselben Antwort oder demselben Inhalt. Jede Frage prüft etwas ANDERES.
- Die falschen Optionen sind eindeutig falsch, aber trotzdem plausibel.
- "justification": 1 Satz auf Französisch, warum die richtige(n) Antwort(en) stimmt/stimmen.
- "source": kopiere hier WÖRTLICH den kurzen Satz AUS DEM TRANSKRIPT (nicht aus dem Podcast, NICHT korrigiert, exakt dieselben Wörter), an dem die Antwort gesagt wird. Damit kann der Lerner genau diese Stelle im Original-Audio anhören. Halte "source" kurz (ein Satz).

Antworte NUR mit JSON ohne Markdown:
{"questions":[{"statement":"...","options":["A","B","C","D"],"correct":[0],"justification":"...","source":"wörtliches Zitat aus dem Transkript"}]}`
  const parsed = parseGroqJSON(await callGroq(prompt, { maxTokens: 2400, temperature: 0.4 }))
  const out = (parsed.questions || [])
    .filter(q => q && Array.isArray(q.options) && q.options.length === 4 && Array.isArray(q.correct))
    .map(q => ({
      statement: String(q.statement || ''),
      options: q.options.map(o => String(o)),
      correct: [...new Set(q.correct.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 4))],
      justification: String(q.justification || ''),
      source: String(q.source || '').slice(0, 400),
    }))
    .filter(q => q.statement && q.correct.length >= 1 && q.correct.length <= 2)
    .slice(0, 4)
  if (out.length === 0) throw new Error('Groq: Keine gültigen Fragen erzeugt')
  return out
}

// „Warum ist meine Antwort falsch?" – erklärt auf Deutsch, warum die GEWÄHLTE Option
// inhaltlich nicht stimmt. Nur auf Klick (kleiner Aufruf, maxTokens gedeckelt).
export async function explainWhyWrong({ statement, options, chosen, correct, podcastText, transcriptSlice }) {
  const opt = i => (options[i] != null ? String(options[i]) : '')
  const chosenTxt = (chosen || []).map(opt).filter(Boolean).join('  |  ') || '(keine)'
  const correctTxt = (correct || []).map(opt).filter(Boolean).join('  |  ')
  const prompt = `Ein Lerner hat bei einer INHALTLICHEN Verständnisfrage zu einem französischen Video-Abschnitt falsch geantwortet.
Erkläre auf DEUTSCH in 2–3 kurzen Sätzen, warum die vom Lerner gewählte Antwort inhaltlich NICHT stimmt und was stattdessen richtig ist. Beziehe dich auf den Inhalt des Abschnitts, nicht auf Grammatik.

Frage: "${String(statement || '')}"
Vom Lerner gewählt (falsch): "${chosenTxt}"
Richtig wäre: "${correctTxt}"

Kontext – Erklärung/Podcast des Abschnitts:
"""${String(podcastText || '').slice(0, 2500)}"""

Transkript des Abschnitts (Französisch):
"""${String(transcriptSlice || '').slice(0, 1500)}"""`
  return String(await callGroq(prompt, { maxTokens: 350, temperature: 0.4 })).trim()
}

// Freies, INHALTLICHES Nachfragen zum Abschnitt. Antwortet in der Sprache der Frage
// (Deutsch -> Deutsch, Französisch -> Französisch). Nur auf Klick, gedeckelt.
export async function askAboutSegment(question, { podcastText, transcriptSlice } = {}) {
  const q = String(question || '').trim().slice(0, 300)
  if (!q) throw new Error('Keine Frage.')
  const prompt = `Du bist ein hilfsbereiter Französisch-Lehrer und hilfst einem Lerner, den INHALT eines Video-Abschnitts zu verstehen.
- Beantworte inhaltliche Fragen zum Abschnitt (was passiert, wer/was ist gemeint, was bedeutet eine Aussage).
- Antworte in DERSELBEN Sprache, in der die Frage gestellt ist: deutsche Frage -> deutsche Antwort, französische Frage -> französische Antwort.
- Kurz und klar, 2–4 Sätze. Wenn die Antwort nicht aus dem Abschnitt hervorgeht, sag das ehrlich.

Transkript des Abschnitts (Französisch):
"""${String(transcriptSlice || '').slice(0, 3000)}"""

Erklärung/Podcast dazu:
"""${String(podcastText || '').slice(0, 3000)}"""

Frage des Lerners:
"""${q}"""`
  return String(await callGroq(prompt, { maxTokens: 400, temperature: 0.4 })).trim()
}

// Grammatik-Übungen: 5-6 gemischte Übungen (Lücke „cloze" / Auswahl „choice"),
// bevorzugt mit den Wiederholungs-Wörtern des Lerners. Die Erklärung wird NICHT hier
// erzeugt, sondern fest aus der DB (grammar_explanations) geladen.
// Kein TTS -> günstiger Textcall (maxTokens gedeckelt).
// style: 'form' (v. a. Lücke) | 'contrast' (v. a. Auswahl/Unterschied) | 'mixed'
export async function generateGrammarExercises({ path, topic, style = 'mixed', words = [] }) {
  const wordList = (words || []).slice(0, 12).map(w => `"${w.french}" (${w.german})`).join(', ')
  const wordsBlock = wordList
    ? `Der Lerner wiederholt gerade diese eigenen Wörter – BAUE SIE BEVORZUGT in die Übungen ein, wo sie inhaltlich passen (ruhig gebeugt/konjugiert, wie der Satz es verlangt). Passt ein Wort nicht zum Thema, lass es weg und erfinde stattdessen passende, einfache französische Wörter:\n${wordList}`
    : `Der Lerner hat gerade keine Wiederholungs-Wörter. Erfinde selbst passende, einfache und gängige französische Wörter für die Übungen.`

  const isVerbTense = /Verben/.test(path) && !/vs\.|Passiv|Pronominale|Faire|Si-Sätze|Accord/.test(topic)
  const styleHint = style === 'contrast'
    ? 'Schwerpunkt: „choice"-Übungen (den Unterschied erkennen). Dazu 1 „transform". Erkläre bei jeder, WARUM diese Variante passt und die andere(n) nicht.'
    : isVerbTense
    ? 'Beginne mit GENAU EINER „table" (alle 6 Formen eines Verbs in dieser Zeit). Dazu „cloze“ und 1 „transform“.'
    : style === 'form'
    ? 'Schwerpunkt „cloze“ (Form einsetzen). Wo sinnvoll 1 „transform“ oder 1 „choice“.'
    : 'Mische „cloze“ und „choice“, wo sinnvoll 1 „transform“.'

  const prompt = `Du bist ein Französischlehrer und erstellst Grammatik-Übungen für einen deutschsprachigen Lerner (Niveau ca. B1–B2).

Thema: ${path} — „${topic}".

${wordsBlock}

Aufgabe: Erstelle "exercises" – 5–6 Übungen auf FRANZÖSISCH, alle exakt zu diesem Thema. ${styleHint}

Übungs-Typen (mische passend):
- "cloze": französischer Satz mit genau EINER Lücke als _____ . "answer"=exakte richtige Form. "answer_display"=dieselbe Form, aber der WICHTIGE TEIL (Endung/geänderter Teil) in ~Tilden~ markiert (z. B. "ir~ai~", "parl~ait~", "petit~e~"). "hint"=kurzer deutscher Hinweis. "explain"=kurze deutsche Begründung.
- "choice": Satz/Frage; "options"=3–4 Optionen; "correct"=Index (0-basiert) der EINEN richtigen; "explain"=deutsche Begründung, warum richtig und die anderen nicht.
- "table": Konjugationstabelle. "verb"=Infinitiv, "label"=z. B. "Présent von parler". "rows"=genau 6 Objekte für je, tu, il/elle, nous, vous, ils/elles: {"p":"je","answer":"parle","display":"parl~e~"} (display markiert die Endung in ~Tilden~).
- "transform": "prompt"=deutsche Anweisung + französischer Ausgangssatz (z. B. "Setze ins Imparfait: Je mange une pomme."). "answer"=der komplette umgeformte Satz. "answer_display"=derselbe Satz mit dem/den geänderten Wort-Teil(en) in ~Tilden~. "explain"=kurze deutsche Begründung.

Regeln: genau EINE eindeutige Lösung pro Übung (keine mehrdeutigen Antworten). Markiere in "display"/"answer_display" möglichst nur die relevante Endung, nicht das ganze Wort.

WICHTIG: Antworte NUR mit gültigem JSON ohne Markdown. Keine Backticks, keine Erklärung außerhalb des JSON.
{"exercises":[{"type":"table","verb":"parler","label":"Présent von parler","rows":[{"p":"je","answer":"parle","display":"parl~e~"},{"p":"tu","answer":"parles","display":"parl~es~"},{"p":"il/elle","answer":"parle","display":"parl~e~"},{"p":"nous","answer":"parlons","display":"parl~ons~"},{"p":"vous","answer":"parlez","display":"parl~ez~"},{"p":"ils/elles","answer":"parlent","display":"parl~ent~"}]},{"type":"cloze","prompt":"Demain, je _____ à Paris.","answer":"irai","answer_display":"ir~ai~","hint":"aller, 1. P. Sg. Futur simple","explain":"„demain“ + einmalige Zukunft → Futur simple."},{"type":"transform","prompt":"Setze ins Imparfait: Nous mangeons ensemble.","answer":"Nous mangions ensemble.","answer_display":"Nous mang~ions~ ensemble.","explain":"Imparfait-Endung -ions bei nous."}]}`

  const parsed = parseGroqJSON(await callGroq(prompt, { maxTokens: 2600, temperature: 0.5 }))
  const exercises = (Array.isArray(parsed?.exercises) ? parsed.exercises : [])
    .map(e => {
      if (!e || typeof e !== 'object') return null
      const t = e.type
      if (t === 'choice') {
        const options = Array.isArray(e.options) ? e.options.map(o => String(o)) : []
        const correct = Number(e.correct)
        if (options.length < 2 || !Number.isInteger(correct) || correct < 0 || correct >= options.length) return null
        return { type: 'choice', prompt: String(e.prompt || ''), options, correct, explain: String(e.explain || '') }
      }
      if (t === 'table') {
        const rows = (Array.isArray(e.rows) ? e.rows : [])
          .map(r => ({ p: String(r.p || '').trim(), answer: String(r.answer || '').trim(), display: String(r.display || r.answer || '').trim() }))
          .filter(r => r.p && r.answer)
        if (rows.length < 2) return null
        return { type: 'table', verb: String(e.verb || ''), label: String(e.label || ''), rows: rows.slice(0, 6) }
      }
      if (t === 'transform') {
        const answer = String(e.answer || '').trim()
        const p = String(e.prompt || '').trim()
        if (!answer || !p) return null
        return { type: 'transform', prompt: p, answer, answer_display: String(e.answer_display || answer), explain: String(e.explain || '') }
      }
      // default: cloze
      const answer = String(e.answer || '').trim()
      const p = String(e.prompt || '')
      if (!answer || !p.includes('_')) return null
      return { type: 'cloze', prompt: p, answer, answer_display: String(e.answer_display || answer), hint: String(e.hint || ''), explain: String(e.explain || '') }
    })
    .filter(Boolean)
    .slice(0, 6)
  if (exercises.length === 0) throw new Error('Groq: Keine Grammatik-Übungen erzeugt')
  return { exercises }
}

// Reicher Übungssatz für das Grammatik-Lernsystem: gemischte, GEWICHTETE Typen,
// schwer (B2–C1), mit den Wiederholungs-Wörtern des Lerners. withHints steuert,
// ob deutsche Hinweise mitgeliefert werden (Lernrunde ja, Testrunde nein).
// Typen: choice (antippen, w1) · cloze mit 1+ Lücken (w2) · table (w3) ·
//        transform (w3) · open (frei, KI-bewertet, w3)
export async function generateGrammarSet({ path, topic, style = 'mixed', sectionId = '', guide = '', targetWords = [], contextWords = [], words = [], count = 10, withHints = true }) {
  const fmt = ws => (ws || []).slice(0, 10).map(w => `"${w.french}" (${w.german})`).join(', ')
  const tW = fmt(targetWords)
  const cW = fmt(contextWords)
  const legacy = fmt(words)
  // Konjugationstabelle (6 Personen) NUR bei Verbzeiten/-modi sinnvoll.
  const allowTable = sectionId === 'verben'
  let wordsBlock
  if (tW || cW) {
    wordsBlock = [
      tW ? `ZIELWÖRTER des Lerners (bevorzugt einbauen, passend zur Regel beugen/testen): ${tW}.` : '',
      cW ? `KONTEXTWÖRTER (nur als Umgebung/Nomen im Satz, NIE als das getestete Element, und NUR wenn sie NATÜRLICH passen): ${cW}.` : '',
      'Wenn ein Wort des Lerners nicht natürlich in eine Übung zu DIESEM Thema passt, LASS ES WEG und nimm ein einfaches, gängiges französisches Wort. Erzwinge nie ein unpassendes Wort.',
    ].filter(Boolean).join('\n')
  } else if (legacy) {
    wordsBlock = `Nutze BEVORZUGT diese Wörter des Lerners, aber nur wo sie natürlich passen: ${legacy}. Sonst gängige Wörter erfinden.`
  } else {
    wordsBlock = `Erfinde passende, gängige, EINFACHE französische Wörter für den Satzrahmen.`
  }
  const hintRule = withHints
    ? 'Gib bei Schreib-Übungen ein Feld "hint": ein KONKRETER, KORREKTER deutscher Hinweis zur jeweiligen Lücke (z. B. „Adjektiv an die richtige Stelle" oder „aller, Passé composé, il"). Keine allgemeinen/pauschalen Hinweise.'
    : 'KEINE Hinweise: lass "hint" weg oder leer.'

  const typeLines = [
    '- "choice" (antippen): "prompt" Satz/Frage, "options" 3–4 EINFACHE STRINGS (keine Objekte!), "correct" Index (0-basiert) der EINEN richtigen. Gut für „welche Variante/Stellung/Form ist richtig?".',
    '- "cloze" (schreiben, EINE oder MEHRERE Lücken): "prompt" mit jeder Lücke als _____ . "blanks": Array in Reihenfolge der Lücken, je {"answer":"exakte Form","display":"Form mit ~markiertem Teil~","hint":"deutscher Hinweis"}.',
    allowTable ? '- "table" (Verb-Konjugation, NUR bei Verbzeiten/-modi): "verb", "label" (z. B. "Imparfait von finir"), "rows" genau 6: {"p":"je","answer":"finissais","display":"finiss~ais~"}.' : '',
    '- "transform" (umformen): "prompt" deutsche Anweisung + französischer Satz, "answer" kompletter umgeformter Satz, "answer_display" mit ~geändertem Teil~, "hint".',
    '- "open" (frei, KI-bewertet): "prompt" eine Aufgabe, bei der der Lerner selbst einen Satz bildet — die Aufgabe MUSS die Regel DIESES Themas üben. "sample" eine Musterlösung.',
  ].filter(Boolean).join('\n')

  const prompt = `Du bist ein strenger Französischlehrer und erstellst ANSPRUCHSVOLLE, aber FAIRE Grammatik-Übungen (Niveau B1–B2) für einen deutschsprachigen Lerner.

THEMA (nur darum geht es): ${path} — „${topic}".

⛔ STRIKTE THEMENBINDUNG — die wichtigste Regel:
- JEDE einzelne Übung muss GENAU die Regel dieses Themas prüfen: „${topic}".
- Prüfe NICHTS anderes.${allowTable ? '' : ' KEINE Verbkonjugation, KEINE Zeitformen'} — kein fremdes Grammatikkapitel, kein reines Vokabelraten.
- Geht es im Thema um STELLUNG / REIHENFOLGE / POSITION, dann teste die WORTSTELLUNG: der Lerner muss das Element (z. B. das Adjektiv) an die richtige Stelle setzen — nicht raten, welches Wort inhaltlich passt.
- Jede Übung muss eine EINDEUTIGE Lösung haben, die sich aus der Regel ergibt. Keine Lücke, deren Antwort man nicht wissen kann.
- Sätze kurz, klar, natürlich. Lieber einfache Sätze mit sauberer Regel als komplizierte, schiefe Sätze.

${guide ? `📋 ÜBUNGS-LEITFADEN für genau dieses Thema (VERBINDLICH — halte dich exakt daran):\n${guide}\n` : ''}
${wordsBlock}

Erzeuge ${count} Übungen, abwechslungsreich gemischt (verschiedene Typen), alle zum Thema „${topic}".

Typen:
${typeLines}

PFLICHTFELDER für JEDE Übung:
- "de": kurze, natürliche deutsche Übersetzung des französischen Satzes (bei "open" die Aufgabe kurz umschreiben; bei "table" die deutsche Bedeutung des Verbs).
- "explain": erkläre auf DEUTSCH WANN/WO und WARUM diese Lösung richtig ist (welche Regel/Situation) UND warum die naheliegende falsche Alternative hier NICHT passt. 1–2 klare Sätze, konkret zum Satz — nicht nur die Endung nennen.

${hintRule}
Markiere in display/answer_display nur den relevanten Teil mit ~Tilden~.

Antworte NUR mit gültigem JSON ohne Markdown. Beispiel für das THEMA Adjektiv-Stellung (passe Inhalt an DEIN Thema an!):
{"exercises":[{"type":"choice","prompt":"Welche Stellung ist richtig?","de":"ein rotes Auto","options":["une rouge voiture","une voiture rouge"],"correct":1,"explain":"Farben stehen IMMER nach dem Nomen → une voiture rouge. Vor dem Nomen (une rouge voiture) ist falsch — das gibt es nur bei kurzen BANGS-Adjektiven."},{"type":"cloze","prompt":"Stell das Adjektiv „petit" an die richtige Stelle: J'ai un _____ chien.","de":"Ich habe einen kleinen Hund.","blanks":[{"answer":"petit","display":"~petit~","hint":"BANGS-Adjektiv (Größe) → vor dem Nomen"}],"explain":"„petit" gehört zu den kurzen BANGS-Adjektiven (Size) und steht deshalb VOR dem Nomen: un petit chien. Nach dem Nomen (un chien petit) wäre falsch."}]}`

  let parsed
  try {
    parsed = parseGroqJSON(await callGroq(prompt, { maxTokens: 6000, temperature: 0.6 }))
  } catch {
    // llama liefert gelegentlich unvollständiges/kaputtes JSON – ein Wiederholungsversuch
    parsed = parseGroqJSON(await callGroq(prompt, { maxTokens: 6000, temperature: 0.4 }))
  }
  // Option kann versehentlich als Objekt kommen ({text:…}/{option:…}) → sauberen String ziehen
  const optText = o => {
    if (o == null) return ''
    if (typeof o === 'object') return String(o.text ?? o.option ?? o.value ?? o.label ?? o.answer ?? '').trim()
    return String(o).trim()
  }
  const out = (Array.isArray(parsed?.exercises) ? parsed.exercises : [])
    .map(e => {
      if (!e || typeof e !== 'object') return null
      const t = e.type
      const de = String(e.de || '').trim()
      if (t === 'choice') {
        const options = Array.isArray(e.options) ? e.options.map(optText) : []
        const correct = Number(e.correct)
        if (options.length < 2 || options.some(o => !o) || !Number.isInteger(correct) || correct < 0 || correct >= options.length) return null
        return { type: 'choice', prompt: String(e.prompt || ''), de, options, correct, explain: String(e.explain || ''), weight: 1 }
      }
      if (t === 'table') {
        if (!allowTable) return null // keine Verbkonjugation außerhalb der Verb-Kapitel
        const rows = (Array.isArray(e.rows) ? e.rows : [])
          .map(r => ({ p: String(r.p || '').trim(), answer: String(r.answer || '').trim(), display: String(r.display || r.answer || '').trim() }))
          .filter(r => r.p && r.answer)
        if (rows.length < 2) return null
        return { type: 'table', verb: String(e.verb || ''), label: String(e.label || ''), de, rows: rows.slice(0, 6), explain: String(e.explain || ''), weight: 3 }
      }
      if (t === 'transform') {
        const answer = String(e.answer || '').trim()
        const p = String(e.prompt || '').trim()
        if (!answer || !p) return null
        return { type: 'transform', prompt: p, de, answer, answer_display: String(e.answer_display || answer), hint: withHints ? String(e.hint || '') : '', explain: String(e.explain || ''), weight: 3 }
      }
      if (t === 'open') {
        const p = String(e.prompt || '').trim()
        if (!p) return null
        return { type: 'open', prompt: p, de, sample: String(e.sample || ''), explain: String(e.explain || ''), weight: 3 }
      }
      // default: cloze (1+ Lücken)
      const p = String(e.prompt || '')
      let blanks = Array.isArray(e.blanks) ? e.blanks : null
      if (!blanks && e.answer) blanks = [{ answer: e.answer, display: e.answer_display || e.answer, hint: e.hint }]
      blanks = (blanks || [])
        .map(b => ({ answer: String(b.answer || '').trim(), display: String(b.display || b.answer || '').trim(), hint: withHints ? String(b.hint || '') : '' }))
        .filter(b => b.answer)
      if (!p.includes('_') || blanks.length === 0) return null
      return { type: 'cloze', prompt: p, de, blanks, explain: String(e.explain || ''), weight: 2 }
    })
    .filter(Boolean)
    .slice(0, count)
  if (out.length === 0) throw new Error('Groq: Keine Grammatik-Übungen erzeugt')
  return out
}

// KI bewertet eine freie („open") Antwort. Gibt { correct, feedback(DE) } zurück.
export async function gradeOpenAnswer({ path, topic, prompt, sample, userAnswer }) {
  const ua = String(userAnswer || '').trim().slice(0, 400)
  if (!ua) return { correct: false, feedback: 'Keine Antwort eingegeben.' }
  const p = `Du bewertest die Antwort eines Lerners in einer französischen Grammatik-Übung.
Thema: ${path} — „${topic}".
Aufgabe: "${String(prompt || '')}"
Musterlösung (Beispiel): "${String(sample || '')}"
Antwort des Lerners: "${ua}"

Bewerte, ob die Antwort die Aufgabe grammatisch korrekt und passend zum Thema erfüllt (kleine Tippfehler bei Akzenten NICHT hart bewerten). Antworte NUR mit JSON:
{"correct": true/false, "feedback": "1-2 kurze deutsche Sätze: was gut/falsch war, ggf. Korrektur"}`
  try {
    const parsed = parseGroqJSON(await callGroq(p, { maxTokens: 250, temperature: 0.2 }))
    return { correct: !!parsed.correct, feedback: String(parsed.feedback || '').trim() }
  } catch {
    return { correct: false, feedback: 'Bewertung nicht möglich.' }
  }
}

// „Warum falsch?" für eine Grammatik-Übung – erklärt auf Deutsch den Fehler.
export async function explainGrammarWrong({ path, topic, prompt, correct, userAnswer }) {
  const p = `Ein Lerner hat bei einer Grammatik-Übung (Thema: ${path} — „${topic}") falsch geantwortet.
Aufgabe: "${String(prompt || '')}"
Richtige Lösung: "${String(correct || '')}"
Antwort des Lerners: "${String(userAnswer || '(leer)')}"
Erkläre auf DEUTSCH in 2–3 kurzen Sätzen: WANN/WO man die richtige Form benutzt (welche Situation, welcher Auslöser oder welches Signalwort sie verlangt), WARUM sie hier stimmt und warum die Form des Lerners hier NICHT passt. Konkret auf diesen Satz bezogen, nicht nur allgemein die Endung nennen.`
  return String(await callGroq(p, { maxTokens: 260, temperature: 0.3 })).trim()
}

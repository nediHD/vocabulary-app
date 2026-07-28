function cleanJSON(str) {
  // Uklanja markdown fence: ```json ... ``` ili ``` ... ```
  let cleaned = str.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
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
  try { return JSON.parse(cleanJSON(content)) }
  catch { throw new Error('Groq: Ungültige JSON-Antwort') }
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
Finde die besten Schnittpunkte an natürlichen Themengrenzen, damit Abschnitte ungefähr 3 Minuten (180 Sek) lang sind (erlaubt 120-300 Sek).
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
    if (!merged.length || b - merged[merged.length - 1] >= 90) merged.push(b)
  }

  const nearestLineStart = (sec) => {
    for (const t of transcript) if (t.start >= sec) return Math.round(t.start)
    return sec
  }

  // 3) Segmentgrenzen deterministisch bauen (min 120, max 300 Sek)
  const segStarts = [0]
  let pos = 0
  let guard = 0
  while (pos < total && guard++ < 500) {
    if (total - pos <= 300) break
    let next = merged.find(b => b >= pos + 120 && b <= pos + 300)
    if (next == null) {
      next = nearestLineStart(pos + 180)
      if (next <= pos + 60 || next >= pos + 300) next = pos + 180
    }
    if (next >= total - 60) break
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
export async function generatePodcastText(segmentSlice, priorSummary, segIdx) {
  const context = priorSummary
    ? `Bisher in den vorigen Abschnitten: ${priorSummary}\n\n`
    : ''
  const prompt = `Du bist ein Französischlehrer und machst einen fortlaufenden Podcast. Du sprichst direkt mit einem Lerner (Niveau B2) und redest ihn per "tu" an.

${context}Dies ist Abschnitt ${segIdx + 1}. Transkript dieses Abschnitts (Französisch):
"""${segmentSlice}"""

Aufgabe – schreibe den Podcast-Text auf FRANZÖSISCH:
1. FORTLAUFEND: Das ganze Video ist EIN durchgehender Podcast in mehreren Teilen. Dieser Teil setzt den vorigen nahtlos fort (kurze Anknüpfung, KEINE neue Begrüßung/Folge). Erster Teil = passender Einstieg.
2. Erzähle in einfachem Französisch NACH, was in diesem Abschnitt passiert (der Inhalt/die Handlung), sodass der Lerner es leicht versteht.
3. Erkläre dabei die WICHTIGEN Wörter und Ausdrücke aus dem Abschnitt (was sie bedeuten) – eingebettet in den Text, nicht als Liste.
Sprich den Lerner die GANZE Zeit direkt an (per "tu"), wie ein Lehrer im Gespräch – KEIN distanzierter Erzählton. Einfaches, verständliches Französisch (B2), natürlicher gesprochener Podcast-Stil, fließend, KEINE Aufzählungszeichen oder Nummerierung.

WICHTIG: mindestens 3000 Zeichen, höchstens 5000 Zeichen. Antworte NUR mit JSON ohne Markdown:
{"podcast_text":"...","summary":"1-2 Sätze Zusammenfassung dieses Abschnitts auf Französisch"}`
  const parsed = parseGroqJSON(await callGroq(prompt, { maxTokens: 3500, temperature: 0.6 }))
  return {
    podcast_text: capText(String(parsed.podcast_text || ''), 5000),
    summary: String(parsed.summary || '').slice(0, 500),
  }
}

// 3-4 Multiple-Choice-Fragen (4 Optionen, 1-2 richtig, mit Begründung), an den Podcast gekoppelt.
export async function generateMCQuestions(podcastText, segmentSlice) {
  const prompt = `Basierend auf diesem Podcast (Erklärung eines französischen Video-Abschnitts) und dem Transkript, erstelle 3-4 Multiple-Choice-Fragen auf FRANZÖSISCH.

Podcast:
"""${String(podcastText || '').slice(0, 6000)}"""

Transkript-Abschnitt:
"""${String(segmentSlice || '').slice(0, 3000)}"""

Regeln:
- Jede Frage hat genau 4 Antwortoptionen.
- 1 ODER 2 Optionen sind richtig (variiere – mal 1, mal 2). Verrate NICHT, wie viele richtig sind.
- Die Fragen beziehen sich auf Inhalte, die im Podcast erklärt wurden – aber NICHT zu offensichtlich (plausible falsche Optionen).
- Zu jeder Frage ein Satz "justification" auf Französisch: warum die richtige(n) Antwort(en) richtig ist/sind.

Antworte NUR mit JSON ohne Markdown:
{"questions":[{"statement":"...","options":["A","B","C","D"],"correct":[0],"justification":"..."}]}`
  const parsed = parseGroqJSON(await callGroq(prompt, { maxTokens: 2000, temperature: 0.5 }))
  const out = (parsed.questions || [])
    .filter(q => q && Array.isArray(q.options) && q.options.length === 4 && Array.isArray(q.correct))
    .map(q => ({
      statement: String(q.statement || ''),
      options: q.options.map(o => String(o)),
      correct: [...new Set(q.correct.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 4))],
      justification: String(q.justification || ''),
    }))
    .filter(q => q.statement && q.correct.length >= 1 && q.correct.length <= 2)
    .slice(0, 4)
  if (out.length === 0) throw new Error('Groq: Keine gültigen Fragen erzeugt')
  return out
}

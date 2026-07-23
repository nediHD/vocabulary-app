function cleanJSON(str) {
  // Uklanja markdown fence: ```json ... ``` ili ``` ... ```
  let cleaned = str.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  return cleaned.trim()
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
  const prompt = `Schreibe einen zusammenhängenden französischen Text (6-10 Sätze) mit diesen Wörtern:

${wordList}

WICHTIG: Jedes Wort muss mindestens 2-3 Mal im Text vorkommen, in verschiedenen Kontexten und Sätzen. Der Text sollte natürlich und sinnvoll klingen.

Generiere auch Lückentext-Fragen. Für jedes Wort: ein Satz mit _____ und die richtige Antwort.

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
        max_tokens: 1024,
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

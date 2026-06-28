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

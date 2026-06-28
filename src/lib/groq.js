export async function groupWords(words) {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error('Groq: API Key nicht gesetzt (VITE_GROQ_API_KEY)')
  }

  const wordList = words.map(w => `"${w.french}" (${w.german})`).join(', ')
  const prompt = `Gruppiere diese französischen Wörter intelligent in thematisch zusammenhängende Gruppen mit 2-5 Wörtern pro Gruppe:

${wordList}

Antworte NUR mit JSON. Beispiel format:
{"groups": [["faire", "aller"], ["manger", "faim", "cuisiner"], ...]}

Die Wörter können mehrfach vorkommen. Verwende die französischen Wörter wie oben angegeben.`

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
    const parsed = JSON.parse(data.choices[0].message.content)
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
  const prompt = `Schreibe einen zusammenhängenden französischen Text (5-8 Sätze) in dem diese Wörter natürlich vorkommen:

${wordList}

Die Wörter müssen nicht im gleichen Satz sein. Der Text sollte Sinn machen.

Generiere auch Lückentext-Fragen. Für jedes Wort oben: ersetze es mit _____ in einem Satz und gib die richtige Antwort an.

Beispiel für "faire":
- Frage: "Je vais _____ les devoirs demain."
- Antwort: "faire"

Antworte NUR mit JSON:
{"french": "...", "questions": [{"sentence": "..._____...", "answer": "faire"}, ...]}`

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
    const parsed = JSON.parse(data.choices[0].message.content)
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
    return JSON.parse(data.choices[0].message.content)
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

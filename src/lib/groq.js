export async function generateSentence(word1, word2) {
  const prompt = word2
    ? `Schreibe einen kurzen zusammenhängenden französischen Text (2-5 Sätze) in dem die Wörter "${word1.french}" (= ${word1.german}) und "${word2.french}" (= ${word2.german}) natürlich vorkommen. Die Wörter müssen nicht im gleichen Satz sein. Antworte NUR mit JSON: {"french": "...", "german": "..."}`
    : `Schreibe einen kurzen zusammenhängenden französischen Text (2-5 Sätze) in dem das Wort "${word1.french}" (= ${word1.german}) natürlich vorkommt. Antworte NUR mit JSON: {"french": "...", "german": "..."}`

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
    const error = await res.json()
    throw new Error(`Groq API error: ${error.error?.message || res.statusText}`)
  }

  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

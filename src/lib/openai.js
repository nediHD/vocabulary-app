export async function textToSpeechBlob(text) {
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    throw new Error('TTS: OpenAI API Key nicht gesetzt (VITE_OPENAI_API_KEY)')
  }

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'nova',
      }),
    })

    if (!res.ok) {
      let errorMsg = res.statusText
      try {
        const errorData = await res.json()
        errorMsg = errorData.error?.message || errorMsg
      } catch {}
      throw new Error(`TTS: ${errorMsg} (Status ${res.status})`)
    }

    return await res.blob()
  } catch (err) {
    if (err.message.startsWith('TTS:')) {
      throw err
    }
    throw new Error(`TTS: Netzwerkfehler - ${err.message}`)
  }
}

export async function textToSpeech(text) {
  const blob = await textToSpeechBlob(text)
  return URL.createObjectURL(blob)
}

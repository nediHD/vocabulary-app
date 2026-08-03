import { supabase } from './supabase'

// Fehler, wenn das fal.ai-Guthaben leer ist
export class FalBalanceError extends Error {
  constructor(message = 'Kein Guthaben mehr auf fal.ai.') {
    super(message)
    this.name = 'FalBalanceError'
  }
}

// Kosten-/Längen-Obergrenze pro Abschnitt.
// Inworld TTS wird PRO ZEICHEN abgerechnet und die Audiolänge hängt direkt an der
// Zeichenzahl. ~900 Zeichen ≈ 1 Min gesprochenes Französisch -> 4500 ≈ ~5 Min.
// Harte Grenze: es wird NIE mehr als ~5 Min vertont (= bezahlt), egal wie lang der Text ist.
export const MAX_TTS_CHARS = 4500
export const MAX_TTS_MINUTES = 5

// Auf <= max Zeichen kürzen, aber an einer Satzgrenze (kein abgeschnittenes Wort/Satz)
function truncateToSentence(text, max) {
  const clean = String(text || '').trim()
  if (clean.length <= max) return clean
  const slice = clean.slice(0, max)
  const lastEnd = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?'))
  if (lastEnd > 0) return slice.slice(0, lastEnd + 1).trim()
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim()
}

// Text in <=1900-Zeichen-Stücke an Satzgrenzen aufteilen (Inworld-Limit 2000/Call)
function chunkText(text, max = 1900) {
  const clean = String(text || '').trim()
  if (!clean) return []
  if (clean.length <= max) return [clean]
  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) || [clean]
  const chunks = []
  let cur = ''
  for (const s of sentences) {
    if (cur.length + s.length > max) {
      if (cur) { chunks.push(cur.trim()); cur = '' }
      if (s.length > max) {
        for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max).trim())
      } else {
        cur = s
      }
    } else {
      cur += s
    }
  }
  if (cur.trim()) chunks.push(cur.trim())
  return chunks.filter(Boolean)
}

async function ttsChunk(text) {
  const { data, error } = await supabase.functions.invoke('inworld-tts', { body: { text } })
  if (error) {
    let payload = null
    try { payload = await error.context.json() } catch { /* noop */ }
    if (payload?.error === 'NO_BALANCE' || error.context?.status === 402) {
      throw new FalBalanceError(payload?.detail)
    }
    throw new Error(payload?.error || error.message || 'TTS-Fehler')
  }
  if (data?.error === 'NO_BALANCE') throw new FalBalanceError(data.detail)
  if (!data?.audioUrl) throw new Error(data?.error || 'Keine Audio-URL erhalten.')
  return data.audioUrl
}

// Erzeugt aus dem vollen Podcast-Text EIN MP3-Blob:
// chunk -> inworld-tts (WAV-URL) -> decode -> concat -> MP3 (lamejs, mono ~96kbps)
export async function synthesizePodcastMp3(fullText, { onProgress } = {}) {
  // Harte Kostengrenze: nie mehr als ~5 Min (MAX_TTS_CHARS) an TTS schicken.
  const capped = truncateToSentence(fullText, MAX_TTS_CHARS)
  const chunks = chunkText(capped, 1900)
  if (chunks.length === 0) throw new Error('Kein Text für Audio.')

  // 1) Alle Chunks vertonen (WAV-URLs)
  const wavUrls = []
  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(`Audio ${i + 1}/${chunks.length} wird erstellt...`)
    wavUrls.push(await ttsChunk(chunks[i]))
  }

  // 2) WAVs laden + dekodieren (Float32 PCM)
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  const ctx = new AudioCtx()
  let buffers = []
  try {
    for (const url of wavUrls) {
      const ab = await (await fetch(url)).arrayBuffer()
      buffers.push(await ctx.decodeAudioData(ab))
    }
  } catch {
    // Fallback: wenn Dekodieren scheitert, rohe erste WAV zurückgeben (immer noch abspielbar)
    try { ctx.close() } catch { /* noop */ }
    const ab = await (await fetch(wavUrls[0])).arrayBuffer()
    return new Blob([ab], { type: 'audio/wav' })
  }

  const sampleRate = buffers[0].sampleRate
  const monos = buffers.map(b => {
    if (b.numberOfChannels === 1) return b.getChannelData(0)
    const l = b.getChannelData(0), r = b.getChannelData(1)
    const m = new Float32Array(b.length)
    for (let i = 0; i < b.length; i++) m[i] = (l[i] + r[i]) / 2
    return m
  })
  try { ctx.close() } catch { /* noop */ }

  const totalLen = monos.reduce((a, m) => a + m.length, 0)
  const pcm = new Float32Array(totalLen)
  let off = 0
  for (const m of monos) { pcm.set(m, off); off += m.length }

  // 3) MP3 kodieren (lamejs; dynamischer Import -> Code-Splitting nur für Hörübung)
  onProgress?.('MP3 wird erstellt...')
  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const enc = new Mp3Encoder(1, sampleRate, 96) // sampleRate vom Decoder (nicht hart 24000!)

  const int16 = new Int16Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  const parts = []
  const block = 1152
  for (let i = 0; i < int16.length; i += block) {
    const buf = enc.encodeBuffer(int16.subarray(i, i + block))
    if (buf.length > 0) parts.push(new Int8Array(buf))
  }
  const end = enc.flush()
  if (end.length > 0) parts.push(new Int8Array(end))

  return new Blob(parts, { type: 'audio/mpeg' })
}

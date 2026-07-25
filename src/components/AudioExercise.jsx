import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { segmentTranscriptLong, generatePodcastText, generateMCQuestions } from '../lib/groq'
import { synthesizePodcastMp3, FalBalanceError } from '../lib/inworld'

// YouTube IFrame API einmalig laden
let ytReadyPromise = null
function loadYouTubeAPI() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (ytReadyPromise) return ytReadyPromise
  ytReadyPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { if (typeof prev === 'function') prev(); resolve(window.YT) }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return ytReadyPromise
}

function fmtTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function extractVideoId(input) {
  if (!input) return null
  const ps = [
    /youtube\.com\/watch\?[^#]*\bv=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ]
  for (const p of ps) { const m = input.match(p); if (m) return m[1] }
  if (/^[\w-]{11}$/.test(input.trim())) return input.trim()
  return null
}

const BLUE = { backgroundColor: 'var(--blue)' }
const hoverIn = e => (e.target.style.backgroundColor = 'var(--blue-dark)')
const hoverOut = e => (e.target.style.backgroundColor = 'var(--blue)')

export default function AudioExercise({ setView, setInSession }) {
  const [mode, setMode] = useState('overview') // 'overview' | 'loading' | 'exercise'
  const [url, setUrl] = useState('')
  const [loadStep, setLoadStep] = useState('')
  const [error, setError] = useState('')
  const [exercises, setExercises] = useState([])

  const [exerciseId, setExerciseId] = useState(null)
  const [videoId, setVideoId] = useState('')
  const [segments, setSegments] = useState([])
  const [segIdx, setSegIdx] = useState(0)
  const [phase, setPhase] = useState('listen1') // listen1 | podcast | listen2 | mc
  const [playerReady, setPlayerReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [finished, setFinished] = useState(false)

  // Lazy-Generierung
  const [genProgress, setGenProgress] = useState('')
  const [genError, setGenError] = useState('')
  const [balanceError, setBalanceError] = useState('')

  // MC-State
  const [mcIdx, setMcIdx] = useState(0)
  const [selected, setSelected] = useState(new Set())
  const [revealed, setRevealed] = useState(false)

  const playerRef = useRef(null)
  const intervalRef = useRef(null)
  const inflight = useRef(new Set())
  const exIdRef = useRef(null)

  useEffect(() => { exIdRef.current = exerciseId }, [exerciseId])

  const loadOverview = async () => {
    const { data } = await supabase
      .from('audio_exercises')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50)
    setExercises(data || [])
  }

  useEffect(() => {
    loadOverview()
    return () => {
      setInSession(false)
      clearInterval(intervalRef.current)
      try { playerRef.current?.destroy?.() } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Player erstellen wenn Übung aktiv
  useEffect(() => {
    if (mode !== 'exercise' || !videoId) return
    let cancelled = false
    setPlayerReady(false)
    loadYouTubeAPI().then((YT) => {
      if (cancelled) return
      playerRef.current = new YT.Player('yt-player-host', {
        videoId,
        playerVars: { controls: 0, modestbranding: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: (e) => {
            setPlayerReady(true)
            try {
              const vd = e.target.getVideoData?.()
              if (vd?.title && exIdRef.current) {
                supabase.from('audio_exercises').update({ title: vd.title }).eq('id', exIdRef.current).then(() => {}, () => {})
              }
            } catch { /* noop */ }
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) setPlaying(false)
          },
        },
      })
    }).catch(() => setError('YouTube-Player konnte nicht geladen werden.'))
    return () => {
      cancelled = true
      clearInterval(intervalRef.current)
      try { playerRef.current?.destroy?.() } catch { /* noop */ }
      playerRef.current = null
    }
  }, [mode, videoId])

  // Beim Betreten eines Abschnitts: Podcast/Fragen/Audio im Hintergrund erzeugen (überlappt mit listen1)
  useEffect(() => {
    if (mode !== 'exercise' || !segments.length) return
    const seg = segments[segIdx]
    if (seg && !seg.generated) startGeneration(segIdx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, segIdx, exerciseId])

  const podcastUrl = (seg) =>
    seg?.audio_path ? supabase.storage.from('podcast-audio').getPublicUrl(seg.audio_path).data.publicUrl : null

  const updateProgress = (idx, ph) => {
    if (!exerciseId) return
    supabase.from('audio_exercises')
      .update({ last_seg_idx: idx, last_phase: ph, updated_at: new Date().toISOString() })
      .eq('id', exerciseId).then(() => {}, () => {})
  }

  const startGeneration = async (idx) => {
    const seg = segments[idx]
    if (!seg || seg.generated || inflight.current.has(idx)) return
    inflight.current.add(idx)
    setGenError('')
    try {
      const priorSummary = idx > 0 ? (segments[idx - 1]?.summary || '') : ''
      setGenProgress('Podcast-Text wird erstellt…')
      const { podcast_text, summary } = await generatePodcastText(seg.transcript_slice, priorSummary, idx)
      setGenProgress('Fragen werden erstellt…')
      const questions = await generateMCQuestions(podcast_text, seg.transcript_slice)
      const blob = await synthesizePodcastMp3(podcast_text, { onProgress: setGenProgress })
      setGenProgress('Wird gespeichert…')
      const ext = blob.type === 'audio/wav' ? 'wav' : 'mp3'
      const path = `${exerciseId}/${idx}-${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('podcast-audio')
        .upload(path, blob, { contentType: blob.type, upsert: false })
      const audio_path = upErr ? null : path
      if (upErr) console.error('Upload-Fehler:', upErr.message)
      await supabase.from('audio_segments')
        .update({ podcast_text, summary, questions, audio_path, generated: true })
        .eq('id', seg.id)
      setSegments(prev => prev.map(s => s.seg_idx === idx
        ? { ...s, podcast_text, summary, questions, audio_path, generated: true } : s))
      setGenProgress('')
    } catch (e) {
      if (e instanceof FalBalanceError || e?.name === 'FalBalanceError') {
        setBalanceError(e.message || 'Kein Guthaben mehr auf fal.ai.')
      } else {
        setGenError(e?.message || 'Fehler beim Erstellen des Podcasts.')
      }
      setGenProgress('')
    } finally {
      inflight.current.delete(idx)
    }
  }

  // ---- YouTube-Segment abspielen ----
  const playSegment = () => {
    const p = playerRef.current
    const seg = segments[segIdx]
    if (!p || !seg) return
    clearInterval(intervalRef.current)
    p.seekTo(seg.start_sec, true)
    p.playVideo()
    setPlaying(true)
    intervalRef.current = setInterval(() => {
      try {
        if (p.getCurrentTime() >= seg.end_sec) {
          p.pauseVideo(); setPlaying(false); clearInterval(intervalRef.current)
        }
      } catch { /* noop */ }
    }, 250)
  }
  const stopSegment = () => {
    clearInterval(intervalRef.current)
    try { playerRef.current?.pauseVideo?.() } catch { /* noop */ }
    setPlaying(false)
  }

  // ---- Navigation ----
  const enterExercise = async (id) => {
    const { data: ex } = await supabase.from('audio_exercises').select('*').eq('id', id).single()
    const { data: segs } = await supabase.from('audio_segments').select('*').eq('exercise_id', id).order('seg_idx', { ascending: true })
    if (!ex || !segs) { setError('Übung konnte nicht geladen werden.'); setMode('overview'); return }
    setExerciseId(id); exIdRef.current = id
    setVideoId(ex.video_id); setSegments(segs)
    setSegIdx(ex.last_seg_idx || 0)
    setPhase(ex.last_phase || 'listen1')
    setMcIdx(0); setSelected(new Set()); setRevealed(false)
    setFinished(false); setBalanceError(''); setGenError(''); setError('')
    setInSession(true); setMode('exercise')
  }

  const createExercise = async () => {
    setError('')
    const vid = extractVideoId(url.trim())
    if (!vid) { setError('Bitte einen gültigen YouTube-Link einfügen.'); return }
    setMode('loading'); setLoadStep('Wird geprüft…')
    try {
      const { data: existing } = await supabase.from('audio_exercises').select('id').eq('video_id', vid).maybeSingle()
      if (existing) { await enterExercise(existing.id); return }

      setLoadStep('Transkript wird geladen…')
      const { data, error: fnErr } = await supabase.functions.invoke('youtube-transcript', { body: { url: url.trim(), lang: 'fr' } })
      if (fnErr) {
        let m = fnErr.message
        try { const j = await fnErr.context.json(); if (j?.error) m = j.error } catch { /* noop */ }
        setError(m); setMode('overview'); return
      }
      if (data?.error) { setError(data.error); setMode('overview'); return }
      const transcript = data?.transcript || []
      if (!transcript.length) { setError('Kein Transkript gefunden.'); setMode('overview'); return }
      const dur = Math.round(transcript[transcript.length - 1].start + (transcript[transcript.length - 1].dur || 0))

      setLoadStep('Abschnitte werden erstellt…')
      const segs = await segmentTranscriptLong(transcript, dur)
      if (!segs.length) { setError('Konnte keine Abschnitte erstellen.'); setMode('overview'); return }

      const { data: ex, error: exErr } = await supabase.from('audio_exercises').insert({
        video_id: vid, url: url.trim(), language: data.language || 'fr',
        duration_sec: dur, transcript, seg_count: segs.length,
        last_seg_idx: 0, last_phase: 'listen1',
      }).select().single()
      if (exErr) { setError('Speichern fehlgeschlagen: ' + exErr.message); setMode('overview'); return }

      const rows = segs.map((s, i) => ({
        exercise_id: ex.id, seg_idx: i, start_sec: s.start, end_sec: s.end,
        title: s.title || '', transcript_slice: s.transcript_slice, generated: false,
      }))
      const { error: segErr } = await supabase.from('audio_segments').insert(rows)
      if (segErr) { setError('Speichern fehlgeschlagen: ' + segErr.message); setMode('overview'); return }

      setUrl('')
      await enterExercise(ex.id)
    } catch (e) {
      setError(e?.message || 'Unerwarteter Fehler.'); setMode('overview')
    }
  }

  const goPhase = (ph) => { stopSegment(); setPhase(ph); updateProgress(segIdx, ph) }

  const goToSegment = (idx, ph = 'listen1') => {
    stopSegment()
    setSegIdx(idx); setPhase(ph)
    setMcIdx(0); setSelected(new Set()); setRevealed(false)
    setFinished(false)
    updateProgress(idx, ph)
  }

  const nextSegment = () => {
    if (segIdx + 1 >= segments.length) { setFinished(true); updateProgress(segIdx, 'done') }
    else goToSegment(segIdx + 1, 'listen1')
  }

  const backToOverview = () => {
    stopSegment(); setInSession(false); setMode('overview'); loadOverview()
  }

  // ================= RENDER =================

  if (mode === 'loading') {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--ink-soft)' }}>{loadStep || 'Wird geladen…'}</p>
      </div>
    )
  }

  if (mode === 'overview') {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Hörübung</h2>
        <p className="mb-6 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Füge einen YouTube-Link (französisches Video mit Untertiteln) ein. Das Video wird in Abschnitte
          geteilt – du hörst jeden Abschnitt, dann einen erklärenden Podcast, dann nochmal, und beantwortest Fragen.
        </p>

        <input
          type="text"
          placeholder="https://www.youtube.com/watch?v=…"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && createExercise()}
          className="mb-3 w-full rounded-2xl border-2 px-4 py-3.5 outline-none"
          style={{ borderColor: 'var(--blue)', backgroundColor: 'white', color: 'var(--ink)' }}
        />
        {error && <p className="mb-3 text-sm" style={{ color: '#ef4444' }}>{error}</p>}
        <button
          onClick={createExercise}
          className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
          style={BLUE} onMouseEnter={hoverIn} onMouseLeave={hoverOut}
        >
          Übung erstellen
        </button>

        {exercises.length > 0 && (
          <div className="mt-10">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
              Frühere Übungen
            </h3>
            <div className="space-y-2">
              {exercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => enterExercise(ex.id)}
                  className="w-full text-left rounded-2xl border p-4 transition-colors"
                  style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--line-soft)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                >
                  <div className="font-medium truncate" style={{ color: 'var(--ink)' }}>
                    {ex.title || ex.url}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
                    Abschnitt {Math.min((ex.last_seg_idx || 0) + 1, ex.seg_count)} / {ex.seg_count}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => setView('dashboard')} className="mt-8 w-full text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>
          Zur Übersicht
        </button>
      </div>
    )
  }

  // mode === 'exercise'
  const seg = segments[segIdx]
  const hiddenPlayer = (
    <div style={{ position: 'absolute', width: 200, height: 120, opacity: 0.01, pointerEvents: 'none', left: -9999, top: 0 }}>
      <div id="yt-player-host" />
    </div>
  )

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        {hiddenPlayer}
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Übung abgeschlossen! 🎉</h2>
        <p className="mb-8" style={{ color: 'var(--ink-soft)' }}>Gute Arbeit beim Hören!</p>
        <button onClick={backToOverview}
          className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
          style={BLUE} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
          Zurück zur Übersicht
        </button>
      </div>
    )
  }

  if (!seg) return hiddenPlayer

  const isGenerated = seg.generated
  const questions = Array.isArray(seg.questions) ? seg.questions : []

  return (
    <div className="mx-auto max-w-2xl">
      {hiddenPlayer}

      {/* Header + klickbarer Fortschrittsbalken */}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={backToOverview} className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--ink-soft)' }}>
          ← Beenden
        </button>
        <div className="flex flex-1 gap-1 items-center">
          {segments.map((s, i) => (
            <button
              key={i}
              onClick={() => goToSegment(i, 'listen1')}
              title={`Abschnitt ${i + 1}`}
              className="flex-1 h-2 rounded-full transition-all"
              style={{
                backgroundColor: i < segIdx ? '#16a34a' : (i === segIdx ? 'var(--blue)' : (s.generated ? '#86efac' : 'var(--line)')),
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        <div className="font-mono text-xs whitespace-nowrap" style={{ color: 'var(--ink-faint)' }}>
          {segIdx + 1} / {segments.length}
        </div>
      </div>

      {balanceError && (
        <div className="mb-4 rounded-2xl border p-4 text-sm" style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb', color: '#92400e' }}>
          ⚠️ {balanceError} Bereits erstellte Abschnitte funktionieren weiter.
        </div>
      )}

      {/* Phase: listen1 / listen2 (Original-Audio) */}
      {(phase === 'listen1' || phase === 'listen2') && (
        <div className="flex flex-col items-center justify-center py-10 sm:py-16">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--blue)' }}>
            Abschnitt {segIdx + 1}{seg.title ? ' · ' + seg.title : ''}
          </div>
          <p className="mb-8 text-sm" style={{ color: 'var(--ink-soft)' }}>
            {fmtTime(seg.start_sec)} – {fmtTime(seg.end_sec)} · {phase === 'listen1' ? 'Höre den Abschnitt an 🎧' : 'Höre den Abschnitt nochmal 🎧'}
          </p>
          <button
            onClick={playing ? stopSegment : playSegment}
            disabled={!playerReady}
            className="mb-8 rounded-2xl px-8 py-4 font-semibold text-white transition-colors"
            style={{ ...BLUE, opacity: playerReady ? 1 : 0.5 }}
            onMouseEnter={hoverIn} onMouseLeave={hoverOut}
          >
            {!playerReady ? 'Player lädt…' : (playing ? '⏸ Stopp' : '▶ Abschnitt abspielen')}
          </button>

          {phase === 'listen1' ? (
            <button onClick={() => goPhase('podcast')}
              className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
              style={BLUE} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              Weiter zum Podcast →
            </button>
          ) : (
            <button onClick={() => goPhase('mc')}
              className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
              style={BLUE} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              Weiter zu den Fragen →
            </button>
          )}
        </div>
      )}

      {/* Phase: podcast */}
      {phase === 'podcast' && (
        <div className="flex flex-col items-center py-10 sm:py-16">
          <div className="mb-6 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--blue)' }}>
            Podcast · Erklärung (B2)
          </div>

          {!isGenerated ? (
            <div className="text-center">
              {genError ? (
                <>
                  <p className="mb-4 text-sm" style={{ color: '#ef4444' }}>{genError}</p>
                  <button onClick={() => startGeneration(segIdx)}
                    className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
                    style={BLUE} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                    Erneut versuchen
                  </button>
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                  {genProgress || 'Podcast wird erstellt…'}
                </p>
              )}
            </div>
          ) : (
            <>
              {podcastUrl(seg) ? (
                <audio src={podcastUrl(seg)} controls className="mb-8 w-full max-w-md" />
              ) : (
                <p className="mb-6 text-sm" style={{ color: 'var(--ink-faint)' }}>Audio nicht verfügbar – Text unten.</p>
              )}
              <details className="mb-8 w-full max-w-2xl">
                <summary className="cursor-pointer text-sm font-medium" style={{ color: 'var(--blue)' }}>Text anzeigen</summary>
                <div className="mt-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ink-soft)' }}>
                  {seg.podcast_text}
                </div>
              </details>
              <button onClick={() => goPhase('listen2')}
                className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                style={BLUE} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                Weiter →
              </button>
            </>
          )}
        </div>
      )}

      {/* Phase: mc */}
      {phase === 'mc' && (
        <div className="flex flex-col items-center py-10 sm:py-16">
          {questions.length === 0 ? (
            <div className="text-center">
              <p className="mb-6 text-sm" style={{ color: 'var(--ink-soft)' }}>Keine Fragen für diesen Abschnitt.</p>
              <button onClick={nextSegment}
                className="rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                style={BLUE} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                {segIdx + 1 >= segments.length ? 'Fertig' : 'Nächster Abschnitt'}
              </button>
            </div>
          ) : (() => {
            const q = questions[mcIdx]
            const correct = new Set((q.correct || []).map(Number))
            return (
              <>
                <p className="mb-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
                  Frage {mcIdx + 1} von {questions.length}
                </p>
                <div className="mb-6 text-lg leading-relaxed text-center max-w-2xl" style={{ color: 'var(--ink)' }}>
                  {q.statement}
                </div>

                <div className="mb-8 w-full max-w-xl space-y-3">
                  {q.options.map((opt, i) => {
                    const isSel = selected.has(i)
                    const isCorr = correct.has(i)
                    let bg = 'var(--surface)', bc = 'var(--line-soft)'
                    if (revealed) {
                      if (isCorr) { bg = 'var(--blue-tint)'; bc = 'var(--blue-tint-line)' }
                      else if (isSel) { bg = '#fef2f2'; bc = '#fecaca' }
                    } else if (isSel) { bg = 'var(--blue-tint)'; bc = 'var(--blue)' }
                    return (
                      <button
                        key={i}
                        disabled={revealed}
                        onClick={() => setSelected(prev => {
                          const n = new Set(prev)
                          n.has(i) ? n.delete(i) : n.add(i)
                          return n
                        })}
                        className="w-full text-left rounded-2xl border-2 p-4 transition-colors"
                        style={{ borderColor: bc, backgroundColor: bg, color: 'var(--ink)' }}
                      >
                        <span className="font-medium">{opt}</span>
                        {revealed && isCorr && <span className="ml-2">✓</span>}
                        {revealed && isSel && !isCorr && <span className="ml-2">✗</span>}
                      </button>
                    )
                  })}
                </div>

                {!revealed ? (
                  <button
                    onClick={() => setRevealed(true)}
                    disabled={selected.size === 0}
                    className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                    style={{ ...BLUE, opacity: selected.size === 0 ? 0.5 : 1 }}
                    onMouseEnter={hoverIn} onMouseLeave={hoverOut}
                  >
                    Auflösen
                  </button>
                ) : (
                  <div className="w-full max-w-2xl">
                    <div className="mb-6 rounded-2xl border p-5" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
                      <div className="mb-1 font-mono text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>
                        {[...selected].sort().join(',') === [...correct].sort().join(',') ? 'Richtig ✓' : 'Nicht ganz'}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--ink)' }}>{q.justification}</div>
                    </div>
                    <button
                      onClick={() => {
                        if (mcIdx + 1 < questions.length) { setMcIdx(mcIdx + 1); setSelected(new Set()); setRevealed(false) }
                        else nextSegment()
                      }}
                      className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                      style={BLUE} onMouseEnter={hoverIn} onMouseLeave={hoverOut}
                    >
                      {mcIdx + 1 < questions.length ? 'Nächste Frage' : (segIdx + 1 >= segments.length ? 'Fertig' : 'Nächster Abschnitt')}
                    </button>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

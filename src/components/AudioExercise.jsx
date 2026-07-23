import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { segmentTranscript } from '../lib/groq'

// YouTube IFrame API einmalig laden
let ytReadyPromise = null
function loadYouTubeAPI() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (ytReadyPromise) return ytReadyPromise
  ytReadyPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev()
      resolve(window.YT)
    }
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

export default function AudioExercise({ setView, setInSession }) {
  const [mode, setMode] = useState('setup') // 'setup' | 'exercise'
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadStep, setLoadStep] = useState('')
  const [error, setError] = useState('')

  const [videoId, setVideoId] = useState('')
  const [segments, setSegments] = useState([])
  const [playerReady, setPlayerReady] = useState(false)

  const [segIdx, setSegIdx] = useState(0)
  const [phase, setPhase] = useState('listen') // 'listen' | 'questions'
  const [qIdx, setQIdx] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [finished, setFinished] = useState(false)

  const playerRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    return () => {
      setInSession(false)
      clearInterval(intervalRef.current)
      try { playerRef.current?.destroy?.() } catch { /* noop */ }
    }
  }, [])

  // Player erstellen, sobald videoId gesetzt und Ansicht "exercise"
  useEffect(() => {
    if (mode !== 'exercise' || !videoId) return
    let cancelled = false
    loadYouTubeAPI().then((YT) => {
      if (cancelled) return
      playerRef.current = new YT.Player('yt-player-host', {
        videoId,
        playerVars: { controls: 0, modestbranding: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
              setPlaying(false)
            }
          },
        },
      })
    }).catch(() => setError('YouTube-Player konnte nicht geladen werden.'))
    return () => { cancelled = true }
  }, [mode, videoId])

  const createExercise = async () => {
    setError('')
    if (!url.trim()) { setError('Bitte einen YouTube-Link einfügen.'); return }
    setLoading(true)
    try {
      setLoadStep('Transkript wird geladen...')
      const { data, error: fnErr } = await supabase.functions.invoke('youtube-transcript', {
        body: { url: url.trim(), lang: 'fr' },
      })
      if (fnErr) {
        let msg = fnErr.message
        try { const j = await fnErr.context.json(); if (j?.error) msg = j.error } catch { /* noop */ }
        setError(msg); setLoading(false); return
      }
      if (data?.error) { setError(data.error); setLoading(false); return }
      if (!data?.transcript?.length) { setError('Kein Transkript gefunden.'); setLoading(false); return }

      const dur = data.transcript[data.transcript.length - 1].start + (data.transcript[data.transcript.length - 1].dur || 0)
      setLoadStep('Abschnitte werden erstellt...')
      const segs = await segmentTranscript(data.transcript, dur)

      setVideoId(data.videoId)
      setSegments(segs)
      setSegIdx(0)
      setPhase('listen')
      setQIdx(0)
      setUserInput('')
      setRevealed(false)
      setFinished(false)
      setInSession(true)
      setMode('exercise')
    } catch (err) {
      setError(err.message || 'Unerwarteter Fehler.')
    } finally {
      setLoading(false)
    }
  }

  const playSegment = () => {
    const p = playerRef.current
    const seg = segments[segIdx]
    if (!p || !seg) return
    clearInterval(intervalRef.current)
    p.seekTo(seg.start, true)
    p.playVideo()
    setPlaying(true)
    intervalRef.current = setInterval(() => {
      try {
        const t = p.getCurrentTime()
        if (t >= seg.end) {
          p.pauseVideo()
          setPlaying(false)
          clearInterval(intervalRef.current)
        }
      } catch { /* noop */ }
    }, 250)
  }

  const stopSegment = () => {
    const p = playerRef.current
    clearInterval(intervalRef.current)
    try { p?.pauseVideo?.() } catch { /* noop */ }
    setPlaying(false)
  }

  const handleStop = () => {
    if (confirm('Übung beenden?')) {
      stopSegment()
      setInSession(false)
      setView('dashboard')
    }
  }

  const nextSegment = () => {
    stopSegment()
    if (segIdx + 1 >= segments.length) {
      setFinished(true)
    } else {
      setSegIdx(segIdx + 1)
      setPhase('listen')
      setQIdx(0)
      setUserInput('')
      setRevealed(false)
    }
  }

  const btn = {
    backgroundColor: 'var(--blue)',
  }
  const btnHover = e => (e.target.style.backgroundColor = 'var(--blue-dark)')
  const btnLeave = e => (e.target.style.backgroundColor = 'var(--blue)')

  // ---------- SETUP ----------
  if (mode === 'setup') {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Hörübung</h2>
        <p className="mb-6 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Füge einen YouTube-Link (französisches Video mit Untertiteln) ein. Das Video wird
          in Abschnitte geteilt – du hörst jeden Abschnitt und beantwortest Fragen.
        </p>

        <input
          type="text"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && !loading && createExercise()}
          className="mb-4 w-full rounded-2xl border-2 px-4 py-3.5 font-sans outline-none"
          style={{ borderColor: 'var(--blue)', backgroundColor: 'white', color: 'var(--ink)' }}
        />

        {error && <p className="mb-4 text-sm" style={{ color: '#ef4444' }}>{error}</p>}

        <button
          onClick={createExercise}
          disabled={loading}
          className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
          style={{ ...btn, opacity: loading ? 0.6 : 1 }}
          onMouseEnter={btnHover}
          onMouseLeave={btnLeave}
        >
          {loading ? (loadStep || 'Wird erstellt...') : 'Übung erstellen'}
        </button>

        <button
          onClick={() => setView('dashboard')}
          className="mt-4 w-full text-sm font-medium"
          style={{ color: 'var(--ink-soft)' }}
        >
          Zur Übersicht
        </button>
      </div>
    )
  }

  const seg = segments[segIdx]

  // Hidden/klein: Player bleibt im DOM (sonst kein Audio), aber unauffällig
  const hiddenPlayer = (
    <div style={{ position: 'absolute', width: 200, height: 120, opacity: 0.01, pointerEvents: 'none', left: -9999, top: 0 }}>
      <div id="yt-player-host" />
    </div>
  )

  // ---------- FINISHED ----------
  if (finished) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        {hiddenPlayer}
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Übung abgeschlossen! 🎉</h2>
        <p className="mb-8" style={{ color: 'var(--ink-soft)' }}>Gute Arbeit beim Hören!</p>
        <button
          onClick={() => { setInSession(false); setView('dashboard') }}
          className="rounded-2xl px-6 py-3 font-semibold text-white transition-colors"
          style={btn} onMouseEnter={btnHover} onMouseLeave={btnLeave}
        >
          Zur Übersicht
        </button>
      </div>
    )
  }

  // ---------- EXERCISE ----------
  return (
    <div className="mx-auto max-w-2xl">
      {hiddenPlayer}

      {/* Header mit Fortschritt */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={handleStop}
          className="text-sm font-medium whitespace-nowrap"
          style={{ color: 'var(--ink-soft)' }}
        >
          ← Beenden
        </button>
        <div className="flex flex-1 gap-1 items-center">
          {segments.map((_, i) => (
            <div key={i} className="flex-1 h-2 rounded-full"
              style={{ backgroundColor: i < segIdx ? '#16a34a' : (i === segIdx ? 'var(--blue)' : 'var(--line)') }} />
          ))}
        </div>
        <div className="font-mono text-xs whitespace-nowrap" style={{ color: 'var(--ink-faint)' }}>
          {segIdx + 1} / {segments.length}
        </div>
      </div>

      {/* Phase: Listen */}
      {phase === 'listen' && (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--blue)' }}>
            Abschnitt {segIdx + 1}{seg.title ? ' · ' + seg.title : ''}
          </div>
          <p className="mb-8 text-sm" style={{ color: 'var(--ink-soft)' }}>
            {fmtTime(seg.start)} – {fmtTime(seg.end)} · Höre den Abschnitt an 🎧
          </p>

          <button
            onClick={playing ? stopSegment : playSegment}
            disabled={!playerReady}
            className="mb-8 rounded-2xl px-8 py-4 font-semibold text-white transition-colors"
            style={{ ...btn, opacity: playerReady ? 1 : 0.5 }}
            onMouseEnter={btnHover} onMouseLeave={btnLeave}
          >
            {!playerReady ? 'Player lädt...' : (playing ? '⏸ Stopp' : '▶ Abschnitt abspielen')}
          </button>

          <button
            onClick={() => { stopSegment(); setPhase('questions'); setQIdx(0); setUserInput(''); setRevealed(false) }}
            className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
            style={btn} onMouseEnter={btnHover} onMouseLeave={btnLeave}
          >
            Weiter zu den Fragen →
          </button>
        </div>
      )}

      {/* Phase: Questions */}
      {phase === 'questions' && (
        <div className="flex flex-col items-center py-12 sm:py-20">
          {seg.questions.length === 0 ? (
            <div className="text-center">
              <p className="mb-6 text-sm" style={{ color: 'var(--ink-soft)' }}>Keine Fragen für diesen Abschnitt.</p>
              <button onClick={nextSegment}
                className="rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                style={btn} onMouseEnter={btnHover} onMouseLeave={btnLeave}>
                {segIdx + 1 >= segments.length ? 'Fertig' : 'Nächster Abschnitt'}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center max-w-2xl">
                <p className="mb-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
                  Frage {qIdx + 1} von {seg.questions.length}
                </p>
                <div className="text-lg leading-relaxed mb-2" style={{ color: 'var(--ink)' }}>
                  {seg.questions[qIdx].question}
                </div>
              </div>

              {/* Erneut anhören möglich */}
              <button
                onClick={playing ? stopSegment : playSegment}
                disabled={!playerReady}
                className="mb-6 text-sm font-medium"
                style={{ color: 'var(--blue)' }}
              >
                {playing ? '⏸ Stopp' : '🔁 Abschnitt erneut hören'}
              </button>

              {!revealed ? (
                <>
                  <input
                    type="text"
                    placeholder="Antwort eingeben..."
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && setRevealed(true)}
                    className="mb-6 w-full max-w-sm rounded-2xl border-2 px-4 py-4 text-center text-lg outline-none"
                    style={{ borderColor: 'var(--blue)', backgroundColor: 'white', color: 'var(--ink)' }}
                    autoFocus
                  />
                  <button onClick={() => setRevealed(true)}
                    className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                    style={btn} onMouseEnter={btnHover} onMouseLeave={btnLeave}>
                    Aufdecken
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-8 flex w-full flex-col gap-4 sm:flex-row max-w-2xl">
                    <div className="flex-1 rounded-2xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
                      <div className="mb-1 font-mono text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>Deine Antwort</div>
                      <div className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{userInput || '—'}</div>
                    </div>
                    <div className="flex-1 rounded-2xl border p-5" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
                      <div className="mb-1 font-mono text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>Musterantwort</div>
                      <div className="text-lg font-semibold" style={{ color: 'var(--blue-dark)' }}>{seg.questions[qIdx].answer}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (qIdx + 1 < seg.questions.length) {
                        setQIdx(qIdx + 1); setUserInput(''); setRevealed(false)
                      } else {
                        nextSegment()
                      }
                    }}
                    className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
                    style={btn} onMouseEnter={btnHover} onMouseLeave={btnLeave}
                  >
                    {qIdx + 1 < seg.questions.length
                      ? 'Nächste Frage'
                      : (segIdx + 1 >= segments.length ? 'Fertig' : 'Nächster Abschnitt')}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

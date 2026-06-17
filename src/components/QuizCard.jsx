export default function QuizCard({
  word,
  direction,
  pills,
  currentCardId,
  sessionSize,
  phase,
  userAnswer,
  onAnswerChange,
  onReveal,
  onGrade,
  onStop,
}) {
  const prompt =
    direction === 'de→fr'
      ? word.german
      : word.french

  const correctAnswer =
    direction === 'de→fr'
      ? word.french
      : word.german

  const directionLabel =
    direction === 'de→fr'
      ? 'Deutsch → Französisch'
      : 'Französisch → Deutsch'

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header with 15-pill progress bar */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={onStop}
          className="text-sm font-medium transition-colors whitespace-nowrap"
          style={{ color: 'var(--ink-soft)' }}
          onMouseEnter={e => e.target.style.color = 'var(--ink)'}
          onMouseLeave={e => e.target.style.color = 'var(--ink-soft)'}
        >
          ← Beenden
        </button>

        {/* 15 pills */}
        <div className="flex flex-1 gap-1 items-center">
          {pills.map((pill) => {
            let bgColor = 'var(--line)'
            if (pill.color === 'red') bgColor = '#ef4444'
            if (pill.color === 'light-green') bgColor = '#86efac'
            if (pill.color === 'dark-green') bgColor = '#16a34a'

            const isCurrent = pill.id === currentCardId

            return (
              <div
                key={pill.id}
                className="flex-1 h-2 rounded-full transition-all"
                style={{
                  backgroundColor: bgColor,
                  outline: isCurrent ? '2px solid var(--blue)' : 'none',
                  outlineOffset: '4px',
                }}
              />
            )
          })}
        </div>

        {/* Counter */}
        <div className="font-mono text-xs whitespace-nowrap" style={{ color: 'var(--ink-faint)' }}>
          {pills.filter(p => p.color === 'dark-green').length} / {sessionSize}
        </div>
      </div>

      {phase === 'input' ? (
        // Input Phase
        <div className="flex flex-col items-center justify-center py-12 sm:py-20">
          <div className="mb-6 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--blue)' }}>
            {directionLabel}
          </div>
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl font-bold sm:text-6xl" style={{ color: 'var(--ink)' }}>
              {prompt}
            </div>
            <div style={{ color: 'var(--ink-soft)' }} className="text-sm">Übersetze:</div>
          </div>
          <input
            type="text"
            placeholder="Antworte hier..."
            value={userAnswer}
            onChange={e => onAnswerChange(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && onReveal()}
            className="mb-6 w-full max-w-sm rounded-2xl border-2 px-4 py-4 text-center font-sans text-lg outline-none"
            style={{
              borderColor: 'var(--blue)',
              backgroundColor: 'white',
              color: 'var(--ink)',
            }}
            autoFocus
          />
          <button
            onClick={onReveal}
            className="w-full max-w-sm rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
          >
            Aufdecken
          </button>
        </div>
      ) : (
        // Reveal Phase
        <div className="flex flex-col items-center py-12 sm:py-20">
          <div className="mb-8 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--blue)' }}>
            {directionLabel}
          </div>
          <div className="mb-12 text-center">
            <div className="text-4xl font-bold sm:text-5xl" style={{ color: 'var(--ink)' }}>
              {prompt}
            </div>
          </div>

          {/* Answer Comparison */}
          <div className="mb-12 flex w-full flex-col gap-4 sm:flex-row max-w-2xl">
            <div className="flex-1 rounded-2xl border p-5" style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--surface)' }}>
              <div className="mb-1 font-mono text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                Deine Antwort
              </div>
              <div className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{userAnswer}</div>
            </div>
            <div className="flex-1 rounded-2xl border p-5" style={{ borderColor: 'var(--blue-tint-line)', backgroundColor: 'var(--blue-tint)' }}>
              <div className="mb-1 font-mono text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--blue-dark)' }}>
                Richtige Antwort
              </div>
              <div className="text-lg font-semibold" style={{ color: 'var(--blue-dark)' }}>
                {correctAnswer}
              </div>
            </div>
          </div>

          {/* Grade Buttons */}
          <div className="flex w-full max-w-2xl gap-4">
            <button
              onClick={() => onGrade('nicht_gewusst')}
              className="flex-1 rounded-2xl border px-6 py-3.5 font-semibold transition-colors"
              style={{
                borderColor: 'var(--line-soft)',
                backgroundColor: 'var(--surface)',
                color: 'var(--ink)',
              }}
              onMouseEnter={e => e.target.style.backgroundColor = 'var(--line-soft)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'var(--surface)'}
            >
              Nicht gewusst
            </button>
            <button
              onClick={() => onGrade('gewusst')}
              className="flex-1 rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--blue)' }}
              onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
            >
              Gewusst
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

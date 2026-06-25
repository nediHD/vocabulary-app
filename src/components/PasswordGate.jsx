import { useState } from 'react'

export default function PasswordGate({ setAuthenticated }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (password === 'Ilinka123') {
      setAuthenticated(true)
      localStorage.setItem('appAuth', 'true')
    } else {
      setError('Passwort falsch. Bitte versuche es erneut.')
      setPassword('')
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-sm w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Vokabular</h1>
          <p style={{ color: 'var(--ink-soft)' }}>Passwort erforderlich</p>
        </div>

        <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line-soft)', borderWidth: '1px' }}>
          <div className="mb-6">
            <input
              type="password"
              placeholder="Passwort eingeben..."
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                setError('')
              }}
              onKeyPress={e => e.key === 'Enter' && handleSubmit()}
              className="w-full rounded-2xl border-2 px-4 py-3 text-center font-sans text-lg outline-none"
              style={{
                borderColor: error ? '#ef4444' : 'var(--blue)',
                backgroundColor: 'white',
                color: 'var(--ink)',
              }}
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-6 text-sm text-center" style={{ color: '#ef4444' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full rounded-2xl px-6 py-3.5 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--blue)' }}
            onMouseEnter={e => e.target.style.backgroundColor = 'var(--blue-dark)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'var(--blue)'}
          >
            Zugreifen
          </button>
        </div>
      </div>
    </div>
  )
}

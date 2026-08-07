import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// App ist erfolgreich gestartet → Auto-Reload-Sperre lösen,
// damit ein späterer Deploy erneut einmal nachladen darf.
try {
  sessionStorage.removeItem('reloaded-for-stale-assets')
} catch {
  /* sessionStorage nicht verfügbar – egal */
}

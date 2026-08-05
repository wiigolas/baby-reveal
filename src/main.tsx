import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ── Cache buster ─────────────────────────────────────────────────────────────
// Bump APP_VERSION whenever you reset the database and want all previous
// testers to start fresh (clears their submitted-RSVP flag).
const APP_VERSION = 'v2'
if (localStorage.getItem('baby_reveal_version') !== APP_VERSION) {
  localStorage.removeItem('baby_reveal_submitted')
  localStorage.setItem('baby_reveal_version', APP_VERSION)
}
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

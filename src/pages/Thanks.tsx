import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db } from '../firebase'
import { useSettings } from '../hooks/useSettings'

export default function Thanks() {
  const { state } = useLocation()
  const name: string = state?.name ?? 'vän'
  const gender: 'boy' | 'girl' | null = state?.gender ?? null

  const { settings } = useSettings()
  const [boys, setBoys]   = useState(0)
  const [girls, setGirls] = useState(0)

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'rsvps')),
      snap => {
        const guesses = snap.docs.map(d => d.data().gender).filter(Boolean)
        setBoys(guesses.filter(g => g === 'boy').length)
        setGirls(guesses.filter(g => g === 'girl').length)
      },
      err => console.error('[Thanks] Firestore error:', err.code, err.message)
    )
    return unsub
  }, []) // always listen; showTallyToGuests only controls rendering below

  const emoji = gender === 'boy' ? '💙' : gender === 'girl' ? '💗' : '✨'
  const genderText = gender === 'boy' ? 'en pojke' : gender === 'girl' ? 'en flicka' : 'en överraskning'
  const total = boys + girls
  const boyPct  = total ? Math.round((boys  / total) * 100) : 50
  const girlPct = total ? Math.round((girls / total) * 100) : 50

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 text-center">
      <div className="animate-float text-7xl mb-6">{emoji}</div>

      <h1 className="font-display text-4xl sm:text-5xl text-gray-800 mb-3 animate-slide-up">
        Tack, {name}!
      </h1>
      <p className="text-gray-500 text-lg mb-2 animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0 }}>
        Din gissning är inne — du tror det blir {genderText}.
      </p>
      <p className="text-gray-400 mb-8 animate-fade-in" style={{ animationDelay: '0.3s', opacity: 0 }}>
        Vi får veta på festen! 🎊
      </p>

      {/* Live tally — only shown when setting is on */}
      {settings.showTallyToGuests && total > 0 && (
        <div className="card w-full max-w-xs mb-8 animate-fade-in" style={{ animationDelay: '0.4s', opacity: 0 }}>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Så här gissar alla</p>
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-blue-400">👦 Pojke {boyPct}%</span>
            <span className="text-pink-400">Flicka {girlPct}% 👧</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-sun-50">
            <div className="bg-blue-300 transition-all duration-700" style={{ width: `${boyPct}%` }} />
            <div className="bg-pink-300 flex-1 transition-all duration-700" />
          </div>
          <p className="text-xs text-gray-300 mt-2">{total} gissning{total !== 1 ? 'ar' : ''} totalt</p>
        </div>
      )}

      <Link
        to="/"
        className="btn-secondary animate-fade-in"
        style={{ animationDelay: '0.5s', opacity: 0 }}
      >
        ← Tillbaka till inbjudan
      </Link>
    </div>
  )
}

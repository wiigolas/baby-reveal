import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db } from '../firebase'
import { useSettings } from '../hooks/useSettings'

function makeICS(partyDate: string, partyLocation: string, parentsNames: string): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  const start = new Date(partyDate)
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Baby Reveal//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Gender Reveal – ${parentsNames}`,
    `LOCATION:${partyLocation}`,
    'DESCRIPTION:Du är inbjuden till ett gender reveal party!',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function googleCalendarUrl(partyDate: string, partyLocation: string, parentsNames: string): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  const start = new Date(partyDate)
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Gender Reveal – ${parentsNames}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: 'Du är inbjuden till ett gender reveal party!',
    location: partyLocation,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export default function Thanks() {
  const { state } = useLocation()
  const name: string = state?.name ?? 'vän'
  const gender: 'boy' | 'girl' | null = state?.gender ?? null
  const attending: 'yes' | 'no' = state?.attending ?? 'yes'

  const { settings } = useSettings()
  const [boys, setBoys] = useState(0)
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
  }, [])

  function handleAddToCalendar() {
    const ics = makeICS(settings.partyDate, settings.partyLocation, settings.parentsNames)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gender-reveal.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  const total = boys + girls
  const boyPct = total ? Math.round((boys / total) * 100) : 50
  const girlPct = total ? Math.round((girls / total) * 100) : 50
  const emoji = gender === 'boy' ? '💙' : gender === 'girl' ? '💗' : '✨'

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 text-center">
      <div className="animate-float text-7xl mb-6">{emoji}</div>

      <h1 className="font-display text-4xl sm:text-5xl text-gray-800 mb-3 animate-slide-up">
        Tack, {name}!
      </h1>

      {attending === 'yes' && (
        <p className="text-gray-500 mb-4 animate-fade-in">
          Kom ihåg att komma klädd i{' '}
          {gender === 'boy' ? '💙 blått!' : gender === 'girl' ? '💗 rO.S.A!' : '💙 blått eller 💗 rO.S.A!'}
        </p>
      )}

      <br />

      <Link
        to="/reveal"
        className="btn-primary text-lg px-8 py-4 mb-4 animate-fade-in"
        style={{ animationDelay: '0.3s', opacity: 0 }}
      >
        Se alla gissningar ✨
      </Link>

      {/* Add to calendar — only for attendees with a party date set */}
      {attending === 'yes' && settings.partyDate && (
        <div className="flex flex-col sm:flex-row gap-2 mb-8 animate-fade-in" style={{ animationDelay: '0.35s', opacity: 0 }}>
          <button
            onClick={handleAddToCalendar}
            className="btn-secondary flex items-center gap-2 justify-center"
          >
            📅 Lägg till i kalendern
          </button>
          <a
            href={googleCalendarUrl(settings.partyDate, settings.partyLocation, settings.parentsNames)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 justify-center"
          >
            Google Kalender
          </a>
        </div>
      )}

      {/* Live tally */}
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

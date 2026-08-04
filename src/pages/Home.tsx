import { Link } from 'react-router-dom'
import Countdown from '../components/Countdown'
import { useSettings } from '../hooks/useSettings'

const STORAGE_KEY = 'baby_reveal_submitted'

const Petals = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
    {['🌸', '🌷', '✨', '🌸', '💫', '🌷', '✨', '🌸'].map((emoji, i) => (
      <span
        key={i}
        className="absolute text-2xl opacity-30 animate-float"
        style={{
          left: `${10 + i * 11}%`,
          top: `${5 + (i % 3) * 15}%`,
          animationDelay: `${i * 0.4}s`,
          animationDuration: `${3 + (i % 3)}s`,
        }}
      >
        {emoji}
      </span>
    ))}
  </div>
)

export default function Home() {
  const { settings } = useSettings()
  const alreadySubmitted = !!localStorage.getItem(STORAGE_KEY)
  const PARTY_DATE = new Date(settings.partyDate)
  const PARENTS_NAMES = settings.parentsNames
  const PARTY_LOCATION = settings.partyLocation
  const PARTY_TIME = settings.partyTime

  return (
    <div className="min-h-screen bg-cream relative flex flex-col">
      <Petals />

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center relative">

        {/* Badge */}
        <div className="animate-fade-in mb-6">
          <span className="inline-block bg-sage-100 text-sage-500 text-sm font-medium px-4 py-1.5 rounded-full tracking-wide">
            Du är inbjuden till
          </span>
        </div>

        {/* Headline */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl text-gray-800 leading-tight mb-2">
            Gender Reveal
          </h1>
          <p className="font-display italic text-2xl sm:text-3xl text-sage-400 mb-6">
            hemma hos {PARENTS_NAMES}
          </p>
        </div>

        {/* Party details */}
        <div className="animate-slide-up mb-10" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <div className="card inline-flex flex-col sm:flex-row gap-4 sm:gap-8 px-8 py-5">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-lg">📅</span>
              <span className="font-medium">{PARTY_TIME}</span>
            </div>
            <div className="hidden sm:block w-px bg-sun-100" />
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-lg">📍</span>
              <span className="font-medium">{PARTY_LOCATION}</span>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="animate-slide-up mb-12" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-4 font-body">
            Nedräkning till avslöjandet
          </p>
          <Countdown targetDate={PARTY_DATE} />
        </div>

        {/* CTA */}
        <div className="animate-slide-up flex flex-col sm:flex-row gap-4" style={{ animationDelay: '0.4s', opacity: 0 }}>
          {settings.submissionsLocked ? (
            <div className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gray-100 text-gray-400 text-lg font-medium">
              🔒 Anmälan stängd
            </div>
          ) : alreadySubmitted ? (
            <div className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sage-100 text-sage-500 text-lg font-medium">
              ✓ Du har gissat!
            </div>
          ) : (
            <Link to="/rsvp" className="btn-primary text-lg px-10 py-4">
              OSA &amp; Gissa ✨
            </Link>
          )}
        </div>

        {/* Soft note */}
        <p className="mt-8 text-sm text-gray-400 animate-fade-in" style={{ animationDelay: '0.6s', opacity: 0 }}>
          Skicka din gissning, ge namnförslag och lämna ett meddelande till föräldrarna 💌
        </p>
      </main>
    </div>
  )
}

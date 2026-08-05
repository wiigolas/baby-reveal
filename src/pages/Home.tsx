import { useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import Countdown from '../components/Countdown'
import { useSettings } from '../hooks/useSettings'

const STORAGE_KEY = 'baby_reveal_submitted'
const EXTRA_GUESS_KEY = 'baby_reveal_extra_guess'

interface StoredSubmission {
  name: string
  gender: 'boy' | 'girl' | null
  nameGuess: string
  attending: 'yes' | 'no' | null
}

function ExtraNameGuessCard({ submission }: { submission: StoredSubmission }) {
  const otherGender = submission.gender === 'boy' ? 'girl' : 'boy'
  const otherText   = otherGender === 'girl' ? 'flick' : 'pojk'
  const [name, setName]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(!!localStorage.getItem(EXTRA_GUESS_KEY))
  const [error, setError]         = useState<string | null>(null)

  if (!submission.gender) return null

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSubmitting(true)
    setError(null)
    try {
      await addDoc(collection(db, 'extra_name_guesses'), {
        name:        submission.name,
        forGender:   otherGender,
        nameGuess:   trimmed,
        submittedAt: serverTimestamp(),
      })
      localStorage.setItem(EXTRA_GUESS_KEY, trimmed)
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Något gick fel, försök igen')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mt-4 text-center">
        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/70 border border-sun-100 text-sm text-sage-500 font-medium">
          ✓ {otherText.charAt(0).toUpperCase() + otherText.slice(1)}namn inlämnat!
          <span className="text-gray-400 font-normal">— {localStorage.getItem(EXTRA_GUESS_KEY)}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="mt-4 card max-w-xs mx-auto space-y-3 text-center">
      <p className="text-sm text-gray-600 font-medium">
        Vill du också föreslå ett {otherText}namn?
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={`Föreslå ett ${otherText}namn`}
          className="input-field flex-1 text-sm"
        />
        <button
          onClick={submit}
          disabled={submitting || !name.trim()}
          className="btn-primary text-sm px-4 py-2 disabled:opacity-40"
        >
          {submitting ? '…' : 'Skicka'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

const PETAL_EMOJIS = ['💙', '🩷', '💙', '🩷', '💙', '🩷', '💙', '🩷', '💙', '🩷', '💙', '🩷', '💙', '🩷', '💙', '🩷', '💙', '🩷', '💙', '🩷']

const Petals = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
    {PETAL_EMOJIS.map((emoji, i) => (
      <span
        key={i}
        className="absolute text-2xl opacity-25 animate-float"
        style={{
          left: `${(i * 17 + (i % 3) * 11) % 92}%`,
          top: `${(i * 13 + (i % 4) * 9) % 90}%`,
          animationDelay: `${(i * 0.37) % 3}s`,
          animationDuration: `${3 + (i % 4)}s`,
        }}
      >
        {emoji}
      </span>
    ))}
  </div>
)

export default function Home() {
  const { settings } = useSettings()
  const storedRaw = localStorage.getItem(STORAGE_KEY)
  const alreadySubmitted = !!storedRaw
  const submission: StoredSubmission | null = storedRaw ? JSON.parse(storedRaw) : null
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
            Nedräkning till festen
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
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sage-100 text-sage-500 text-lg font-medium">
                  ✓ Du har gissat!
                </div>
                <Link to="/reveal" className="btn-primary text-lg px-8 py-4">
                  Se alla gissningar ✨
                </Link>
              </div>
              {submission && <ExtraNameGuessCard submission={submission} />}
            </div>
          ) : (
            <Link to="/rsvp" className="btn-primary text-lg px-10 py-4">
              O.S.A &amp; GISSA
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

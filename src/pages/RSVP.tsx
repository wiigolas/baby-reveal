import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useSettings } from '../hooks/useSettings'

type Gender = 'boy' | 'girl' | null
type Attending = 'yes' | 'no' | null
type Dietary = 'yes' | 'no' | null

interface FormState {
  name: string
  attending: Attending
  dietary: Dietary
  dietaryDetails: string
  gender: Gender
  nameGuess: string
  message: string
  guessDate: string
  guessTime: string
  guessWeight: string
  guessLength: string
  guessEyeColor: string
  guessHairColor: string
}

const INITIAL: FormState = {
  name: '',
  attending: null,
  dietary: null,
  dietaryDetails: '',
  gender: null,
  nameGuess: '',
  message: '',
  guessDate: '',
  guessTime: '',
  guessWeight: '',
  guessLength: '',
  guessEyeColor: '',
  guessHairColor: '',
}

const EYE_COLORS = ['Blå', 'Grön', 'Brun', 'Grå']
const HAIR_COLORS = ['Blond', 'Brun', 'Svart', 'Röd', 'Skallig']

const STORAGE_KEY = 'baby_reveal_submitted'

interface Submission {
  name: string
  gender: Gender
  nameGuess: string
  attending: Attending
}

function AlreadySubmitted({ submission }: { submission: Submission }) {
  const genderText = submission.gender === 'boy' ? 'pojke' : submission.gender === 'girl' ? 'flicka' : null
  const emoji = submission.gender === 'boy' ? '💙' : '💗'
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-4 animate-float">{emoji}</div>
      <h1 className="font-display text-3xl text-gray-800 mb-2">Du har redan svarat, {submission.name}!</h1>
      {genderText && (
        <p className="text-gray-500 mb-1">Du gissade: <strong>{genderText}</strong></p>
      )}
      {submission.nameGuess && (
        <p className="text-gray-500 mb-1">Namnsgissning: <strong>{submission.nameGuess}</strong></p>
      )}
      <p className="text-gray-400 text-sm mt-4 mb-8">Vi ses på festen! 🎊</p>
      <Link to="/" className="btn-secondary">← Tillbaka till inbjudan</Link>
    </div>
  )
}

export default function RSVP() {
  const { settings, loading } = useSettings()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [step, setStep] = useState<1 | 2>(1)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const existing = localStorage.getItem(STORAGE_KEY)
  const previousSubmission: Submission | null = existing ? JSON.parse(existing) : null

  if (previousSubmission) {
    return <AlreadySubmitted submission={previousSubmission} />
  }

  // Wait for settings to load before rendering anything — prevents flash of form when locked
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-sage-300 text-4xl animate-float">💕</div>
      </div>
    )
  }

  if (settings.submissionsLocked) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="font-display text-3xl text-gray-800 mb-2">Anmälan stängd</h1>
        <p className="text-gray-400 mb-6">Värden har stängt för gissningar — vi ses på festen!</p>
        <Link to="/" className="btn-secondary">← Tillbaka till inbjudan</Link>
      </div>
    )
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function canProceedStep1() {
    if (form.name.trim().length < 2) return false
    if (form.attending === null) return false
    if (form.attending === 'yes' && form.dietary === null) return false
    if (form.attending === 'yes' && form.dietary === 'yes' && form.dietaryDetails.trim().length < 1) return false
    return true
  }

  function canSubmit() {
    return (
      form.gender !== null &&
      form.nameGuess.trim().length >= 1 &&
      form.message.trim().length >= 1 &&
      form.guessDate.length > 0 &&
      form.guessTime.length > 0 &&
      form.guessWeight.length > 0 &&
      form.guessLength.length > 0 &&
      form.guessEyeColor.length > 0 &&
      form.guessHairColor.length > 0
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit()) return
    setSubmitting(true)

    await addDoc(collection(db, 'rsvps'), {
      name: form.name.trim(),
      attending: form.attending,
      dietary: form.dietary,
      dietaryDetails: form.dietary === 'yes' ? form.dietaryDetails.trim() : '',
      gender: form.gender,
      nameGuess: form.nameGuess.trim(),
      message: form.message.trim(),
      guessDate: form.guessDate,
      guessTime: form.guessTime,
      guessWeight: form.guessWeight,
      guessLength: form.guessLength,
      guessEyeColor: form.guessEyeColor,
      guessHairColor: form.guessHairColor,
      submittedAt: serverTimestamp(),
    })

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      name: form.name.trim(),
      gender: form.gender,
      nameGuess: form.nameGuess.trim(),
      attending: form.attending,
    }))

    setSubmitting(false)
    navigate('/thanks', { state: { name: form.name, gender: form.gender, attending: form.attending } })
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto w-full">
        <Link to="/" className="text-sage-300 hover:text-sage-400 transition-colors">
          ← Tillbaka
        </Link>
        <div className="flex gap-2">
          {[1, 2].map(s => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-sun-300' : s < step ? 'w-4 bg-sun-200' : 'w-4 bg-sun-100'
                }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-400">{step} / 2</span>
      </header>

      {/* Form */}
      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-lg space-y-6"
        >
          {step === 1 && (
            <div className="space-y-6 animate-slide-up">
              <div>
                <h1 className="font-display text-3xl text-gray-800 mb-1">Hej! 👋</h1>
                <p className="text-gray-500">Berätta om du kommer</p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600">Ditt namn</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="t.ex. Emma Johansson"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  autoFocus
                />
              </div>

              {/* Attending */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600">Kommer du?</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['yes', 'no'] as Attending[]).map(opt => (
                    <button
                      key={opt as string}
                      type="button"
                      onClick={() => set('attending', opt)}
                      className={`py-4 rounded-2xl border-2 font-medium text-base transition-all duration-200 ${form.attending === opt
                        ? 'border-sage-300 bg-sage-50 text-sage-500 shadow-sm'
                        : 'border-sun-100 text-gray-500 hover:border-sun-200'
                        }`}
                    >
                      {opt === 'yes' ? '🎉 Ja, jag kommer!' : '😢 Kan tyvärr inte'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary — only relevant if attending */}
              {form.attending === 'yes' && <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600">Har du några allergier eller specialkost?</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['yes', 'no'] as Dietary[]).map(opt => (
                    <button
                      key={opt as string}
                      type="button"
                      onClick={() => set('dietary', opt)}
                      className={`py-4 rounded-2xl border-2 font-medium text-base transition-all duration-200 ${form.dietary === opt
                          ? 'border-sage-300 bg-sage-50 text-sage-500 shadow-sm'
                          : 'border-sun-100 text-gray-500 hover:border-sun-200'
                        }`}
                    >
                      {opt === 'yes' ? 'Ja' : 'Nej'}
                    </button>
                  ))}
                </div>
                {form.dietary === 'yes' && (
                  <textarea
                    className="input-field resize-none mt-2"
                    rows={2}
                    placeholder="Berätta vad som gäller, t.ex. glutenfri, laktosfri, nötallergi..."
                    value={form.dietaryDetails}
                    onChange={e => set('dietaryDetails', e.target.value)}
                  />
                )}
              </div>}

              <button
                type="button"
                disabled={!canProceedStep1()}
                onClick={() => setStep(2)}
                className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Nästa →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-slide-up">
              {/* Gender guess */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600">
                  Pojke eller flicka? <span className="text-sage-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => set('gender', 'boy')}
                    className={`gender-btn gender-btn-boy ${form.gender === 'boy' ? 'selected' : ''}`}
                  >
                    <span className="text-4xl">👦</span>
                    <span>Pojke</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => set('gender', 'girl')}
                    className={`gender-btn gender-btn-girl ${form.gender === 'girl' ? 'selected' : ''}`}
                  >
                    <span className="text-4xl">👧</span>
                    <span>Flicka</span>
                  </button>
                </div>
              </div>

              {/* Name guess */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600">
                  Lämna ett namnförslag <span className="text-sage-400">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="t.ex. Oliver eller Amelia"
                  value={form.nameGuess}
                  onChange={e => set('nameGuess', e.target.value)}
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600">
                  Lämna ett meddelande till föräldrarna <span className="text-sage-400">*</span>
                </label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Kan inte vänta på att träffa den lilla! 💕"
                  value={form.message}
                  onChange={e => set('message', e.target.value)}
                />
              </div>

              {/* Baby guesses */}
              <div className="space-y-4 pt-2 border-t border-sun-100">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Gissa babyn</p>

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-600">
                      Födelsedatum <span className="text-sage-400">*</span>
                      {settings.dueDate && (
                        <span className="ml-2 font-normal text-gray-400">(BF: {settings.dueDate})</span>
                      )}
                    </label>
                    <input type="date" className="input-field" value={form.guessDate} onChange={e => set('guessDate', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-600">Klockslag <span className="text-sage-400">*</span></label>
                    <input type="time" className="input-field" value={form.guessTime} onChange={e => set('guessTime', e.target.value)} />
                  </div>
                </div>

                {/* Weight + Length */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-600">Vikt (gram) <span className="text-sage-400">*</span></label>
                    <input type="number" className="input-field" placeholder="t.ex. 3500" min={500} max={6000} value={form.guessWeight} onChange={e => set('guessWeight', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-600">Längd (cm) <span className="text-sage-400">*</span></label>
                    <input type="number" className="input-field" placeholder="t.ex. 50" min={30} max={65} value={form.guessLength} onChange={e => set('guessLength', e.target.value)} />
                  </div>
                </div>

                {/* Eye color */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600">Ögonfärg <span className="text-sage-400">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {EYE_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => set('guessEyeColor', form.guessEyeColor === c ? '' : c)}
                        className={`px-3 py-1.5 rounded-full text-sm border-2 transition-all ${form.guessEyeColor === c ? 'border-sage-300 bg-sage-50 text-sage-600 font-medium' : 'border-sun-100 text-gray-500 hover:border-sun-200'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hair color */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-600">Hårfärg <span className="text-sage-400">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {HAIR_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => set('guessHairColor', form.guessHairColor === c ? '' : c)}
                        className={`px-3 py-1.5 rounded-full text-sm border-2 transition-all ${form.guessHairColor === c ? 'border-sage-300 bg-sage-50 text-sage-600 font-medium' : 'border-sun-100 text-gray-500 hover:border-sun-200'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-shrink-0"
                >
                  ←
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit() || submitting}
                  className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Skickar...
                    </span>
                  ) : 'Skicka in 🎊'}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}

import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useSettings } from '../hooks/useSettings'

type Gender = 'boy' | 'girl' | null
type Attending = 'yes' | 'no' | null

interface FormState {
  name: string
  attending: Attending
  gender: Gender
  nameGuess: string
  message: string
}

const INITIAL: FormState = {
  name: '',
  attending: null,
  gender: null,
  nameGuess: '',
  message: '',
}

export default function RSVP() {
  const { settings, loading } = useSettings()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [step, setStep] = useState<1 | 2>(1)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

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
    return form.name.trim().length >= 2 && form.attending !== null
  }

  function canSubmit() {
    return form.gender !== null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit()) return
    setSubmitting(true)

    await addDoc(collection(db, 'rsvps'), {
      name:       form.name.trim(),
      attending:  form.attending,
      gender:     form.gender,
      nameGuess:  form.nameGuess.trim(),
      message:    form.message.trim(),
      submittedAt: serverTimestamp(),
    })

    setSubmitting(false)
    navigate('/thanks', { state: { name: form.name, gender: form.gender } })
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
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-sun-300' : s < step ? 'w-4 bg-sun-200' : 'w-4 bg-sun-100'
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
                      className={`py-4 rounded-2xl border-2 font-medium text-base transition-all duration-200 ${
                        form.attending === opt
                          ? 'border-sage-300 bg-sage-50 text-sage-500 shadow-sm'
                          : 'border-sun-100 text-gray-500 hover:border-sun-200'
                      }`}
                    >
                      {opt === 'yes' ? '🎉 Ja, jag kommer!' : '😢 Kan tyvärr inte'}
                    </button>
                  ))}
                </div>
              </div>

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
              <div>
                <h1 className="font-display text-3xl text-gray-800 mb-1">Dina gissningar ✨</h1>
                <p className="text-gray-500">Vad tror du det blir?</p>
              </div>

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
                  Vad tror du att babyn heter?
                  <span className="text-gray-400 font-normal ml-1">(valfritt)</span>
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
                  Lämna ett meddelande till föräldrarna
                  <span className="text-gray-400 font-normal ml-1">(valfritt)</span>
                </label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Kan inte vänta på att träffa den lilla! 💕"
                  value={form.message}
                  onChange={e => set('message', e.target.value)}
                />
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
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Skickar...
                    </span>
                  ) : 'Skicka min gissning 🎊'}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}

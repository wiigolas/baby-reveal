import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { Link } from 'react-router-dom'
import { useSettings, DEFAULTS, type Settings } from '../hooks/useSettings'

// ── Change this to your own admin password ───────────────────────────────────
const ADMIN_PASSWORD = 'babyreveal2026'
// ────────────────────────────────────────────────────────────────────────────

const EYE_COLORS  = ['Blå', 'Grön', 'Brun', 'Grå', 'Hasselnöt']
const HAIR_COLORS = ['Blond', 'Brun', 'Svart', 'Röd', 'Lite hår']

interface RSVP {
  id: string
  name: string
  attending: 'yes' | 'no'
  gender: 'boy' | 'girl'
  nameGuess: string
  message: string
  dietary: 'yes' | 'no' | null
  dietaryDetails: string
  guessDate: string
  guessTime: string
  guessWeight: string
  guessLength: string
  guessEyeColor: string
  guessHairColor: string
  submittedAt: { seconds: number } | null
}

function formatDate(ts: { seconds: number } | null) {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function GenderBar({ rsvps }: { rsvps: RSVP[] }) {
  const guesses = rsvps.filter(r => r.gender)
  const boys  = guesses.filter(r => r.gender === 'boy').length
  const girls = guesses.filter(r => r.gender === 'girl').length
  const total = guesses.length

  if (total === 0) return (
    <p className="text-gray-400 text-sm">Inga gissningar än</p>
  )

  const boyPct  = Math.round((boys  / total) * 100)
  const girlPct = Math.round((girls / total) * 100)

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-blue-500">👦 Pojke — {boys} ({boyPct}%)</span>
        <span className="text-pink-500">Flicka — {girls} ({girlPct}%) 👧</span>
      </div>
      <div className="flex h-4 rounded-full overflow-hidden bg-pink-100">
        <div
          className="bg-blue-300 transition-all duration-700"
          style={{ width: `${boyPct}%` }}
        />
        <div
          className="bg-pink-300 transition-all duration-700 flex-1"
        />
      </div>
      <p className="text-xs text-gray-400 text-center">{total} gissning{total !== 1 ? 'ar' : ''} totalt</p>
    </div>
  )
}

function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="card text-center">
      <div className="text-3xl mb-1">{emoji}</div>
      <div className="text-3xl font-display font-semibold text-gray-800">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'guests' | 'names' | 'messages' | 'baby' | 'settings'>('overview')
  const [guestFilter, setGuestFilter] = useState<'all' | 'yes' | 'no'>('all')
  const { settings } = useSettings()
  const [draft, setDraft]       = useState<Settings>(DEFAULTS)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => { setDraft(settings) }, [settings])

  useEffect(() => {
    if (!authed) return
    const q = query(collection(db, 'rsvps'), orderBy('submittedAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setRsvps(snap.docs.map(d => ({ id: d.id, ...d.data() } as RSVP)))
      setLoading(false)
    })
    return unsub
  }, [authed])

  async function saveSettings() {
    setSaving(true)
    await setDoc(doc(db, 'settings', 'config'), draft)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function resetReveal() {
    await updateDoc(doc(db, 'settings', 'config'), { revealPhase: 'waiting' })
  }

  function login(e: React.FormEvent) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="card w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h1 className="font-display text-2xl text-gray-800">Admin</h1>
            <p className="text-gray-400 text-sm mt-1">Endast för föräldrarna</p>
          </div>
          <form onSubmit={login} className="space-y-4">
            <input
              type="password"
              className="input-field"
              placeholder="Lösenord"
              value={pw}
              onChange={e => { setPw(e.target.value); setError(false) }}
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm text-center">Fel lösenord, försök igen</p>
            )}
            <button type="submit" className="btn-primary w-full">Logga in</button>
          </form>
          <div className="text-center">
            <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">← Tillbaka till inbjudan</Link>
          </div>
        </div>
      </div>
    )
  }

  const attending  = rsvps.filter(r => r.attending === 'yes')
  const declined   = rsvps.filter(r => r.attending === 'no')
  const nameGuesses = rsvps.filter(r => r.nameGuess?.trim())
  const messages   = rsvps.filter(r => r.message?.trim())

  const tabs = [
    { id: 'overview',  label: '📊 Översikt' },
    { id: 'guests',    label: `👥 Gäster (${rsvps.length})` },
    { id: 'names',     label: `✏️ Namn (${nameGuesses.length})` },
    { id: 'messages',  label: `💌 Meddelanden (${messages.length})` },
    { id: 'baby',      label: '👶 Babydata' },
    { id: 'settings',  label: '⚙️ Inställningar' },
  ] as const

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-sun-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl text-gray-800">Admin</h1>
            <p className="text-xs text-gray-400">Uppdateras i realtid</p>
          </div>
          <Link to="/" className="text-sm text-sage-400 hover:text-sage-500">Visa inbjudan →</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    tab === t.id
                      ? 'bg-sage-300 text-white shadow-sm'
                      : 'bg-white text-gray-500 border border-sun-100 hover:border-sage-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Overview */}
            {tab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Kommer"       value={attending.length} emoji="🎉" />
                  <StatCard label="Kan inte"     value={declined.length} emoji="😢" />
                  <StatCard label="Totalt"        value={rsvps.length}   emoji="📋" />
                </div>
                <div className="card space-y-4">
                  <h2 className="font-display text-lg text-gray-700">Könsgissningar</h2>
                  <GenderBar rsvps={rsvps} />
                </div>
              </div>
            )}

            {/* Guests */}
            {tab === 'guests' && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex gap-2">
                  {[
                    { key: 'all',  label: `Alla (${rsvps.length})` },
                    { key: 'yes',  label: `Kommer (${attending.length})` },
                    { key: 'no',   label: `Kommer inte (${declined.length})` },
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setGuestFilter(t.key as 'all' | 'yes' | 'no')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        guestFilter === t.key
                          ? 'bg-sage-300 text-white'
                          : 'bg-white text-gray-500 border border-sun-100 hover:border-sage-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {rsvps.length === 0 && (
                  <p className="text-center text-gray-400 py-10">Inga OSA än</p>
                )}
                {rsvps.filter(r => guestFilter === 'all' || r.attending === guestFilter).map(r => (
                  <div key={r.id} className="card flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">{r.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.attending === 'yes'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {r.attending === 'yes' ? 'Kommer' : 'Tackat nej'}
                        </span>
                        {r.gender && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            r.gender === 'boy'
                              ? 'bg-blue-100 text-blue-500'
                              : 'bg-pink-100 text-pink-500'
                          }`}>
                            Gissar {r.gender === 'boy' ? 'pojke' : 'flicka'}
                          </span>
                        )}
                      </div>
                      {r.nameGuess && (
                        <p className="text-sm text-gray-500 mt-1">Namnsgissning: <em>{r.nameGuess}</em></p>
                      )}
                      {r.dietary === 'yes' && (
                        <p className="text-sm text-orange-500 mt-1">⚠️ Allergi/specialkost: <em>{r.dietaryDetails || '—'}</em></p>
                      )}
                    </div>
                    <span className="text-xs text-gray-300 flex-shrink-0">{formatDate(r.submittedAt)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Name guesses */}
            {tab === 'names' && (
              <div className="space-y-3 animate-fade-in">
                {nameGuesses.length === 0 && (
                  <p className="text-center text-gray-400 py-10">Inga namnsgissningar än</p>
                )}
                {nameGuesses.map(r => (
                  <div key={r.id} className="card flex items-center justify-between">
                    <div>
                      <p className="font-display text-xl text-gray-800">{r.nameGuess}</p>
                      <p className="text-sm text-gray-400">gissades av {r.name}</p>
                    </div>
                    <span className={`text-2xl`}>
                      {r.gender === 'boy' ? '💙' : r.gender === 'girl' ? '💗' : '✨'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            {tab === 'messages' && (
              <div className="space-y-3 animate-fade-in">
                {messages.length === 0 && (
                  <p className="text-center text-gray-400 py-10">Inga meddelanden än</p>
                )}
                {messages.map(r => (
                  <div key={r.id} className="card">
                    <p className="text-gray-700 italic">"{r.message}"</p>
                    <p className="text-sm text-gray-400 mt-2">— {r.name}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Baby data */}
            {tab === 'baby' && (() => {
              // ── Scoring helpers ──────────────────────────────────────────
              const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

              function closestWinners(
                field: keyof RSVP,
                actual: string,
                type: 'exact' | 'numeric' | 'date' | 'time'
              ): Set<string> {
                if (!actual) return new Set()
                const cands = rsvps.filter(r => r[field])
                if (!cands.length) return new Set()
                if (type === 'exact') {
                  return new Set(cands.filter(r => r[field] === actual).map(r => r.id))
                }
                let diff: (r: RSVP) => number
                if (type === 'numeric') {
                  const av = parseFloat(actual)
                  diff = r => Math.abs(parseFloat(r[field] as string) - av)
                } else if (type === 'date') {
                  const av = new Date(actual).getTime()
                  diff = r => Math.abs(new Date(r[field] as string).getTime() - av)
                } else {
                  const av = toMins(actual)
                  diff = r => Math.abs(toMins(r[field] as string) - av)
                }
                const scored = cands.map(r => ({ id: r.id, d: diff(r) }))
                const min = Math.min(...scored.map(s => s.d))
                return new Set(scored.filter(s => s.d === min).map(s => s.id))
              }

              const act = settings
              const genderW = closestWinners('gender',         act.gender,          'exact')
              const dateW   = closestWinners('guessDate',      act.actualDate,      'date')
              const timeW   = closestWinners('guessTime',      act.actualTime,      'time')
              const weightW = closestWinners('guessWeight',    act.actualWeight,    'numeric')
              const lengthW = closestWinners('guessLength',    act.actualLength,    'numeric')
              const eyeW    = closestWinners('guessEyeColor',  act.actualEyeColor,  'exact')
              const hairW   = closestWinners('guessHairColor', act.actualHairColor, 'exact')

              const hasActuals = !!(act.actualDate || act.actualTime || act.actualWeight || act.actualLength || act.actualEyeColor || act.actualHairColor)

              const score = (id: string) =>
                [genderW, dateW, timeW, weightW, lengthW, eyeW, hairW].filter(s => s.has(id)).length

              const babyGuessers = rsvps
                .filter(r => r.guessDate || r.guessTime || r.guessWeight || r.guessLength || r.guessEyeColor || r.guessHairColor)
                .slice()
                .sort((a, b) => score(b.id) - score(a.id))

              const fields: { key: keyof RSVP; label: string; unit?: string; winners: Set<string>; actual: string; format?: (v: string) => string }[] = [
                { key: 'gender',         label: '👶 Kön',        winners: genderW, actual: act.gender, format: v => v === 'boy' ? 'Pojke' : 'Flicka' },
                { key: 'guessDate',      label: '📅 Datum',      winners: dateW,   actual: act.actualDate },
                { key: 'guessTime',      label: '🕐 Tid',        winners: timeW,   actual: act.actualTime },
                { key: 'guessWeight',    label: '⚖️ Vikt',       unit: 'g',  winners: weightW, actual: act.actualWeight },
                { key: 'guessLength',    label: '📏 Längd',      unit: 'cm', winners: lengthW, actual: act.actualLength },
                { key: 'guessEyeColor',  label: '👁️ Ögonfärg',  winners: eyeW,    actual: act.actualEyeColor },
                { key: 'guessHairColor', label: '💇 Hårfärg',   winners: hairW,   actual: act.actualHairColor },
              ]

              return (
                <div className="space-y-4 animate-fade-in">
                  {babyGuessers.length === 0 && (
                    <p className="text-center text-gray-400 py-10">Inga babygissningar än</p>
                  )}
                  {babyGuessers.map((r, i) => {
                    const s = score(r.id)
                    const maxFields = fields.filter(f => r[f.key]).length
                    return (
                      <div key={r.id} className="card space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {hasActuals && i === 0 && s > 0 && <span className="text-lg">🏆</span>}
                            <p className="font-medium text-gray-800">{r.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              r.gender === 'boy' ? 'bg-blue-100 text-blue-500' : 'bg-pink-100 text-pink-500'
                            }`}>
                              {r.gender === 'boy' ? 'pojke' : 'flicka'}
                            </span>
                          </div>
                          {hasActuals && (
                            <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                              s === maxFields && s > 0
                                ? 'bg-green-100 text-green-600'
                                : s > 0
                                  ? 'bg-sun-100 text-gray-600'
                                  : 'bg-gray-100 text-gray-400'
                            }`}>
                              {s} / {maxFields} rätt
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                          {fields.map(f => {
                            const val = r[f.key] as string
                            if (!val) return null
                            const isWinner = f.winners.has(r.id)
                            const actualSet = !!f.actual
                            return (
                              <div key={f.key as string} className="flex justify-between items-center gap-2">
                                <span className="text-gray-400 flex-shrink-0">{f.label}</span>
                                <span className="flex items-center gap-1">
                                  <span className="text-gray-700 font-medium">{f.format ? f.format(val) : val}{f.unit ? ` ${f.unit}` : ''}</span>
                                  {actualSet && (
                                    <span className={isWinner ? 'text-green-500' : 'text-red-300'}>
                                      {isWinner ? '✓' : '✗'}
                                    </span>
                                  )}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* Settings */}
            {tab === 'settings' && (
              <div className="space-y-5 animate-fade-in max-w-lg">

                {/* Gender */}
                <div className="card space-y-3">
                  <h2 className="font-display text-lg text-gray-700">Avslöja kön</h2>
                  <p className="text-sm text-gray-400">Används av avslöjningsskärmen — håll det hemligt!</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['boy', 'girl'] as const).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setDraft(d => ({ ...d, gender: g }))}
                        className={`py-4 rounded-2xl border-2 font-medium text-base transition-all duration-200 ${
                          draft.gender === g
                            ? g === 'boy'
                              ? 'border-blue-400 bg-blue-50 text-blue-600 shadow-sm'
                              : 'border-pink-400 bg-pink-50 text-pink-600 shadow-sm'
                            : 'border-sun-100 text-gray-500 hover:border-sun-200'
                        }`}
                      >
                        {g === 'boy' ? '👦 Pojke' : '👧 Flicka'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="card space-y-4">
                  <h2 className="font-display text-lg text-gray-700">Gästupplevelse</h2>

                  {[
                    {
                      key: 'submissionsLocked' as const,
                      label: 'Lås anmälningar',
                      desc: 'Förhindra gäster från att skicka in OSA eller gissningar',
                      icon: '🔒',
                    },
                    {
                      key: 'showTallyToGuests' as const,
                      label: 'Visa resultat för gäster',
                      desc: 'Gäster ser pojke/flicka-fördelningen efter att de skickat in',
                      icon: '📊',
                    },
                  ].map(({ key, label, desc, icon }) => (
                    <label key={key} className="flex items-start gap-4 cursor-pointer group">
                      <div className="mt-0.5 relative flex-shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={draft[key]}
                          onChange={e => setDraft(d => ({ ...d, [key]: e.target.checked }))}
                        />
                        <div
                          onClick={() => setDraft(d => ({ ...d, [key]: !d[key] }))}
                          className={`w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                            draft[key] ? 'bg-sage-300' : 'bg-gray-200'
                          }`}
                        >
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                            draft[key] ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">{icon} {label}</p>
                        <p className="text-sm text-gray-400">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Party details */}
                <div className="card space-y-4">
                  <h2 className="font-display text-lg text-gray-700">Festdetaljer</h2>
                  <p className="text-sm text-gray-400">Visas på inbjudningssidan</p>

                  {[
                    { key: 'parentsNames' as const,  label: 'Föräldrarnas namn', placeholder: 'Sara & Johan' },
                    { key: 'partyTime'    as const,  label: 'Datum & tid',       placeholder: 'Lördag 19 juli · 14:00' },
                    { key: 'partyDate'   as const,   label: 'Nedräkningsmål (ISO)', placeholder: '2026-07-19T14:00:00' },
                    { key: 'partyLocation' as const, label: 'Plats',             placeholder: 'Trädgården, Rosgatan 12' },
                    { key: 'dueDate'      as const,  label: 'Beräknat förlossningsdatum (BF)', placeholder: 't.ex. 15 september' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="space-y-1">
                      <label className="block text-sm font-medium text-gray-600">{label}</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder={placeholder}
                        value={draft[key]}
                        onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>

                {/* Actual baby stats */}
                <div className="card space-y-4">
                  <div>
                    <h2 className="font-display text-lg text-gray-700">👶 Bebisens faktiska data</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Fyll i efter födseln — aktiverar poängsättning i Babydata-tabben</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-600">Datum</label>
                      <input type="date" className="input-field" value={draft.actualDate}
                        onChange={e => setDraft(d => ({ ...d, actualDate: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-600">Tid</label>
                      <input type="time" className="input-field" value={draft.actualTime}
                        onChange={e => setDraft(d => ({ ...d, actualTime: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-600">Vikt (gram)</label>
                      <input type="number" className="input-field" placeholder="t.ex. 3500" value={draft.actualWeight}
                        onChange={e => setDraft(d => ({ ...d, actualWeight: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-600">Längd (cm)</label>
                      <input type="number" className="input-field" placeholder="t.ex. 50" value={draft.actualLength}
                        onChange={e => setDraft(d => ({ ...d, actualLength: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-600">Ögonfärg</label>
                    <div className="flex flex-wrap gap-2">
                      {EYE_COLORS.map(c => (
                        <button key={c} type="button"
                          onClick={() => setDraft(d => ({ ...d, actualEyeColor: d.actualEyeColor === c ? '' : c }))}
                          className={`px-3 py-1.5 rounded-full text-sm border-2 transition-all ${
                            draft.actualEyeColor === c
                              ? 'border-sage-300 bg-sage-50 text-sage-600 font-medium'
                              : 'border-sun-100 text-gray-500 hover:border-sun-200'
                          }`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-600">Hårfärg</label>
                    <div className="flex flex-wrap gap-2">
                      {HAIR_COLORS.map(c => (
                        <button key={c} type="button"
                          onClick={() => setDraft(d => ({ ...d, actualHairColor: d.actualHairColor === c ? '' : c }))}
                          className={`px-3 py-1.5 rounded-full text-sm border-2 transition-all ${
                            draft.actualHairColor === c
                              ? 'border-sage-300 bg-sage-50 text-sage-600 font-medium'
                              : 'border-sun-100 text-gray-500 hover:border-sun-200'
                          }`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reveal control */}
                <div className="card space-y-3">
                  <h2 className="font-display text-lg text-gray-700">🎬 Avslöjningsskärmen</h2>
                  <p className="text-sm text-gray-400">
                    Nuvarande fas: <strong className="text-gray-600">{settings.revealPhase}</strong>
                  </p>
                  <button
                    onClick={resetReveal}
                    className="btn-secondary w-full"
                  >
                    ↺ Återställ till vänteskärm
                  </button>
                </div>

                {/* Save button */}
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="btn-primary w-full"
                >
                  {saved ? '✓ Sparat!' : saving ? 'Sparar…' : 'Spara inställningar'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

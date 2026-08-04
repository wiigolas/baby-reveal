import { useState, useEffect, useRef, useCallback } from 'react'
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useSettings } from '../hooks/useSettings'

interface RSVP {
  id: string
  gender: 'boy' | 'girl' | null
  nameGuess: string
}

// ── Name cloud ────────────────────────────────────────────────────────────────
function seededRandom(seed: string, offset: number) {
  let h = offset * 2654435761
  for (let i = 0; i < seed.length; i++) h ^= seed.charCodeAt(i) * (i + 1)
  h = ((h >>> 16) ^ h) * 0x45d9f3b
  h = ((h >>> 16) ^ h) * 0x45d9f3b
  h = (h >>> 16) ^ h
  return (h >>> 0) / 0xffffffff
}

interface NameItem { name: string; count: number }

// Slots ordered from center outward — popular names (highest count) get inner slots
// anchor: 'left' = text grows right, 'right' = text grows left, 'center' = centered at x%
// Inner ring uses only left/right sides to avoid overlapping the subtitle text at top
type Anchor = 'left' | 'right' | 'center'
interface Slot { x: number; y: number; anchor: Anchor }

const SLOTS: Slot[] = [
  // Inner ring — flank the center content left & right only (no top/bottom to avoid subtitle overlap)
  { x: 88, y: 35, anchor: 'right'  },
  { x: 12, y: 35, anchor: 'left'   },
  { x: 88, y: 65, anchor: 'right'  },
  { x: 12, y: 65, anchor: 'left'   },
  // Middle ring — top and bottom are safe at y ≤ 5% / y ≥ 92%
  { x: 50, y:  4, anchor: 'center' },
  { x: 18, y:  6, anchor: 'left'   },
  { x: 82, y:  6, anchor: 'right'  },
  { x: 93, y: 22, anchor: 'right'  },
  { x: 93, y: 50, anchor: 'right'  },
  { x: 93, y: 76, anchor: 'right'  },
  { x: 82, y: 93, anchor: 'right'  },
  { x: 50, y: 94, anchor: 'center' },
  { x: 18, y: 93, anchor: 'left'   },
  { x:  7, y: 76, anchor: 'left'   },
  { x:  7, y: 50, anchor: 'left'   },
  { x:  7, y: 22, anchor: 'left'   },
  // Outer ring — corners and far edges
  { x:  3, y:  2, anchor: 'left'   },
  { x: 50, y:  1, anchor: 'center' },
  { x: 97, y:  2, anchor: 'right'  },
  { x: 97, y: 50, anchor: 'right'  },
  { x: 97, y: 97, anchor: 'right'  },
  { x: 50, y: 97, anchor: 'center' },
  { x:  3, y: 97, anchor: 'left'   },
  { x:  3, y: 50, anchor: 'left'   },
]

function NameCloud({ names, phase, isBoy }: {
  names: NameItem[]
  phase: 'waiting' | 'drumroll' | 'revealed'
  isBoy: boolean
}) {
  if (names.length === 0) return null

  const maxCount = Math.max(...names.map(n => n.count))
  // Sort by count desc so popular names land in the inner (more visible) slots
  const sorted = [...names].sort((a, b) => b.count - a.count)

  const colorClass = phase === 'revealed'
    ? isBoy ? 'text-blue-300' : 'text-pink-300'
    : 'text-white'

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-0"
      style={{
        WebkitMaskImage: 'radial-gradient(ellipse 42% 32% at 50% 50%, transparent 55%, black 88%)',
        maskImage: 'radial-gradient(ellipse 42% 32% at 50% 50%, transparent 55%, black 88%)',
      }}
    >
      {sorted.map((item, i) => {
        const slot  = SLOTS[i % SLOTS.length]
        const rot   = (seededRandom(item.name, 2) - 0.5) * 18
        const size  = 0.75 + (item.count / maxCount) * 1.0
        const delay = seededRandom(item.name, 3) * 2
        const xJit  = (seededRandom(item.name, 5) - 0.5) * 3
        const yJit  = (seededRandom(item.name, 6) - 0.5) * 4
        const opacity = (phase === 'revealed' ? 0.5 : 0.4) + (item.count / maxCount) * 0.35

        const ax = Math.min(97, Math.max(2, slot.x + xJit))
        const ay = Math.min(97, Math.max(1, slot.y + yJit))

        let posStyle: React.CSSProperties
        if (slot.anchor === 'right') {
          posStyle = { right: `${100 - ax}%`, top: `${ay}%` }
        } else {
          posStyle = { left: `${ax}%`, top: `${ay}%` }
        }

        return (
          <span
            key={item.name}
            className={`absolute font-display italic select-none transition-colors duration-1000 animate-float ${colorClass}`}
            style={{
              ...posStyle,
              fontSize: `clamp(0.65rem, ${size * 2.2}vw, ${size}rem)`,
              transform: slot.anchor === 'center'
                ? `translateX(-50%) rotate(${rot}deg)`
                : `rotate(${rot}deg)`,
              opacity,
              animationDelay: `${delay}s`,
              animationDuration: `${3 + seededRandom(item.name, 4) * 2}s`,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            {item.name}
          </span>
        )
      })}
    </div>
  )
}

// ── Confetti ─────────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number
  vx: number; vy: number
  color: string; size: number
  rotation: number; rotationSpeed: number
  shape: 'rect' | 'circle'
  opacity: number
}

function useConfetti(canvasRef: React.RefObject<HTMLCanvasElement>, active: boolean, gender: 'boy' | 'girl' | null) {
  const particles = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)

  const launch = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const colors = gender === 'boy'
      ? ['#93c5fd', '#60a5fa', '#3b82f6', '#bfdbfe', '#ffffff', '#dbeafe']
      : ['#f9a8d4', '#f472b6', '#ec4899', '#fce7f3', '#ffffff', '#fbcfe8']

    const newParticles: Particle[] = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      opacity: 1,
    }))
    particles.current = [...particles.current, ...newParticles]
  }, [canvasRef, gender])

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // Launch multiple waves
    launch()
    const t1 = setTimeout(launch, 400)
    const t2 = setTimeout(launch, 800)
    const t3 = setTimeout(launch, 1400)

    function animate() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)

      particles.current = particles.current.filter(p => p.opacity > 0.05)

      particles.current.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.12 // gravity
        p.rotation += p.rotationSpeed
        if (p.y > canvas!.height * 0.7) p.opacity -= 0.015

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
    }
  }, [active, launch, canvasRef])
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Reveal() {
  const { settings } = useSettings()
  const ACTUAL_GENDER = settings.gender
  // phase lives in Firestore so every viewer stays perfectly in sync
  const phase = settings.revealPhase

  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [showTrigger, setShowTrigger] = useState(false)
  const [drumrollCount, setDrumrollCount] = useState(3)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useConfetti(canvasRef, phase === 'revealed', ACTUAL_GENDER)

  // Local countdown animation — fires on every client when Firestore phase → 'drumroll'
  useEffect(() => {
    if (phase !== 'drumroll') return
    setDrumrollCount(3)
    let count = 3
    const interval = setInterval(() => {
      count--
      setDrumrollCount(count)
      if (count === 0) {
        clearInterval(interval)
        setTimeout(() => {
          updateDoc(doc(db, 'settings', 'config'), { revealPhase: 'revealed' }).catch(console.error)
        }, 600)
      }
    }, 800)
    return () => clearInterval(interval)
  }, [phase])

  // Live tally + name guesses
  useEffect(() => {
    const q = query(collection(db, 'rsvps'), orderBy('submittedAt', 'desc'))
    return onSnapshot(
      q,
      snap => {
        setRsvps(snap.docs.map(d => ({
          id: d.id,
          gender: d.data().gender ?? null,
          nameGuess: d.data().nameGuess ?? '',
        })))
      },
      err => console.error('[Reveal] Firestore error:', err.code, err.message)
    )
  }, [])

  const guesses = rsvps.filter(r => r.gender)
  const boys = guesses.filter(r => r.gender === 'boy').length
  const girls = guesses.filter(r => r.gender === 'girl').length
  const total = guesses.length
  const boyPct = total ? Math.round((boys / total) * 100) : 50
  const girlPct = total ? Math.round((girls / total) * 100) : 50

  // Before reveal: show top 24 names by count.
  // After reveal: show up to 24 names from correct-gender guessers only.
  const MAX_NAMES = 24
  const nameMap: Record<string, number> = {}
  rsvps.forEach(r => {
    if (phase === 'revealed' && r.gender !== ACTUAL_GENDER) return
    const n = r.nameGuess?.trim()
    if (n) nameMap[n] = (nameMap[n] ?? 0) + 1
  })
  const nameItems: NameItem[] = Object.entries(nameMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_NAMES)

  async function triggerReveal() {
    if (phase !== 'waiting') return
    if (pwInput !== 'babyreveal2026') {
      setPwError(true)
      setTimeout(() => setPwError(false), 1500)
      return
    }
    await updateDoc(doc(db, 'settings', 'config'), { revealPhase: 'drumroll' }).catch(console.error)
  }

  const isBoy = ACTUAL_GENDER === 'boy'
  const bgClass = phase === 'revealed'
    ? isBoy ? 'bg-blue-100' : 'bg-pink-100'
    : 'bg-[#1a1025]'

  return (
    <div
      className={`flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-1000 ${bgClass}`}
      style={{ height: '100dvh' }}
      // Reveal trigger: hover bottom-right corner
      onMouseMove={e => {
        const nearCorner = e.clientX > window.innerWidth - 80 && e.clientY > window.innerHeight - 80
        setShowTrigger(nearCorner)
      }}
    >
      {/* Name cloud */}
      <NameCloud names={nameItems} phase={phase} isBoy={isBoy} />

      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20" />

      {/* ── WAITING phase ── */}
      {phase === 'waiting' && (
        <div className="text-center space-y-8 px-6 animate-fade-in z-10 w-full max-w-lg mx-auto">
          <div>
            <p className="text-white/50 text-xs sm:text-sm uppercase tracking-[0.3em] mb-3 font-body">Tror ni att det blir en</p>
            <h1
              className="font-display uppercase text-white font-semibold"
              style={{ fontSize: 'clamp(1.4rem, 4.8vw, 2.5rem)' }}
            >
              pojke eller flicka?
            </h1>
          </div>

          {/* Live tally */}
          {total > 0 && (
            <div className="max-w-md mx-auto space-y-4">
              <p className="text-white/40 text-xs uppercase tracking-widest">Gästernas gissningar hittills</p>
              <div className="flex justify-between text-lg font-medium">
                <span className="text-blue-300">👦 Pojke {boyPct}%</span>
                <span className="text-pink-300">Flicka {girlPct}% 👧</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-white/10">
                <div className="bg-blue-400/70 transition-all duration-700" style={{ width: `${boyPct}%` }} />
                <div className="bg-pink-400/70 flex-1 transition-all duration-700" />
              </div>
              <p className="text-white/30 text-xs">{total} gissning{total !== 1 ? 'ar' : ''}</p>
            </div>
          )}
        </div>
      )}

      {/* ── DRUMROLL phase ── */}
      {phase === 'drumroll' && (
        <div className="text-center z-10 animate-fade-in">
          <p className="text-white/60 text-lg uppercase tracking-widest mb-6 font-body">Gör er redo…</p>
          <div className="font-display leading-none text-white font-bold animate-float"
            style={{ fontSize: 'clamp(6rem, 30vw, 12rem)' }}>
            {drumrollCount}
          </div>
        </div>
      )}

      {/* ── REVEALED phase ── */}
      {phase === 'revealed' && (
        <div className="text-center z-10 px-4 w-full max-w-full">
          <div className="animate-slide-up">
            <p className={`text-xs sm:text-sm uppercase tracking-[0.4em] mb-3 font-body ${isBoy ? 'text-blue-400' : 'text-pink-400'}`}>
              Det blir en…
            </p>
            <h1
              className={`font-display font-bold leading-none ${isBoy ? 'text-blue-600' : 'text-pink-500'}`}
              style={{ fontSize: 'clamp(3.5rem, 18vw, 14rem)' }}
            >
              {isBoy ? 'POJKE' : 'FLICKA'}
            </h1>
            <div className="text-6xl sm:text-8xl mt-4 animate-float">
              {isBoy ? '💙' : '💗'}
            </div>
          </div>
        </div>
      )}

      {/* Hidden admin trigger — only visible when hovering bottom-right corner */}
      {phase === 'waiting' && showTrigger && (
        <div
          className="fixed bottom-6 right-6 z-30 flex gap-2 items-center animate-fade-in"
          onMouseEnter={() => setShowTrigger(true)}
          onMouseLeave={() => setShowTrigger(false)}
        >
          <input
            type="password"
                autoComplete="new-password"
            placeholder="Lösenord"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && triggerReveal()}
            autoFocus
            className={`text-xs px-3 py-2 rounded-full backdrop-blur-sm border
                        bg-white/10 text-white placeholder-white/40 outline-none w-28
                        transition-colors duration-200
                        ${pwError ? 'border-red-400' : 'border-white/20'}`}
          />
          <button
            onClick={triggerReveal}
            className="bg-white/20 hover:bg-white/30 text-white text-xs px-4 py-2
                       rounded-full backdrop-blur-sm border border-white/20 transition-all duration-200"
          >
            Avslöja 🎊
          </button>
        </div>
      )}
    </div>
  )
}

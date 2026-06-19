import { useState, useEffect, useRef, useCallback } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
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

// Safe slots along the perimeter — avoids the center where main content lives
const SLOTS = [
  // Top strip
  { x: 4, y: 4 }, { x: 20, y: 3 }, { x: 38, y: 5 }, { x: 55, y: 3 }, { x: 70, y: 5 }, { x: 84, y: 4 },
  // Bottom strip
  { x: 3, y: 84 }, { x: 18, y: 87 }, { x: 36, y: 84 }, { x: 53, y: 87 }, { x: 68, y: 84 }, { x: 82, y: 87 },
  // Left strip
  { x: 2, y: 22 }, { x: 3, y: 40 }, { x: 2, y: 58 }, { x: 3, y: 73 },
  // Right strip
  { x: 82, y: 22 }, { x: 83, y: 40 }, { x: 82, y: 58 }, { x: 83, y: 73 },
]

function NameCloud({ names, phase, isBoy }: {
  names: NameItem[]
  phase: 'waiting' | 'drumroll' | 'revealed'
  isBoy: boolean
}) {
  if (names.length === 0) return null

  const maxCount = Math.max(...names.map(n => n.count))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {names.map(({ name, count }, i) => {
        const slot = SLOTS[i % SLOTS.length]
        // Add a small jitter so names in the same slot don't stack perfectly
        const jx = (seededRandom(name, 5) - 0.5) * 4
        const jy = (seededRandom(name, 6) - 0.5) * 4
        const x = slot.x + jx
        const y = slot.y + jy
        const rot = (seededRandom(name, 2) - 0.5) * 20
        const size = 1.0 + (count / maxCount) * 1.6
        const delay = seededRandom(name, 3) * 2

        const colorClass = phase === 'revealed'
          ? isBoy ? 'text-blue-300' : 'text-pink-300'
          : 'text-white'

        const opacity = phase === 'revealed'
          ? 0.5 + (count / maxCount) * 0.35
          : 0.4 + (count / maxCount) * 0.35

        return (
          <span
            key={name}
            className={`absolute font-display italic select-none transition-colors duration-1000 animate-float ${colorClass}`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              fontSize: `${size}rem`,
              transform: `rotate(${rot}deg)`,
              opacity,
              animationDelay: `${delay}s`,
              animationDuration: `${3 + seededRandom(name, 4) * 2}s`,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {name}
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
type Phase = 'waiting' | 'drumroll' | 'revealed'

export default function Reveal() {
  const { settings } = useSettings()
  const ACTUAL_GENDER = settings.gender
  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [phase, setPhase] = useState<Phase>('waiting')
  const [showTrigger, setShowTrigger] = useState(false)
  const [drumrollCount, setDrumrollCount] = useState(3)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useConfetti(canvasRef, phase === 'revealed', ACTUAL_GENDER)

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

  // Aggregate name guesses
  const nameMap: Record<string, number> = {}
  rsvps.forEach(r => {
    const n = r.nameGuess?.trim()
    if (n) nameMap[n] = (nameMap[n] ?? 0) + 1
  })
  const nameItems: NameItem[] = Object.entries(nameMap).map(([name, count]) => ({ name, count }))

  function triggerReveal() {
    if (phase !== 'waiting') return
    setPhase('drumroll')
    let count = 3
    const interval = setInterval(() => {
      count--
      setDrumrollCount(count)
      if (count === 0) {
        clearInterval(interval)
        setTimeout(() => setPhase('revealed'), 600)
      }
    }, 800)
  }

  const isBoy = ACTUAL_GENDER === 'boy'
  const bgClass = phase === 'revealed'
    ? isBoy ? 'bg-blue-100' : 'bg-pink-100'
    : 'bg-[#1a1025]'

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-1000 ${bgClass}`}
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
        <div className="text-center space-y-12 px-8 animate-fade-in z-10">
          <div>
            <p className="text-white/50 text-sm uppercase tracking-[0.3em] mb-3 font-body">Ögonblicket ni har väntat på</p>
            <h1 className="font-display text-6xl sm:text-8xl text-white font-semibold">
              Pojke eller flicka?
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
              <p className="text-white/30 text-xs">{total} gissning{total !== 1 ? 'ar' : ''} inlämnade</p>
            </div>
          )}

          <div className="flex gap-3 justify-center text-4xl animate-float">
            <span>✨</span><span style={{ animationDelay: '0.5s' }}>🌟</span><span style={{ animationDelay: '1s' }}>✨</span>
          </div>
        </div>
      )}

      {/* ── DRUMROLL phase ── */}
      {phase === 'drumroll' && (
        <div className="text-center z-10 animate-fade-in">
          <p className="text-white/60 text-xl uppercase tracking-widest mb-6 font-body">Gör er redo…</p>
          <div className="font-display text-[12rem] leading-none text-white font-bold animate-float">
            {drumrollCount}
          </div>
        </div>
      )}

      {/* ── REVEALED phase ── */}
      {phase === 'revealed' && (
        <div className="text-center z-10 space-y-6 px-8">
          <div className="animate-slide-up">
            <p className={`text-sm uppercase tracking-[0.4em] mb-4 font-body ${isBoy ? 'text-blue-400' : 'text-pink-400'}`}>
              Det blir en…
            </p>
            <h1 className={`font-display font-bold leading-none ${isBoy ? 'text-blue-600' : 'text-pink-500'}`}
              style={{ fontSize: 'clamp(5rem, 20vw, 14rem)' }}>
              {isBoy ? 'POJKE' : 'FLICKA'}
            </h1>
            <div className="text-8xl mt-4 animate-float">
              {isBoy ? '💙' : '💗'}
            </div>
          </div>
          <p className={`font-display italic text-2xl ${isBoy ? 'text-blue-500' : 'text-pink-400'} animate-fade-in`}
            style={{ animationDelay: '0.5s', opacity: 0 }}>
            Grattis! 🎊
          </p>
        </div>
      )}

      {/* Hidden trigger button — only shows when hovering bottom-right corner */}
      {phase === 'waiting' && showTrigger && (
        <button
          onClick={triggerReveal}
          className="fixed bottom-6 right-6 z-30 bg-white/20 hover:bg-white/30 text-white
                     text-xs px-4 py-2 rounded-full backdrop-blur-sm border border-white/20
                     transition-all duration-200"
        >
          Avslöja 🎊
        </button>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'

interface CountdownProps {
  targetDate: Date
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getTimeLeft(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function Pad({ n }: { n: number }) {
  return <span>{String(n).padStart(2, '0')}</span>
}

export default function Countdown({ targetDate }: CountdownProps) {
  const [time, setTime] = useState(() => getTimeLeft(targetDate))

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(targetDate)), 1000)
    return () => clearInterval(id)
  }, [targetDate])

  const units = [
    { label: 'Dagar',    value: time.days },
    { label: 'Timmar',   value: time.hours },
    { label: 'Minuter',  value: time.minutes },
    { label: 'Sekunder', value: time.seconds },
  ]

  return (
    <div className="flex gap-3 justify-center">
      {units.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-sm border border-sun-100
                          flex items-center justify-center text-2xl sm:text-3xl font-display font-semibold text-sage-400">
            <Pad n={value} />
          </div>
          <span className="mt-1 text-xs text-gray-400 font-body tracking-wide uppercase">{label}</span>
        </div>
      ))}
    </div>
  )
}

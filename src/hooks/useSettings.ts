import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export interface Settings {
  gender: 'boy' | 'girl'
  submissionsLocked: boolean
  showTallyToGuests: boolean
  parentsNames: string
  partyDate: string
  partyLocation: string
  partyTime: string
  revealPhase: 'waiting' | 'drumroll' | 'revealed'
  dueDate: string
  actualDate: string
  actualTime: string
  actualWeight: string
  actualLength: string
  actualEyeColor: string
  actualHairColor: string
}

export const DEFAULTS: Settings = {
  gender: 'girl',
  submissionsLocked: false,
  showTallyToGuests: true,
  parentsNames: 'name & name',
  partyDate: '2026-07-19T14:00:00',
  partyLocation: 'Trädgården, Rosgatan 12',
  partyTime: 'Lördag 19 juli · 14:00',
  revealPhase: 'waiting',
  dueDate: '',
  actualDate: '',
  actualTime: '',
  actualWeight: '',
  actualLength: '',
  actualEyeColor: '',
  actualHairColor: '',
}

export function useSettings(): { settings: Settings; loading: boolean } {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [secretGender, setSecretGender] = useState<'boy' | 'girl' | null>(null)
  const [loading, setLoading] = useState(true)

  // Subscribe to public settings (gender is intentionally excluded)
  useEffect(() => {
    const ref = doc(db, 'settings', 'config')
    return onSnapshot(
      ref,
      snap => {
        if (snap.exists()) {
          const { gender: _excluded, ...rest } = snap.data()
          setSettings({ ...DEFAULTS, ...rest } as Settings)
        }
        setLoading(false)
      },
      err => {
        console.error('[useSettings] Firestore error:', err.code, err.message)
        setLoading(false)
      }
    )
  }, [])

  // Subscribe to secrets/config ONLY after reveal — Firestore rules block it before then.
  // This ensures gender is never exposed in network requests before the reveal.
  useEffect(() => {
    if (settings.revealPhase !== 'revealed') return
    const ref = doc(db, 'secrets', 'config')
    return onSnapshot(
      ref,
      snap => {
        if (snap.exists()) {
          const data = snap.data()
          if (data.gender === 'boy' || data.gender === 'girl') {
            setSecretGender(data.gender)
          }
        }
      },
      err => console.error('[useSettings] secrets error:', err.code, err.message)
    )
  }, [settings.revealPhase])

  return {
    settings: { ...settings, gender: secretGender ?? DEFAULTS.gender },
    loading,
  }
}

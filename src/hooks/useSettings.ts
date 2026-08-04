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
}

export function useSettings(): { settings: Settings; loading: boolean } {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ref = doc(db, 'settings', 'config')
    return onSnapshot(
      ref,
      snap => {
        if (snap.exists()) {
          setSettings({ ...DEFAULTS, ...snap.data() } as Settings)
        }
        setLoading(false)
      },
      err => {
        console.error('[useSettings] Firestore error:', err.code, err.message)
        setLoading(false)
      }
    )
  }, [])

  return { settings, loading }
}

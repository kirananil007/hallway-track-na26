import { useEffect, useState } from 'react'
import type { Meta, Session, SideEvent } from '../types'

export type DataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; sessions: Session[]; sideEvents: SideEvent[]; meta: Meta }

// BASE_URL is "/hallway-track-na26/" on GitHub Pages (set in vite.config.ts).
async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  return (await response.json()) as T
}

// Loads the data files once, when the app starts. Side events are optional: if that
// file is missing or broken, the rest of the app still works.
export function useData(): DataState {
  const [state, setState] = useState<DataState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getJson<Session[]>('data/sessions.json'),
      getJson<Meta>('data/meta.json'),
      getJson<SideEvent[]>('data/side_events.json').catch(() => []),
    ])
      .then(([sessions, meta, sideEvents]) => {
        if (!cancelled) setState({ status: 'ready', sessions, sideEvents, meta })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: String(error) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

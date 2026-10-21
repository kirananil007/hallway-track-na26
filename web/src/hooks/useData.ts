import { useEffect, useState } from 'react'
import type { Meta, Session } from '../types'

export type DataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; sessions: Session[]; meta: Meta }

// BASE_URL is "/hallway-track-na26/" on GitHub Pages (set in vite.config.ts).
async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  return (await response.json()) as T
}

// Loads sessions.json and meta.json once, when the app starts.
export function useData(): DataState {
  const [state, setState] = useState<DataState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    Promise.all([getJson<Session[]>('data/sessions.json'), getJson<Meta>('data/meta.json')])
      .then(([sessions, meta]) => {
        if (!cancelled) setState({ status: 'ready', sessions, meta })
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

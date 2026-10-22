// Shapes of the JSON files the pipeline writes to public/data/.
// Keep these in sync with pipeline/normalize.py, ingest.py and build_side_events.py.

export type SessionType = 'keynote' | 'breakout' | 'lightning' | 'colocated' | 'other'
export type Level = 'beginner' | 'intermediate' | 'advanced' | 'unknown'

export interface Session {
  id: string
  title: string
  start: string // ISO 8601 with offset, e.g. "2026-11-10T09:00:00-07:00"
  end: string
  day: string // event-local date, "2026-11-10"
  room: string
  track: string
  type: SessionType
  level: Level
  speakers: string[]
  summary: string
  url: string
  tags: string[]
}

// A community side event from data/events.yaml.
export interface SideEvent {
  id: string
  title: string
  host: string
  start: string
  end: string
  day: string
  venue: string
  address: string // may be empty
  url: string // RSVP / registration page
  tags: string[]
  cost: 'free' | 'paid'
  requires_registration: boolean
  submitted_by: string // GitHub handle
  last_verified: string // YYYY-MM-DD
}

export interface Meta {
  updated_at: string
  source: string
  session_count: number
}

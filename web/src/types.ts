// Shapes of the JSON files the pipeline writes to public/data/.
// Keep these in sync with pipeline/normalize.py and pipeline/ingest.py.

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

export interface Meta {
  updated_at: string
  source: string
  session_count: number
}

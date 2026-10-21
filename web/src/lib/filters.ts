// Browse filters: what they are, how they live in the URL, and how they're applied.
// Everything here is pure (no React, no window) so it's easy to unit-test.

import type { Session } from '../types'
import { EVENT } from './event'

export interface Filters {
  day: string // 'YYYY-MM-DD', or ALL_DAYS
  track: string // '' = any
  type: string // '' = any
  level: string // '' = any
  tags: string[] // match ANY of these
  q: string // free-text search
  showOther: boolean // include breaks, expo stages, theaters
}

export const ALL_DAYS = 'all'

// During the event, default to today; before it, to the first main-conference day.
export function defaultFilters(today: string): Filters {
  const day = (EVENT.days as readonly string[]).includes(today) ? today : EVENT.defaultDay
  return { day, track: '', type: '', level: '', tags: [], q: '', showOther: false }
}

// Read filters from the URL hash query, e.g. "day=2026-11-11&tags=sre,ebpf&q=otel".
export function filtersFromParams(params: URLSearchParams, today: string): Filters {
  const defaults = defaultFilters(today)
  return {
    day: params.get('day') || defaults.day,
    track: params.get('track') ?? '',
    type: params.get('type') ?? '',
    level: params.get('level') ?? '',
    tags: (params.get('tags') ?? '').split(',').filter(Boolean),
    q: params.get('q') ?? '',
    showOther: params.get('other') === '1',
  }
}

// The reverse of filtersFromParams. Default values are left out to keep links short.
export function filtersToParams(filters: Filters, today: string): URLSearchParams {
  const defaults = defaultFilters(today)
  const params = new URLSearchParams()
  if (filters.day !== defaults.day) params.set('day', filters.day)
  if (filters.track) params.set('track', filters.track)
  if (filters.type) params.set('type', filters.type)
  if (filters.level) params.set('level', filters.level)
  if (filters.tags.length) params.set('tags', filters.tags.join(','))
  if (filters.q) params.set('q', filters.q)
  if (filters.showOther) params.set('other', '1')
  return params
}

export function isDefault(filters: Filters, today: string): boolean {
  return filtersToParams(filters, today).toString() === ''
}

export function applyFilters(sessions: Session[], f: Filters): Session[] {
  // Every word in the search box must appear somewhere in title, speakers or summary.
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean)

  return sessions.filter((s) => {
    if (f.day !== ALL_DAYS && s.day !== f.day) return false
    if (f.track && s.track !== f.track) return false
    if (f.type && s.type !== f.type) return false
    // Breaks and expo stages are hidden unless asked for (or the type filter picks them).
    if (!f.showOther && !f.type && s.type === 'other') return false
    if (f.level && s.level !== f.level) return false
    if (f.tags.length && !f.tags.some((t) => s.tags.includes(t))) return false
    if (words.length) {
      const haystack = `${s.title} ${s.speakers.join(' ')} ${s.summary}`.toLowerCase()
      if (!words.every((w) => haystack.includes(w))) return false
    }
    return true
  })
}

export interface TimeSlot {
  start: string
  sessions: Session[]
}

export interface DayGroup {
  day: string
  slots: TimeSlot[]
}

// Group sessions by day, then by start time. Assumes nothing about the input order.
export function groupByDayAndSlot(sessions: Session[]): DayGroup[] {
  const sorted = [...sessions].sort(
    (a, b) => Date.parse(a.start) - Date.parse(b.start) || a.title.localeCompare(b.title),
  )
  const days: DayGroup[] = []
  for (const s of sorted) {
    let day = days[days.length - 1]
    if (!day || day.day !== s.day) {
      day = { day: s.day, slots: [] }
      days.push(day)
    }
    let slot = day.slots[day.slots.length - 1]
    if (!slot || slot.start !== s.start) {
      slot = { start: s.start, sessions: [] }
      day.slots.push(slot)
    }
    slot.sessions.push(s)
  }
  return days.sort((a, b) => a.day.localeCompare(b.day))
}

export interface FilterOptions {
  tracks: string[]
  levels: string[]
  tags: string[] // most common first
}

// The choices to offer in the filter controls, based on what's actually in the data.
export function filterOptions(sessions: Session[]): FilterOptions {
  const tracks = new Set<string>()
  const levels = new Set<string>()
  const tagCounts = new Map<string, number>()
  for (const s of sessions) {
    if (s.track) tracks.add(s.track)
    if (s.level !== 'unknown') levels.add(s.level)
    for (const t of s.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
  }
  const levelOrder = ['beginner', 'intermediate', 'advanced']
  return {
    tracks: [...tracks].sort((a, b) => a.localeCompare(b)),
    levels: levelOrder.filter((l) => levels.has(l)),
    tags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t),
  }
}

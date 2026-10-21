// Date/time formatting with the browser's built-in Intl API (no date library needed).
// "event" mode shows Salt Lake City time; "local" mode shows the viewer's own time zone.

import { EVENT } from './event'

export type TimeMode = 'event' | 'local'

// The IANA time zone to format in. `undefined` tells Intl to use the viewer's zone.
export function zoneFor(mode: TimeMode): string | undefined {
  return mode === 'event' ? EVENT.timeZone : undefined
}

// "9:00 AM". Some browsers put a narrow no-break space before AM/PM; we normalize it.
export function formatTime(iso: string, timeZone?: string): string {
  const text = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(
    new Date(iso),
  )
  return text.replace(/\s/g, ' ')
}

export function durationMinutes(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 60000)
}

// "30 min", "1 h", "1 h 30 min", "8 h"
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

// "2026-11-10" -> "Tue, Nov 10". We read the date at noon UTC so it never shifts a day.
export function formatDayLabel(day: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${day}T12:00:00Z`),
  )
}

// Short zone name such as "MST" or "GMT+5:30", as it will be during the event.
export function zoneLabel(timeZone?: string, at: Date = new Date('2026-11-10T19:00:00Z')): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(at)
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
}

// Today's date in Salt Lake City, as 'YYYY-MM-DD' (the en-CA locale formats dates that way).
export function todayInEventZone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: EVENT.timeZone }).format(now)
}

// "Oct 21, 4:13 PM" in the viewer's own time zone, for "data updated at".
export function formatUpdatedAt(iso: string, timeZone?: string): string {
  const text = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso))
  return text.replace(/\s/g, ' ')
}

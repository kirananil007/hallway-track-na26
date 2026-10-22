// Build an iCalendar (.ics) file that Google Calendar, Apple Calendar and Outlook can import.
// Spec: RFC 5545. The fiddly parts are handled here: CRLF line endings, escaping, folding
// long lines at 75 bytes, and a VTIMEZONE block so times stay in Salt Lake City time.

import type { Session } from '../types'
import { EVENT } from './event'
import { roomLabel } from './labels'

export interface CalendarEvent {
  uid: string
  title: string
  start: string // ISO 8601 with offset
  end: string
  location?: string
  url?: string
  description?: string
  tentative?: boolean // backups go in as "tentative" and don't block time
}

const CRLF = '\r\n'
const TZID = EVENT.timeZone // America/Denver
const UID_DOMAIN = 'hallway-track-na26'

// America/Denver rules: MDT (UTC-6) from the 2nd Sunday in March, MST (UTC-7) from the 1st Sunday in November.
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0700',
  'TZOFFSETTO:-0600',
  'TZNAME:MDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0600',
  'TZOFFSETTO:-0700',
  'TZNAME:MST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
]

// Text values must escape backslash, semicolon, comma and newlines.
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// Lines longer than 75 bytes are split, and each continuation line starts with a space.
// We count UTF-8 bytes and never split a character (emoji and accents are multi-byte).
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ''
  let bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    if (bytes + size > 75) {
      parts.push(current)
      current = ' '
      bytes = 1
    }
    current += char
    bytes += size
  }
  parts.push(current)
  return parts.join(CRLF)
}

// "2026-11-10T09:00:00-07:00" -> "20261110T090000", as wall-clock time in Salt Lake City.
export function toLocalStamp(iso: string, timeZone: string = TZID): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}${get('month')}${get('day')}T${get('hour')}${get('minute')}${get('second')}`
}

// A UTC timestamp such as "20261021T221300Z" (for DTSTAMP).
export function toUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function vevent(event: CalendarEvent, stamp: string): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${TZID}:${toLocalStamp(event.start)}`,
    `DTEND;TZID=${TZID}:${toLocalStamp(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ]
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
  if (event.url) lines.push(`URL:${event.url}`)
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`)
  lines.push(event.tentative ? 'STATUS:TENTATIVE' : 'STATUS:CONFIRMED')
  lines.push(event.tentative ? 'TRANSP:TRANSPARENT' : 'TRANSP:OPAQUE')
  lines.push('END:VEVENT')
  return lines
}

export function buildCalendar(events: CalendarEvent[], now: Date = new Date()): string {
  const stamp = toUtcStamp(now)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hallway Track//KubeCon NA 2026 community planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:KubeCon NA 2026 (Hallway Track)',
    `X-WR-TIMEZONE:${TZID}`,
    ...VTIMEZONE,
    ...events.flatMap((event) => vevent(event, stamp)),
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join(CRLF) + CRLF
}

// A plan session as a calendar event. The UID stays the same across exports, so
// re-importing an updated plan updates events instead of duplicating them (in most apps).
export function sessionToEvent(session: Session, backup: boolean): CalendarEvent {
  const description = [
    backup ? 'Backup option for this time slot.' : '',
    session.speakers.length ? `Speakers: ${session.speakers.join(', ')}` : '',
    session.summary,
    `Details: ${session.url}`,
    'Added with Hallway Track (unofficial community planner).',
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    uid: `session-${session.id}@${UID_DOMAIN}`,
    title: backup ? `[Backup] ${session.title}` : session.title,
    start: session.start,
    end: session.end,
    location: [roomLabel(session.room), EVENT.city].filter(Boolean).join(', '),
    url: session.url,
    description,
    tentative: backup,
  }
}

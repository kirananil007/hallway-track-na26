import { describe, expect, it } from 'vitest'
import type { Session } from '../types'
import { buildCalendar, escapeText, foldLine, sessionToEvent, sideEventToEvent, toLocalStamp, toUtcStamp } from './ics'

const NOW = new Date('2026-10-21T22:13:00Z')

const SESSION: Session = {
  id: '1246765',
  title: 'One Recipe, Five Clouds; One Query',
  start: '2026-11-10T11:30:00-07:00',
  end: '2026-11-10T12:00:00-07:00',
  day: '2026-11-10',
  room: 'Hyatt Regency | Level 2 | Salt Lake Ballroom C',
  track: 'Platform Engineering',
  type: 'breakout',
  level: 'unknown',
  speakers: ['Avery Example', 'Blake Sample'],
  summary: 'Short summary.',
  url: 'https://example.invalid/session/1246765',
  tags: [],
}

// Undo line folding, to check the logical content of a calendar.
const unfold = (ics: string) => ics.replace(/\r\n /g, '')

describe('ics helpers', () => {
  it('escapes text values', () => {
    expect(escapeText('a, b; c\\d\nnext')).toBe('a\\, b\\; c\\\\d\\nnext')
  })

  it('converts instants to Salt Lake City wall-clock time', () => {
    expect(toLocalStamp('2026-11-10T11:30:00-07:00')).toBe('20261110T113000')
    expect(toLocalStamp('2026-11-10T18:30:00Z')).toBe('20261110T113000')
    expect(toLocalStamp('2026-11-11T06:30:00Z')).toBe('20261110T233000') // still the evening before
  })

  it('formats DTSTAMP in UTC', () => {
    expect(toUtcStamp(NOW)).toBe('20261021T221300Z')
  })

  it('folds long lines at 75 bytes without splitting characters', () => {
    const line = 'DESCRIPTION:' + 'é☕'.repeat(60)
    const folded = foldLine(line)
    const encoder = new TextEncoder()
    for (const part of folded.split('\r\n')) expect(encoder.encode(part).length).toBeLessThanOrEqual(75)
    expect(folded.split('\r\n').slice(1).every((part) => part.startsWith(' '))).toBe(true)
    expect(folded.replace(/\r\n /g, '')).toBe(line)
  })

  it('leaves short lines alone', () => {
    expect(foldLine('SUMMARY:Hi')).toBe('SUMMARY:Hi')
  })
})

describe('buildCalendar', () => {
  const ics = buildCalendar([sessionToEvent(SESSION, false)], NOW)

  it('produces a valid calendar skeleton with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n') // no bare LFs
    expect(ics).toContain('BEGIN:VTIMEZONE\r\nTZID:America/Denver')
  })

  it('writes the event the way calendar apps expect', () => {
    const text = unfold(ics)
    const event = text.slice(text.indexOf('BEGIN:VEVENT'), text.indexOf('END:VEVENT') + 'END:VEVENT'.length)
    expect(event).toBe(
      [
        'BEGIN:VEVENT',
        'UID:session-1246765@hallway-track-na26',
        'DTSTAMP:20261021T221300Z',
        'DTSTART;TZID=America/Denver:20261110T113000',
        'DTEND;TZID=America/Denver:20261110T120000',
        'SUMMARY:One Recipe\\, Five Clouds\\; One Query',
        'LOCATION:Hyatt Regency · Level 2 · Salt Lake Ballroom C\\, Salt Lake City',
        'URL:https://example.invalid/session/1246765',
        'DESCRIPTION:Speakers: Avery Example\\, Blake Sample\\n\\nShort summary.\\n\\nDetails: https://example.invalid/session/1246765\\n\\nAdded with Hallway Track (unofficial community planner).',
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT',
      ].join('\r\n'),
    )
  })

  it('exports backups as tentative, free-time events', () => {
    const text = unfold(buildCalendar([sessionToEvent(SESSION, true)], NOW))
    expect(text).toContain('SUMMARY:[Backup] One Recipe')
    expect(text).toContain('STATUS:TENTATIVE')
    expect(text).toContain('TRANSP:TRANSPARENT')
    expect(text).toContain('DESCRIPTION:Backup option for this time slot.')
  })

  it('keeps UIDs stable across exports so re-imports update instead of duplicating', () => {
    const later = buildCalendar([sessionToEvent(SESSION, false)], new Date('2026-11-01T00:00:00Z'))
    expect(later).toContain('UID:session-1246765@hallway-track-na26')
  })

  it('exports side events with venue, RSVP link and a community note', () => {
    const side = sideEventToEvent(
      {
        id: 'otel-meetup',
        title: 'OTel meetup',
        host: 'Some Group',
        start: '2026-11-10T18:30:00-07:00',
        end: '2026-11-10T21:00:00-07:00',
        day: '2026-11-10',
        venue: 'A Venue',
        address: '1 Main St',
        url: 'https://example.com/rsvp',
        tags: [],
        cost: 'free',
        requires_registration: true,
        submitted_by: 'someone',
        last_verified: '2026-10-21',
        example: false,
      },
      false,
    )
    const text = unfold(buildCalendar([side], NOW))
    expect(text).toContain('UID:side-otel-meetup@hallway-track-na26')
    expect(text).toContain('DTSTART;TZID=America/Denver:20261110T183000')
    expect(text).toContain('LOCATION:A Venue\\, 1 Main St')
    expect(text).toContain('Free\\, registration required.')
    expect(text).toContain('Community-submitted side event')
  })

  it('produces an empty but valid calendar for an empty plan', () => {
    const empty = buildCalendar([], NOW)
    expect(empty).not.toContain('BEGIN:VEVENT')
    expect(empty.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
})

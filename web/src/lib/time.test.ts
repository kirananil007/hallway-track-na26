import { describe, expect, it } from 'vitest'
import {
  durationMinutes,
  formatDayLabel,
  formatDuration,
  formatTime,
  todayInEventZone,
  zoneFor,
  zoneLabel,
} from './time'

describe('time formatting', () => {
  it('shows event times in Salt Lake City time (MST)', () => {
    expect(formatTime('2026-11-10T09:00:00-07:00', zoneFor('event'))).toBe('9:00 AM')
    expect(zoneLabel('America/Denver')).toBe('MST')
  })

  it('converts to another zone for "my time"', () => {
    expect(formatTime('2026-11-10T09:00:00-07:00', 'America/New_York')).toBe('11:00 AM')
    expect(formatTime('2026-11-10T09:00:00-07:00', 'Asia/Kolkata')).toBe('9:30 PM')
  })

  it('labels days without shifting the date', () => {
    expect(formatDayLabel('2026-11-10')).toBe('Tue, Nov 10')
    expect(formatDayLabel('2026-11-09')).toBe('Mon, Nov 9')
  })

  it('computes and formats durations', () => {
    expect(durationMinutes('2026-11-10T09:00:00-07:00', '2026-11-10T09:30:00-07:00')).toBe(30)
    expect(formatDuration(30)).toBe('30 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(90)).toBe('1 h 30 min')
    expect(formatDuration(480)).toBe('8 h')
  })

  it("knows today's date in Salt Lake City", () => {
    // 2026-11-10 03:00 UTC is still the evening of Nov 9 in Salt Lake City.
    expect(todayInEventZone(new Date('2026-11-10T03:00:00Z'))).toBe('2026-11-09')
  })
})

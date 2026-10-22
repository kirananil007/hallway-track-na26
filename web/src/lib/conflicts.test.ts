import { describe, expect, it } from 'vitest'
import { findConflicts, overlaps } from './conflicts'

const at = (hhmm: string) => `2026-11-10T${hhmm}:00-07:00`
const item = (key: string, start: string, end: string) => ({ key, start: at(start), end: at(end) })

describe('overlaps', () => {
  it('detects partial and nested overlaps', () => {
    expect(overlaps(item('a', '11:00', '11:30'), item('b', '11:15', '11:45'))).toBe(true)
    expect(overlaps(item('a', '09:00', '17:00'), item('b', '11:00', '11:30'))).toBe(true) // nested
    expect(overlaps(item('a', '11:00', '11:30'), item('b', '11:00', '11:30'))).toBe(true) // identical
  })

  it('treats back-to-back sessions as not overlapping', () => {
    expect(overlaps(item('a', '11:00', '11:30'), item('b', '11:30', '12:00'))).toBe(false)
  })

  it('compares real instants, not strings (different offsets)', () => {
    const utc = { start: '2026-11-10T18:15:00Z', end: '2026-11-10T18:45:00Z' } // 11:15-11:45 MST
    expect(overlaps(item('a', '11:00', '11:30'), utc)).toBe(true)
  })
})

describe('findConflicts', () => {
  it('maps each conflicting item to everything it clashes with', () => {
    const conflicts = findConflicts([
      item('a', '11:00', '11:30'),
      item('b', '11:15', '11:45'),
      item('c', '11:20', '11:25'),
      item('d', '13:00', '13:30'),
    ])
    expect(conflicts.get('a')).toEqual(['b', 'c'])
    expect(conflicts.get('c')).toEqual(['a', 'b'])
    expect(conflicts.has('d')).toBe(false)
  })

  it('returns nothing for an empty or conflict-free plan', () => {
    expect(findConflicts([]).size).toBe(0)
    expect(findConflicts([item('a', '09:00', '10:00'), item('b', '10:00', '11:00')]).size).toBe(0)
  })
})

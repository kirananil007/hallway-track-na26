import { describe, expect, it } from 'vitest'
import type { Session } from '../types'
import {
  ALL_DAYS,
  applyFilters,
  defaultFilters,
  filterOptions,
  filtersFromParams,
  filtersToParams,
  groupByDayAndSlot,
  isDefault,
} from './filters'

// Build a test session with sensible defaults; override only what a test cares about.
function session(overrides: Partial<Session>): Session {
  return {
    id: 'x',
    title: 'Untitled',
    start: '2026-11-10T11:00:00-07:00',
    end: '2026-11-10T11:30:00-07:00',
    day: '2026-11-10',
    room: 'Salt Palace | Level 1 | Hall DE',
    track: 'Observability',
    type: 'breakout',
    level: 'unknown',
    speakers: [],
    summary: '',
    url: 'https://example.invalid/session/x',
    tags: [],
    ...overrides,
  }
}

const SESSIONS: Session[] = [
  session({ id: 'a', title: 'Tracing at scale', speakers: ['Avery Example'], tags: ['observability', 'sre'] }),
  session({ id: 'b', title: 'eBPF for everyone', level: 'beginner', tags: ['ebpf'], track: 'Security' }),
  session({ id: 'c', title: 'Keynote', type: 'keynote', start: '2026-11-10T09:00:00-07:00' }),
  session({ id: 'd', title: 'Lunch', type: 'other', track: 'Breaks' }),
  session({ id: 'e', title: 'ArgoCon', type: 'colocated', day: '2026-11-09', start: '2026-11-09T09:00:00-07:00' }),
]

const BEFORE_EVENT = '2026-10-21'
const ids = (list: Session[]) => list.map((s) => s.id)

describe('defaultFilters', () => {
  it('starts on the first main-conference day before the event', () => {
    expect(defaultFilters(BEFORE_EVENT).day).toBe('2026-11-10')
  })

  it('starts on today during the event', () => {
    expect(defaultFilters('2026-11-11').day).toBe('2026-11-11')
  })
})

describe('applyFilters', () => {
  const base = defaultFilters(BEFORE_EVENT)

  it('shows the default day and hides breaks', () => {
    expect(ids(applyFilters(SESSIONS, base))).toEqual(['a', 'b', 'c'])
  })

  it('can show breaks and expo stages', () => {
    expect(ids(applyFilters(SESSIONS, { ...base, showOther: true }))).toContain('d')
  })

  it('shows breaks when the type filter asks for them', () => {
    expect(ids(applyFilters(SESSIONS, { ...base, type: 'other' }))).toEqual(['d'])
  })

  it('filters by day, or shows all days', () => {
    expect(ids(applyFilters(SESSIONS, { ...base, day: '2026-11-09' }))).toEqual(['e'])
    expect(applyFilters(SESSIONS, { ...base, day: ALL_DAYS })).toHaveLength(4)
  })

  it('filters by track, type and level', () => {
    expect(ids(applyFilters(SESSIONS, { ...base, track: 'Security' }))).toEqual(['b'])
    expect(ids(applyFilters(SESSIONS, { ...base, type: 'keynote' }))).toEqual(['c'])
    expect(ids(applyFilters(SESSIONS, { ...base, level: 'beginner' }))).toEqual(['b'])
  })

  it('matches any of the selected tags', () => {
    expect(ids(applyFilters(SESSIONS, { ...base, tags: ['sre', 'ebpf'] }))).toEqual(['a', 'b'])
  })

  it('searches title, speakers and summary, case-insensitively, all words required', () => {
    expect(ids(applyFilters(SESSIONS, { ...base, q: 'avery' }))).toEqual(['a'])
    expect(ids(applyFilters(SESSIONS, { ...base, q: 'EBPF everyone' }))).toEqual(['b'])
    expect(ids(applyFilters(SESSIONS, { ...base, q: 'ebpf tracing' }))).toEqual([])
  })
})

describe('URL params', () => {
  it('round-trips through the URL', () => {
    const filters = { ...defaultFilters(BEFORE_EVENT), day: '2026-11-11', tags: ['sre', 'ebpf'], q: 'otel & friends' }
    const params = filtersToParams(filters, BEFORE_EVENT)
    expect(filtersFromParams(new URLSearchParams(params.toString()), BEFORE_EVENT)).toEqual(filters)
  })

  it('leaves defaults out so links stay short', () => {
    expect(filtersToParams(defaultFilters(BEFORE_EVENT), BEFORE_EVENT).toString()).toBe('')
    expect(isDefault(defaultFilters(BEFORE_EVENT), BEFORE_EVENT)).toBe(true)
  })

  it('ignores junk in the URL', () => {
    const filters = filtersFromParams(new URLSearchParams('tags=,,&other=yes'), BEFORE_EVENT)
    expect(filters.tags).toEqual([])
    expect(filters.showOther).toBe(false)
  })
})

describe('groupByDayAndSlot', () => {
  it('groups by day, then start time, in order', () => {
    const groups = groupByDayAndSlot([...SESSIONS].reverse())
    expect(groups.map((g) => g.day)).toEqual(['2026-11-09', '2026-11-10'])
    const tuesday = groups[1]
    expect(tuesday.slots.map((s) => s.start)).toEqual(['2026-11-10T09:00:00-07:00', '2026-11-10T11:00:00-07:00'])
    expect(ids(tuesday.slots[1].sessions)).toEqual(['b', 'd', 'a']) // alphabetical within a slot
  })
})

describe('filterOptions', () => {
  it('lists tracks, levels present, and tags by popularity', () => {
    const options = filterOptions([...SESSIONS, session({ id: 'f', tags: ['sre'] })])
    expect(options.tracks).toEqual(['Breaks', 'Observability', 'Security'])
    expect(options.levels).toEqual(['beginner'])
    expect(options.tags[0]).toBe('sre')
  })
})

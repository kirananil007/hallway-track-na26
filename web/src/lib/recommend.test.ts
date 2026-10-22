import { describe, expect, it } from 'vitest'
import type { Session } from '../types'
import { overlaps } from './conflicts'
import { profileFromParams, profileToParams, recommend } from './recommend'
import { POINTS, scoreSession, type Profile } from './scoring'

function session(overrides: Partial<Session>): Session {
  return {
    id: 'x',
    title: 'Untitled',
    start: '2026-11-10T11:00:00-07:00',
    end: '2026-11-10T11:30:00-07:00',
    day: '2026-11-10',
    room: '',
    track: 'Other Things',
    type: 'breakout',
    level: 'unknown',
    speakers: [],
    summary: '',
    url: '',
    tags: [],
    ...overrides,
  }
}

const at = (day: string, hhmm: string) => `${day}T${hhmm}:00-07:00`
const TUE = '2026-11-10'
const MON = '2026-11-09'

const PROFILE: Profile = { role: '', interests: ['sre'], experience: 'intermediate', days: [TUE], allAccess: false }

describe('scoreSession', () => {
  it('scores each signal and explains it', () => {
    const s = session({ tags: ['sre', 'observability'], track: 'Observability', level: 'intermediate' })
    const result = scoreSession(s, { ...PROFILE, role: 'sre', interests: ['sre', 'observability'] })
    // 2 interests x 3, observability track +2, role tags (capped) +2, exact level +2
    expect(result.score).toBe(2 * POINTS.interest + POINTS.track + POINTS.roleCap + POINTS.levelExact)
    expect(result.matched).toEqual(['sre', 'observability'])
    expect(result.reasons).toEqual(['matched: SRE, Observability', 'Observability track', 'fits SRE', 'intermediate level'])
  })

  it('rewards near levels a little and penalises far ones', () => {
    const beginner = { ...PROFILE, experience: 'beginner' as const }
    expect(scoreSession(session({ tags: ['sre'], level: 'intermediate' }), beginner).score).toBe(
      POINTS.interest + POINTS.levelNear,
    )
    expect(scoreSession(session({ tags: ['sre'], level: 'advanced' }), beginner).score).toBe(
      POINTS.interest + POINTS.levelFar,
    )
    expect(scoreSession(session({ tags: ['sre'], level: 'unknown' }), beginner).score).toBe(POINTS.interest)
  })

  it('gives keynotes a small boost', () => {
    const result = scoreSession(session({ tags: ['sre'], type: 'keynote' }), PROFILE)
    expect(result.score).toBe(POINTS.interest + POINTS.keynote)
    expect(result.reasons).toContain('keynote')
  })
})

describe('recommend', () => {
  const sessions = [
    session({ id: 'best', tags: ['sre'], track: 'Operations + Performance', start: at(TUE, '11:00'), end: at(TUE, '11:30') }),
    session({ id: 'second', tags: ['sre'], start: at(TUE, '11:00'), end: at(TUE, '11:30') }),
    session({ id: 'third', tags: ['sre'], start: at(TUE, '11:15'), end: at(TUE, '11:45') }),
    session({ id: 'later', tags: ['sre'], start: at(TUE, '14:00'), end: at(TUE, '14:30') }),
    session({ id: 'nomatch', tags: ['wasm'], start: at(TUE, '16:00'), end: at(TUE, '16:30') }),
    session({ id: 'break', tags: ['sre'], type: 'other', start: at(TUE, '15:00'), end: at(TUE, '15:15') }),
    session({ id: 'colo', tags: ['sre'], type: 'colocated', day: MON, start: at(MON, '09:00'), end: at(MON, '17:00') }),
    session({ id: 'plt', tags: ['sre'], type: 'lightning', track: 'Project Lightning Talks', day: MON, start: at(MON, '10:00'), end: at(MON, '10:05') }),
  ]

  it('picks the best session per slot, never with clashes', () => {
    const picks = recommend(sessions, PROFILE)
    expect(picks.map((p) => p.main.session.id)).toEqual(['best', 'later'])
    const mains = picks.map((p) => p.main.session)
    for (let i = 0; i < mains.length; i++)
      for (let j = i + 1; j < mains.length; j++) expect(overlaps(mains[i], mains[j])).toBe(false)
  })

  it('gives each pick the best overlapping leftover as its backup', () => {
    const [first, second] = recommend(sessions, PROFILE)
    expect(first.backup?.session.id).toBe('second') // ties with 'third' on score, starts earlier
    expect(overlaps(first.backup!.session, first.main.session)).toBe(true)
    expect(second.backup).toBeUndefined()
  })

  it('skips breaks and sessions that match none of the interests', () => {
    const ids = recommend(sessions, PROFILE).flatMap((p) => [p.main.session.id, p.backup?.session.id])
    expect(ids).not.toContain('nomatch')
    expect(ids).not.toContain('break')
  })

  it('follows pass rules on Monday', () => {
    const monday = { ...PROFILE, days: [MON] }
    expect(recommend(sessions, monday).map((p) => p.main.session.id)).toEqual(['plt']) // KubeCon-only pass
    const allAccess = recommend(sessions, { ...monday, allAccess: true })
    expect(allAccess.map((p) => p.main.session.id)).toEqual(['colo'])
    expect(allAccess[0].backup?.session.id).toBe('plt')
  })

  it('is deterministic whatever the input order', () => {
    const forward = recommend(sessions, PROFILE)
    const backward = recommend([...sessions].reverse(), PROFILE)
    expect(backward).toEqual(forward)
  })
})

describe('profile in the URL', () => {
  it('round-trips and leaves defaults out', () => {
    const profile: Profile = { role: 'sre', interests: ['sre', 'ebpf'], experience: 'advanced', days: [MON, TUE], allAccess: true }
    expect(profileFromParams(profileToParams(profile))).toEqual(profile)
    expect(profileToParams(profileFromParams(new URLSearchParams())).toString()).toBe('')
  })

  it('ignores junk and caps interests at five', () => {
    const profile = profileFromParams(new URLSearchParams('role=wizard&tags=a,b,c,d,e,f&days=2030-01-01&level=guru'))
    expect(profile.role).toBe('')
    expect(profile.interests).toHaveLength(5)
    expect(profile.days).toEqual(['2026-11-10', '2026-11-11', '2026-11-12'])
    expect(profile.experience).toBe('intermediate')
  })
})

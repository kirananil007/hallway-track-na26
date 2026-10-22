import { describe, expect, it } from 'vitest'
import type { Session } from '../types'
import { mondayGuide, parseColocatedTitle } from './monday'

describe('parseColocatedTitle', () => {
  it('splits CNCF-hosted titles', () => {
    expect(parseColocatedTitle('ArgoCon Hosted by CNCF - Full Day Event | ALL ACCESS PASS REQUIRED')).toEqual({
      name: 'ArgoCon',
      host: 'CNCF',
      length: 'full',
      access: 'all-access',
    })
    expect(parseColocatedTitle('CiliumCon Hosted by CNCF - Half Day Event | ALL ACCESS PASS REQUIRED').length).toBe('half')
  })

  it('splits sponsor-hosted titles', () => {
    expect(parseColocatedTitle('OpenShift Commons Gathering Hosted by Red Hat | SEPARATE REGISTRATION REQUIRED')).toEqual({
      name: 'OpenShift Commons Gathering',
      host: 'Red Hat',
      length: null,
      access: 'separate',
    })
  })

  it('keeps titles without "Hosted by" whole', () => {
    expect(parseColocatedTitle('Microsoft Azure Day with Kubernetes  | SEPARATE REGISTRATION REQUIRED')).toEqual({
      name: 'Microsoft Azure Day with Kubernetes',
      host: '',
      length: null,
      access: 'separate',
    })
    expect(parseColocatedTitle('Plain Title').access).toBeNull()
  })
})

describe('mondayGuide', () => {
  const s = (overrides: Partial<Session>) => ({ id: 'x', title: 't', start: '2026-11-09T09:00:00-07:00', end: '2026-11-09T17:00:00-07:00', day: '2026-11-09', type: 'breakout', track: '', ...overrides }) as Session

  it('separates CNCF-hosted, sponsor-hosted and Project Lightning Talks', () => {
    const guide = mondayGuide([
      s({ id: 'b', type: 'colocated', track: 'CNCF-hosted Co-located Events', start: '2026-11-09T13:25:00-07:00' }),
      s({ id: 'a', type: 'colocated', track: 'CNCF-hosted Co-located Events' }),
      s({ id: 'sp', type: 'colocated', track: 'Sponsor-hosted Co-located Events', day: '2026-11-11' }),
      s({ id: 'plt', type: 'lightning', track: 'Project Lightning Talks' }),
      s({ id: 'brk', type: 'other', track: 'Project Lightning Talks' }),
      s({ id: 'talk', day: '2026-11-10' }),
    ])
    expect(guide.cncf.map((x) => x.id)).toEqual(['a', 'b'])
    expect(guide.sponsor.map((x) => x.id)).toEqual(['sp'])
    expect(guide.lightning.map((x) => x.id)).toEqual(['plt'])
  })
})

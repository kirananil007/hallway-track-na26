import { describe, expect, it } from 'vitest'
import type { Session, SideEvent } from '../types'
import type { PlanItem } from './plan'
import { countClashes, planConflicts, resolvePlan } from './planEntries'

const at = (hhmm: string) => `2026-11-10T${hhmm}:00-07:00`

const talk = { id: 't1', title: 'Evening talk', start: at('17:30'), end: at('18:30'), day: '2026-11-10' } as Session
const meetup = { id: 'm1', title: 'Meetup', start: at('18:00'), end: at('20:00'), day: '2026-11-10' } as SideEvent
const coffee = { id: 'c1', title: 'Coffee', start: at('07:30'), end: at('08:30'), day: '2026-11-10' } as SideEvent

const sessions = new Map([[talk.id, talk]])
const sides = new Map([
  [meetup.id, meetup],
  [coffee.id, coffee],
])

const plan: PlanItem[] = [
  { id: 'm1', kind: 'side', backup: false },
  { id: 't1', kind: 'session', backup: false },
  { id: 'c1', kind: 'side', backup: false },
  { id: 'gone', kind: 'session', backup: false },
]

describe('resolvePlan', () => {
  it('mixes sessions and side events on one timeline and reports missing items', () => {
    const { entries, missing } = resolvePlan(plan, sessions, sides)
    expect(entries.map((e) => e.key)).toEqual(['side:c1', 'session:t1', 'side:m1'])
    expect(entries[1].session?.id).toBe('t1')
    expect(entries[2].side?.id).toBe('m1')
    expect(missing).toEqual([{ id: 'gone', kind: 'session', backup: false }])
  })
})

describe('conflicts across sessions and side events', () => {
  it('flags a talk that runs into a meetup', () => {
    const { entries } = resolvePlan(plan, sessions, sides)
    const conflicts = planConflicts(entries)
    expect(conflicts.get('session:t1')).toEqual(['side:m1'])
    expect(conflicts.has('side:c1')).toBe(false)
  })

  it('ignores backups', () => {
    const withBackup = plan.map((i) => (i.id === 'm1' ? { ...i, backup: true } : i))
    expect(planConflicts(resolvePlan(withBackup, sessions, sides).entries).size).toBe(0)
  })

  it('counts clashes for something not yet in the plan', () => {
    const { entries } = resolvePlan(plan, sessions, sides)
    expect(countClashes('session:new', { start: at('18:15'), end: at('18:45') }, entries)).toBe(2)
    expect(countClashes('side:m1', meetup, entries)).toBe(1) // itself doesn't count
  })
})

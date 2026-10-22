import { describe, expect, it } from 'vitest'
import { findItem, mergePlans, parsePlan, planKey, removeItems, setBackup, toggleItem, type PlanItem } from './plan'

describe('plan', () => {
  it('toggles items in and out', () => {
    let plan: PlanItem[] = []
    plan = toggleItem(plan, 'session', '1')
    expect(plan).toEqual([{ id: '1', kind: 'session', backup: false }])
    plan = toggleItem(plan, 'session', '1')
    expect(plan).toEqual([])
  })

  it('keeps sessions and side events with the same id apart', () => {
    const plan = toggleItem(toggleItem([], 'session', 'x'), 'side', 'x')
    expect(plan).toHaveLength(2)
    expect(findItem(plan, 'side', 'x')?.kind).toBe('side')
  })

  it('marks backups and removes by key', () => {
    let plan = toggleItem(toggleItem([], 'session', '1'), 'session', '2')
    plan = setBackup(plan, 'session', '2', true)
    expect(findItem(plan, 'session', '2')?.backup).toBe(true)
    plan = removeItems(plan, new Set([planKey('session', '1')]))
    expect(plan.map((i) => i.id)).toEqual(['2'])
  })

  it('merges a shared plan without touching existing items', () => {
    const mine = [{ id: '1', kind: 'session', backup: true }] as PlanItem[]
    const shared = [
      { id: '1', kind: 'session', backup: false },
      { id: '2', kind: 'session', backup: false },
    ] as PlanItem[]
    expect(mergePlans(mine, shared)).toEqual([
      { id: '1', kind: 'session', backup: true },
      { id: '2', kind: 'session', backup: false },
    ])
  })

  it('parses stored data defensively', () => {
    expect(parsePlan(null)).toEqual([])
    expect(parsePlan('nope')).toEqual([])
    expect(
      parsePlan([
        { id: '1', kind: 'session', backup: true },
        { id: '1', kind: 'session' }, // duplicate
        { id: 2, kind: 'session' }, // id must be a string
        { id: '3', kind: 'talk' }, // unknown kind
        null,
        { id: '4', kind: 'side', backup: 'yes' }, // backup must be true to count
      ]),
    ).toEqual([
      { id: '1', kind: 'session', backup: true },
      { id: '4', kind: 'side', backup: false },
    ])
  })
})

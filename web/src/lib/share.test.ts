import { describe, expect, it } from 'vitest'
import type { PlanItem } from './plan'
import { decodePlan, encodePlan } from './share'

describe('share links', () => {
  const plan: PlanItem[] = [
    { id: '1246765', kind: 'session', backup: false },
    { id: '1341814', kind: 'session', backup: true },
    { id: 'example-meetup', kind: 'side', backup: false },
  ]

  it('round-trips a plan', () => {
    expect(decodePlan(encodePlan(plan))).toEqual(plan)
  })

  it('is URL-safe and versioned', () => {
    const code = encodePlan(plan)
    expect(code.startsWith('1.')).toBe(true)
    expect(code).toMatch(/^[A-Za-z0-9._-]+$/)
    expect(encodeURIComponent(code)).toBe(code)
  })

  it('survives non-ASCII ids', () => {
    const unicode: PlanItem[] = [{ id: 'café-☕', kind: 'side', backup: false }]
    expect(decodePlan(encodePlan(unicode))).toEqual(unicode)
  })

  it('handles an empty plan', () => {
    expect(decodePlan(encodePlan([]))).toEqual([])
  })

  it('rejects broken or foreign codes instead of crashing', () => {
    const code = encodePlan(plan)
    expect(decodePlan(code.slice(0, 10))).toBeNull() // truncated link
    expect(decodePlan('2.' + code.slice(2))).toBeNull() // unknown version
    expect(decodePlan('hello')).toBeNull()
    expect(decodePlan('1.!!!')).toBeNull()
  })
})

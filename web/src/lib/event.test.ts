import { describe, expect, it } from 'vitest'
import { daysUntilEvent } from './event'

describe('daysUntilEvent', () => {
  it('counts whole days before the event', () => {
    expect(daysUntilEvent('2026-10-21')).toBe(19)
  })

  it('is 0 on the first day', () => {
    expect(daysUntilEvent('2026-11-09')).toBe(0)
  })

  it('never goes negative after the event starts', () => {
    expect(daysUntilEvent('2026-11-20')).toBe(0)
  })
})

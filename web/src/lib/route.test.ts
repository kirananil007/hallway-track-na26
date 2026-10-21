import { describe, expect, it } from 'vitest'
import { roomLabel, tagLabel } from './labels'
import { buildHash, parseHash } from './route'

describe('hash routing', () => {
  it('parses route and params', () => {
    const { route, params } = parseHash('#/browse?day=2026-11-11&q=otel')
    expect(route).toBe('browse')
    expect(params.get('day')).toBe('2026-11-11')
    expect(params.get('q')).toBe('otel')
  })

  it('falls back to browse for empty or unknown routes', () => {
    expect(parseHash('').route).toBe('browse')
    expect(parseHash('#/nope').route).toBe('browse')
  })

  it('builds hashes, with or without params', () => {
    expect(buildHash('browse')).toBe('#/browse')
    expect(buildHash('browse', new URLSearchParams('day=2026-11-11'))).toBe('#/browse?day=2026-11-11')
  })
})

describe('labels', () => {
  it('formats tags and rooms for display', () => {
    expect(tagLabel('ai-ml')).toBe('AI/ML')
    expect(tagLabel('platform-engineering')).toBe('Platform engineering')
    expect(roomLabel('Salt Palace | Level 1 | Hall DE')).toBe('Salt Palace · Level 1 · Hall DE')
  })
})

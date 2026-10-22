// How well a session fits someone's profile. Deterministic and explainable on purpose:
// no AI, just a few points per signal, and every point comes with a reason we can show.

import type { Level, Session } from '../types'
import { tagLabel } from './labels'

export type Role = 'sre' | 'platform' | 'developer' | 'security' | 'data-ml' | 'manager' | 'student'
export type Experience = Exclude<Level, 'unknown'>

export interface Profile {
  role: Role | '' // optional
  interests: string[] // 1-5 interest tags
  experience: Experience
  days: string[] // 'YYYY-MM-DD'
  allAccess: boolean // All-Access pass: includes CNCF-hosted co-located events on Monday
}

export const MAX_INTERESTS = 5

// Each role nudges a few related tags.
export const ROLES: Record<Role, { label: string; tags: string[] }> = {
  sre: { label: 'SRE', tags: ['sre', 'observability', 'autoscaling', 'multi-cluster'] },
  platform: { label: 'Platform engineer', tags: ['platform-engineering', 'gitops', 'multi-cluster', 'security'] },
  developer: { label: 'Developer', tags: ['gitops', 'platform-engineering', 'wasm', 'opentelemetry'] },
  security: { label: 'Security', tags: ['security', 'ebpf', 'networking'] },
  'data-ml': { label: 'Data / ML', tags: ['ai-ml', 'inference', 'agentic', 'storage'] },
  manager: { label: 'Manager', tags: ['finops', 'platform-engineering', 'sre'] },
  student: { label: 'Student', tags: ['beginner', 'contributor'] },
}

// Official tracks and the interests they clearly belong to. A track match is a stronger
// signal than a keyword somewhere in the abstract, so it earns extra points.
export const TRACK_TAGS: Record<string, string[]> = {
  observability: ['observability', 'opentelemetry'],
  security: ['security'],
  'platform engineering': ['platform-engineering'],
  'ai inference + agentic': ['ai-ml', 'inference', 'agentic'],
  connectivity: ['networking'],
  'data processing + storage': ['storage'],
  'operations + performance': ['sre', 'autoscaling'],
  'application development + delivery': ['gitops'],
  'emerging + advanced': ['wasm', 'edge'],
  'cloud native novice': ['beginner'],
  'maintainer track': ['contributor'],
  contribfest: ['contributor'],
}

export const POINTS = {
  interest: 3, // per selected interest the session is tagged with
  track: 2, // per selected interest that matches the session's track
  role: 1, // per role tag the session has (capped)
  roleCap: 2,
  levelExact: 2,
  levelNear: 1,
  levelFar: -2, // a beginner in an advanced talk, or the reverse
  keynote: 1,
}

const LEVEL_RANK: Record<Experience, number> = { beginner: 0, intermediate: 1, advanced: 2 }

export interface Scored {
  session: Session
  score: number
  matched: string[] // the user's interests this session matched
  reasons: string[] // short, human-readable explanation
}

export function scoreSession(session: Session, profile: Profile): Scored {
  const reasons: string[] = []
  let score = 0

  const matched = profile.interests.filter((tag) => session.tags.includes(tag))
  score += matched.length * POINTS.interest
  if (matched.length) reasons.push(`matched: ${matched.map(tagLabel).join(', ')}`)

  const trackTags = TRACK_TAGS[session.track.toLowerCase()] ?? []
  const trackHits = profile.interests.filter((tag) => trackTags.includes(tag))
  score += trackHits.length * POINTS.track
  if (trackHits.length) reasons.push(`${session.track} track`)

  if (profile.role) {
    const roleHits = ROLES[profile.role].tags.filter((tag) => session.tags.includes(tag)).length
    const rolePoints = Math.min(roleHits * POINTS.role, POINTS.roleCap)
    score += rolePoints
    if (rolePoints > 0) reasons.push(`fits ${ROLES[profile.role].label}`)
  }

  if (session.level !== 'unknown') {
    const gap = Math.abs(LEVEL_RANK[session.level] - LEVEL_RANK[profile.experience])
    if (gap === 0) {
      score += POINTS.levelExact
      reasons.push(`${session.level} level`)
    } else if (gap === 1) {
      score += POINTS.levelNear
    } else {
      score += POINTS.levelFar
    }
  }

  if (session.type === 'keynote') {
    score += POINTS.keynote
    reasons.push('keynote')
  }

  return { session, score, matched, reasons }
}

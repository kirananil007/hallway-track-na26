// "Plan my KubeCon": turn a profile into a conflict-free plan with one backup per pick.
//
// 1. Keep sessions the person can attend (their days, their pass, no breaks).
// 2. Score them (scoring.ts) and keep those matching at least one chosen interest.
// 3. Take the best first: walk down the list by score and pick each session that
//    doesn't overlap anything already picked.
// 4. For each pick, the best leftover session that overlaps it becomes its backup.
// Ties are broken by start time, then id, so the same profile always gives the same plan.

import type { Session } from '../types'
import { overlaps } from './conflicts'
import { EVENT } from './event'
import { MAX_INTERESTS, ROLES, scoreSession, type Experience, type Profile, type Role, type Scored } from './scoring'

export interface Pick {
  main: Scored
  backup?: Scored
}

export function isEligible(session: Session, profile: Profile): boolean {
  if (!profile.days.includes(session.day)) return false
  if (session.type === 'other') return false
  // Co-located events need an All-Access pass. Project Lightning Talks are "lightning"
  // sessions, so they stay available with a KubeCon-only pass.
  if (session.type === 'colocated' && !profile.allAccess) return false
  return true
}

// Higher score first; then earlier start; then id. Never depends on input order.
function byScore(a: Scored, b: Scored): number {
  return (
    b.score - a.score ||
    Date.parse(a.session.start) - Date.parse(b.session.start) ||
    a.session.id.localeCompare(b.session.id)
  )
}

export function recommend(sessions: Session[], profile: Profile): Pick[] {
  const candidates = sessions
    .filter((s) => isEligible(s, profile))
    .map((s) => scoreSession(s, profile))
    .filter((c) => c.matched.length > 0)
    .sort(byScore)

  const picks: Scored[] = []
  for (const candidate of candidates) {
    if (!picks.some((p) => overlaps(p.session, candidate.session))) picks.push(candidate)
  }

  const used = new Set(picks.map((p) => p.session.id))
  return picks
    .sort((a, b) => Date.parse(a.session.start) - Date.parse(b.session.start) || a.session.id.localeCompare(b.session.id))
    .map((main) => {
      // candidates is sorted best-first, so find() returns the best available backup.
      const backup = candidates.find((c) => !used.has(c.session.id) && overlaps(c.session, main.session))
      if (backup) used.add(backup.session.id)
      return { main, backup }
    })
}

// ---- The form lives in the URL hash, like Browse filters, so it survives reloads and can be shared.

// Monday to Thursday. Nov 8 only has registration.
export const ATTEND_DAYS = EVENT.days.filter((d) => d >= EVENT.firstDay)
const MAIN_DAYS = ATTEND_DAYS.filter((d) => d > EVENT.firstDay) // Tue-Thu

export function profileFromParams(params: URLSearchParams): Profile {
  const role = params.get('role') ?? ''
  const experience = params.get('level')
  const days = (params.get('days') ?? '').split(',').filter((d) => (ATTEND_DAYS as string[]).includes(d))
  return {
    role: role in ROLES ? (role as Role) : '',
    interests: (params.get('tags') ?? '').split(',').filter(Boolean).slice(0, MAX_INTERESTS),
    experience: experience === 'beginner' || experience === 'advanced' ? experience : 'intermediate',
    days: days.length ? days : MAIN_DAYS,
    allAccess: params.get('aa') === '1',
  }
}

export function profileToParams(profile: Profile): URLSearchParams {
  const params = new URLSearchParams()
  if (profile.role) params.set('role', profile.role)
  if (profile.interests.length) params.set('tags', profile.interests.join(','))
  if (profile.experience !== 'intermediate') params.set('level', profile.experience)
  if (profile.days.join(',') !== MAIN_DAYS.join(',')) params.set('days', profile.days.join(','))
  if (profile.allAccess) params.set('aa', '1')
  return params
}

export type { Experience, Profile, Role }

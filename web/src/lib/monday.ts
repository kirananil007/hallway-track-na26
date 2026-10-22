// Monday (co-located events day) helpers. Everything comes from the official schedule:
// co-located events are sessions with type "colocated", and their titles carry the
// details we show, e.g.
//   "ArgoCon Hosted by CNCF - Full Day Event | ALL ACCESS PASS REQUIRED"
//   "OpenShift Commons Gathering Hosted by Red Hat | SEPARATE REGISTRATION REQUIRED"

import type { Session } from '../types'

export interface ColocatedInfo {
  name: string // "ArgoCon"
  host: string // "CNCF", "Red Hat", or '' if not stated
  length: 'full' | 'half' | null
  access: 'all-access' | 'separate' | null // All-Access pass, or the sponsor's own registration
}

export function parseColocatedTitle(title: string): ColocatedInfo {
  const [main, ...notes] = title.split('|').map((part) => part.trim())
  const note = notes.join(' ').toLowerCase()
  const access = note.includes('all access') ? 'all-access' : note.includes('separate registration') ? 'separate' : null

  let rest = main
  let length: ColocatedInfo['length'] = null
  const lengthMatch = rest.match(/\s+-\s+(full|half) day event$/i)
  if (lengthMatch) {
    length = lengthMatch[1].toLowerCase() as 'full' | 'half'
    rest = rest.slice(0, lengthMatch.index)
  }

  // "X Hosted by Y" -> name X, host Y. Some sponsor titles say "with" instead; keep those whole.
  const hostMatch = rest.match(/^(.*?)\s+Hosted by\s+(.+)$/i)
  return {
    name: (hostMatch ? hostMatch[1] : rest).trim(),
    host: hostMatch ? hostMatch[2].trim() : '',
    length,
    access,
  }
}

export interface MondayGuide {
  cncf: Session[] // CNCF-hosted co-located events (All-Access pass)
  sponsor: Session[] // sponsor-hosted events (separate registration), any day
  lightning: Session[] // Monday's Project Lightning Talks (any pass)
}

export const MONDAY = '2026-11-09'

export function mondayGuide(sessions: Session[]): MondayGuide {
  const byStart = (a: Session, b: Session) => Date.parse(a.start) - Date.parse(b.start) || a.title.localeCompare(b.title)
  const colocated = sessions.filter((s) => s.type === 'colocated')
  return {
    cncf: colocated.filter((s) => s.track.toLowerCase().startsWith('cncf-hosted')).sort(byStart),
    sponsor: colocated.filter((s) => !s.track.toLowerCase().startsWith('cncf-hosted')).sort(byStart),
    lightning: sessions
      .filter((s) => s.day === MONDAY && s.track === 'Project Lightning Talks' && s.type === 'lightning')
      .sort(byStart),
  }
}

// Match plan items to the sessions and side events they point to, so the rest of the app
// can treat both the same way (one timeline, one conflict check, one calendar export).

import type { Session, SideEvent } from '../types'
import { findConflicts, overlaps } from './conflicts'
import { planKey, type PlanItem } from './plan'

export interface PlanEntry {
  key: string // planKey(kind, id)
  item: PlanItem
  title: string
  start: string
  end: string
  day: string
  session?: Session
  side?: SideEvent
}

export function resolvePlan(
  items: PlanItem[],
  sessionsById: Map<string, Session>,
  sideById: Map<string, SideEvent>,
): { entries: PlanEntry[]; missing: PlanItem[] } {
  const entries: PlanEntry[] = []
  const missing: PlanItem[] = []
  for (const item of items) {
    const found = item.kind === 'session' ? sessionsById.get(item.id) : sideById.get(item.id)
    if (!found) {
      missing.push(item) // removed from the schedule / events list since it was added
      continue
    }
    entries.push({
      key: planKey(item.kind, item.id),
      item,
      title: found.title,
      start: found.start,
      end: found.end,
      day: found.day,
      ...(item.kind === 'session' ? { session: found as Session } : { side: found as SideEvent }),
    })
  }
  entries.sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || a.title.localeCompare(b.title))
  return { entries, missing }
}

// Conflicts between main picks only: marking one as a backup resolves the clash.
export function planConflicts(entries: PlanEntry[]): Map<string, string[]> {
  return findConflicts(entries.filter((e) => !e.item.backup))
}

// How many main picks in the plan overlap this time range (ignoring the item itself).
export function countClashes(key: string, range: { start: string; end: string }, entries: PlanEntry[]): number {
  return entries.filter((e) => !e.item.backup && e.key !== key && overlaps(e, range)).length
}

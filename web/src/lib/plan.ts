// The user's plan: which sessions (and, from M5, side events) they picked.
// Pure functions that return a new plan; usePlan.ts saves the result.

export type PlanKind = 'session' | 'side'

export interface PlanItem {
  id: string
  kind: PlanKind
  backup: boolean // a fallback choice for its time slot; ignored by conflict detection
}

// A key that's unique across sessions and side events, e.g. "session:1246765".
export function planKey(kind: PlanKind, id: string): string {
  return `${kind}:${id}`
}

export function findItem(plan: PlanItem[], kind: PlanKind, id: string): PlanItem | undefined {
  return plan.find((item) => item.kind === kind && item.id === id)
}

// Add if missing, remove if present.
export function toggleItem(plan: PlanItem[], kind: PlanKind, id: string): PlanItem[] {
  return findItem(plan, kind, id)
    ? plan.filter((item) => !(item.kind === kind && item.id === id))
    : [...plan, { id, kind, backup: false }]
}

export function removeItems(plan: PlanItem[], keys: Set<string>): PlanItem[] {
  return plan.filter((item) => !keys.has(planKey(item.kind, item.id)))
}

export function setBackup(plan: PlanItem[], kind: PlanKind, id: string, backup: boolean): PlanItem[] {
  return plan.map((item) => (item.kind === kind && item.id === id ? { ...item, backup } : item))
}

// Add items from a shared plan that we don't already have. Existing items are kept as they are.
export function mergePlans(plan: PlanItem[], incoming: PlanItem[]): PlanItem[] {
  const have = new Set(plan.map((item) => planKey(item.kind, item.id)))
  const added = incoming.filter((item) => !have.has(planKey(item.kind, item.id)))
  return [...plan, ...added]
}

// Turn whatever came out of storage (or a share link) into a valid plan, dropping junk.
export function parsePlan(value: unknown): PlanItem[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const plan: PlanItem[] = []
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue
    const { id, kind, backup } = raw as Record<string, unknown>
    if (typeof id !== 'string' || !id || (kind !== 'session' && kind !== 'side')) continue
    const key = planKey(kind, id)
    if (seen.has(key)) continue
    seen.add(key)
    plan.push({ id, kind, backup: backup === true })
  }
  return plan
}

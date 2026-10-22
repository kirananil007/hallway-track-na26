// Find items in a plan whose times overlap.

export interface Timed {
  key: string
  start: string // ISO 8601 with offset
  end: string
}

// Two time ranges overlap if each one starts before the other ends.
// Back-to-back sessions (one ends at 11:00, the next starts at 11:00) don't overlap.
export function overlaps(a: { start: string; end: string }, b: { start: string; end: string }): boolean {
  return Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end)
}

// Returns key -> keys of the other items it overlaps with. Items without conflicts are absent.
// Plans are small (tens of items), so comparing every pair is fast enough and easy to read.
export function findConflicts(items: Timed[]): Map<string, string[]> {
  const conflicts = new Map<string, string[]>()
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (overlaps(items[i], items[j])) {
        conflicts.set(items[i].key, [...(conflicts.get(items[i].key) ?? []), items[j].key])
        conflicts.set(items[j].key, [...(conflicts.get(items[j].key) ?? []), items[i].key])
      }
    }
  }
  return conflicts
}

import { useEffect, useState } from 'react'
import { mergePlans, parsePlan, removeItems, setBackup, toggleItem, type PlanItem, type PlanKind } from '../lib/plan'
import { readJson, storageKey, writeJson } from '../lib/storage'

const KEY = 'plan.v1' // bump the version if the stored shape ever changes

export interface PlanApi {
  items: PlanItem[]
  saved: boolean // false if the browser refused to store the plan
  toggle: (kind: PlanKind, id: string) => void
  setBackup: (kind: PlanKind, id: string, backup: boolean) => void
  remove: (keys: Set<string>) => void
  merge: (incoming: PlanItem[]) => void
  clear: () => void
}

// The plan lives in localStorage, so it survives reloads without any account or server.
export function usePlan(): PlanApi {
  const [items, setItems] = useState<PlanItem[]>(() => parsePlan(readJson(KEY)))
  const [saved, setSaved] = useState(true)

  // Keep several open tabs in sync: another tab changed the plan, so reload it.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey(KEY)) setItems(parsePlan(readJson(KEY)))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const commit = (next: PlanItem[]) => {
    setItems(next)
    setSaved(writeJson(KEY, next))
  }

  return {
    items,
    saved,
    toggle: (kind, id) => commit(toggleItem(items, kind, id)),
    setBackup: (kind, id, backup) => commit(setBackup(items, kind, id, backup)),
    remove: (keys) => commit(removeItems(items, keys)),
    merge: (incoming) => commit(mergePlans(items, incoming)),
    clear: () => commit([]),
  }
}

// Small wrappers around localStorage. It can be missing or throw (private mode, blocked
// storage, some in-app browsers), so every access is wrapped and falls back quietly.

const PREFIX = 'hallway-track.'

export function readSetting(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

// Returns false if the value couldn't be saved.
export function writeSetting(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(PREFIX + key, value)
    return true
  } catch {
    return false
  }
}

export function readJson(key: string): unknown {
  const text = readSetting(key)
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null // corrupted value: treat as empty rather than crash
  }
}

export function writeJson(key: string, value: unknown): boolean {
  return writeSetting(key, JSON.stringify(value))
}

// The full localStorage key, for listening to changes from other tabs.
export function storageKey(key: string): string {
  return PREFIX + key
}

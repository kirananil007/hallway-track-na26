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

export function writeSetting(key: string, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value)
  } catch {
    // Storage unavailable: the setting just won't be remembered next visit.
  }
}

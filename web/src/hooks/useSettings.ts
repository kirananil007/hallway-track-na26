import { useState } from 'react'
import { readSetting, writeSetting } from '../lib/storage'
import type { TimeMode } from '../lib/time'

// Event time (Salt Lake City) vs. the viewer's own time zone. Remembered per browser.
export function useTimeMode() {
  const [mode, setMode] = useState<TimeMode>(() => (readSetting('timeMode') === 'local' ? 'local' : 'event'))
  const update = (next: TimeMode) => {
    setMode(next)
    writeSetting('timeMode', next)
  }
  return [mode, update] as const
}

// Dark mode. index.html sets the initial class before first paint (no white flash);
// this hook reads that and flips it when the user taps the toggle.
export function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    writeSetting('theme', next ? 'dark' : 'light')
    setDark(next)
  }
  return [dark, toggle] as const
}

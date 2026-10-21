// Top bar: project name, countdown, and the two display toggles (time zone, dark mode).

import type { TimeMode } from '../lib/time'
import { zoneLabel } from '../lib/time'
import { EVENT } from '../lib/event'

interface Props {
  daysToGo: number
  timeMode: TimeMode
  onTimeModeChange: (mode: TimeMode) => void
  dark: boolean
  onToggleDark: () => void
}

export function Header({ daysToGo, timeMode, onTimeModeChange, dark, onToggleDark }: Props) {
  const eventZone = zoneLabel(EVENT.timeZone) // "MST"
  const localZone = zoneLabel() // e.g. "EST", "GMT+5:30"

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hallway Track</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Community planner for KubeCon + CloudNativeCon NA 2026 · Salt Lake City, Nov 9–12
          {daysToGo > 0 && <> · {daysToGo} days to go</>}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Segmented control: which time zone to show times in */}
        <div role="group" aria-label="Show times in" className="flex rounded-lg border border-slate-300 p-0.5 text-sm dark:border-slate-700">
          {(
            [
              ['event', `${eventZone} (event)`],
              ['local', `My time${localZone && localZone !== eventZone ? ` (${localZone})` : ''}`],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={timeMode === mode}
              onClick={() => onTimeModeChange(mode)}
              className={`rounded-md px-2.5 py-1 ${
                timeMode === mode
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleDark}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {dark ? '☀︎' : '☾'}
        </button>
      </div>
    </header>
  )
}

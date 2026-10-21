// Search box + filters for the Browse page. It only reports changes upward (onChange);
// the current filters live in the URL, so a filtered view can be shared as a link.

import type { ReactNode } from 'react'
import { ALL_DAYS, type FilterOptions, type Filters } from '../lib/filters'
import { EVENT } from '../lib/event'
import { LEVEL_LABELS, TYPE_LABELS, tagLabel } from '../lib/labels'
import { formatDayLabel } from '../lib/time'
import type { Level, SessionType } from '../types'

interface Props {
  filters: Filters
  options: FilterOptions
  resultCount: number
  canClear: boolean
  onChange: (next: Filters) => void
  onClear: () => void
}

const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900'

export function FilterBar({ filters, options, resultCount, canClear, onChange, onClear }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const toggleTag = (tag: string) =>
    set({ tags: filters.tags.includes(tag) ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag] })
  // How many of the folded-away filters are in use (shown on the "Filters" heading).
  const activeCount =
    [filters.track, filters.type, filters.level].filter(Boolean).length + filters.tags.length + (filters.showOther ? 1 : 0)

  return (
    <section aria-label="Filters" className="space-y-3">
      <label className="block">
        <span className="sr-only">Search</span>
        <input
          type="search"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search titles, speakers, summaries…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        />
      </label>

      {/* Day buttons scroll sideways on narrow phones instead of wrapping */}
      <div role="group" aria-label="Day" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[...EVENT.days, ALL_DAYS].map((day) => (
          <Chip key={day} pressed={filters.day === day} onClick={() => set({ day })}>
            {day === ALL_DAYS ? 'All days' : formatDayLabel(day)}
          </Chip>
        ))}
      </div>

      {/* Everything else is folded away by default, so sessions start near the top on phones */}
      <details className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800" open={activeCount > 0}>
        <summary className="cursor-pointer text-sm font-medium">
          Filters{activeCount > 0 && ` (${activeCount} active)`}
        </summary>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="text-xs text-slate-600 dark:text-slate-400">
            Track
            <select value={filters.track} onChange={(e) => set({ track: e.target.value })} className={selectClass}>
              <option value="">All tracks</option>
              {options.tracks.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600 dark:text-slate-400">
            Type
            <select value={filters.type} onChange={(e) => set({ type: e.target.value })} className={selectClass}>
              <option value="">All types</option>
              {(Object.keys(TYPE_LABELS) as SessionType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600 dark:text-slate-400">
            Level
            <select value={filters.level} onChange={(e) => set({ level: e.target.value })} className={selectClass}>
              <option value="">All levels</option>
              {options.levels.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l as Level]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">Interests</p>
        <div role="group" aria-label="Interests" className="mt-1 flex flex-wrap gap-2">
          {options.tags.map((tag) => (
            <Chip key={tag} pressed={filters.tags.includes(tag)} onClick={() => toggleTag(tag)}>
              {tagLabel(tag)}
            </Chip>
          ))}
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filters.showOther} onChange={(e) => set({ showOther: e.target.checked })} />
          Show breaks &amp; expo stages
        </label>
      </details>

      <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
        <div className="flex items-center gap-3">
          {/* aria-live announces the new count to screen readers when filters change */}
          <span aria-live="polite" className="text-slate-600 dark:text-slate-400">
            {resultCount} {resultCount === 1 ? 'session' : 'sessions'}
          </span>
          {canClear && (
            <button type="button" onClick={onClear} className="underline">
              Clear filters
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

// A toggle button that looks like a pill. aria-pressed tells screen readers if it's on.
function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-sm whitespace-nowrap ${
        pressed
          ? 'border-sky-700 bg-sky-700 text-white dark:border-sky-400 dark:bg-sky-400 dark:text-slate-950'
          : 'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

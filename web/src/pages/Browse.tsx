// The Browse page: filters on top, then sessions grouped by day and start time.

import { useMemo } from 'react'
import { Button } from '../components/Button'
import { FilterBar } from '../components/FilterBar'
import { SessionCard } from '../components/SessionCard'
import type { PlanApi } from '../hooks/usePlan'
import { countClashes, type PlanEntry } from '../lib/planEntries'
import {
  applyFilters,
  defaultFilters,
  filterOptions,
  filtersFromParams,
  filtersToParams,
  groupByDayAndSlot,
  isDefault,
  type Filters,
} from '../lib/filters'
import { formatDayLabel, formatTime } from '../lib/time'
import type { Session } from '../types'

interface Props {
  sessions: Session[]
  params: URLSearchParams // filters come from the URL hash
  today: string
  timeZone?: string
  plan: PlanApi
  planEntries: PlanEntry[] // what's in the plan, with times, for clash warnings
  onParamsChange: (params: URLSearchParams) => void
}

export function Browse({ sessions, params, today, timeZone, plan, planEntries, onParamsChange }: Props) {
  // useMemo: only recompute when the inputs change, not on every render.
  // We key on the params *string* because a new URLSearchParams object arrives each render.
  const paramsKey = params.toString()
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(paramsKey), today), [paramsKey, today])
  const setFilters = (next: Filters) => onParamsChange(filtersToParams(next, today))

  const options = useMemo(() => filterOptions(sessions), [sessions])
  const visible = useMemo(() => applyFilters(sessions, filters), [sessions, filters])
  const groups = useMemo(() => groupByDayAndSlot(visible), [visible])

  // What's already in the plan, so cards can show "In plan" or warn about clashes.
  const planned = useMemo(
    () => new Set(plan.items.filter((i) => i.kind === 'session').map((i) => i.id)),
    [plan.items],
  )
  const clashCount = (s: Session) => countClashes(`session:${s.id}`, s, planEntries)

  const toggleTag = (tag: string) =>
    setFilters({
      ...filters,
      tags: filters.tags.includes(tag) ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag],
    })

  return (
    <div className="space-y-6">
      <FilterBar
        filters={filters}
        options={options}
        resultCount={visible.length}
        canClear={!isDefault(filters, today)}
        onChange={setFilters}
        onClear={() => setFilters(defaultFilters(today))}
      />

      {groups.length === 0 && (
        <p className="rounded-lg bg-slate-100 p-4 text-center dark:bg-slate-900">
          No sessions match these filters.{' '}
          <button type="button" className="underline" onClick={() => setFilters(defaultFilters(today))}>
            Clear filters
          </button>
        </p>
      )}

      {groups.map((group) => (
        <section key={group.day} aria-labelledby={`day-${group.day}`}>
          <h2 id={`day-${group.day}`} className="mb-2 text-lg font-bold">
            {formatDayLabel(group.day)}
          </h2>
          <div className="space-y-4">
            {group.slots.map((slot) => (
              <div key={slot.start}>
                {/* Sticky time label stays visible while scrolling through a busy slot */}
                <h3 className="sticky top-0 z-10 -mx-4 bg-white/95 px-4 py-1 text-sm font-semibold text-sky-800 backdrop-blur dark:bg-slate-950/95 dark:text-sky-300">
                  {formatTime(slot.start, timeZone)}
                  <span className="font-normal text-slate-500"> · {slot.sessions.length}</span>
                </h3>
                <div className="mt-1 space-y-2">
                  {slot.sessions.map((s) => {
                    const inPlan = planned.has(s.id)
                    const clashes = inPlan ? 0 : clashCount(s)
                    return (
                      <SessionCard
                        key={s.id}
                        session={s}
                        timeZone={timeZone}
                        activeTags={filters.tags}
                        onTagClick={toggleTag}
                        notice={
                          clashes > 0 && (
                            <span className="text-amber-700 dark:text-amber-400">
                              ⚠ Clashes with {clashes} {clashes === 1 ? 'session' : 'sessions'} in your plan
                            </span>
                          )
                        }
                        actions={
                          <Button
                            variant={inPlan ? 'secondary' : 'primary'}
                            aria-pressed={inPlan}
                            onClick={() => plan.toggle('session', s.id)}
                          >
                            {inPlan ? '✓ In my plan' : '+ Add to plan'}
                          </Button>
                        }
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

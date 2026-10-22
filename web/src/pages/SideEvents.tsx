// Community side events: meetups, happy hours and project gatherings around the conference.
// The list comes from data/events.yaml, which anyone can add to with a pull request.

import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { SideEventCard } from '../components/SideEventCard'
import type { PlanApi } from '../hooks/usePlan'
import { REPO } from '../lib/event'
import { findItem } from '../lib/plan'
import { countClashes, type PlanEntry } from '../lib/planEntries'
import { formatDayLabel, formatTime } from '../lib/time'
import type { SideEvent } from '../types'

interface Props {
  events: SideEvent[]
  plan: PlanApi
  planEntries: PlanEntry[]
  timeZone?: string
}

const ALL = 'all'

export function SideEvents({ events, plan, planEntries, timeZone }: Props) {
  const [day, setDay] = useState(ALL)
  const days = useMemo(() => [...new Set(events.map((e) => e.day))].sort(), [events])
  const visible = events.filter((e) => day === ALL || e.day === day)
  const onlyExamples = events.every((e) => e.example)

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-pink-300 p-4 dark:border-pink-900">
        <p className="text-sm">
          Meetups, happy hours and project gatherings around the conference, added by the community. They're not part
          of the official program, so always check the organizer's page.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={REPO.addEventUrl}
            className="rounded-lg bg-pink-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-pink-800 dark:bg-pink-400 dark:text-slate-950"
          >
            + Add an event
          </a>
          <a href={REPO.contributingUrl} className="rounded-lg px-3 py-1.5 text-sm underline">
            How it works (1 minute)
          </a>
        </div>
      </section>

      {onlyExamples && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          No real events yet, only examples showing the format. Hosting or know of one? Add it!
        </p>
      )}

      <div role="group" aria-label="Day" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[ALL, ...days].map((d) => (
          <Button key={d} aria-pressed={day === d} variant={day === d ? 'primary' : 'secondary'} onClick={() => setDay(d)}>
            {d === ALL ? 'All days' : formatDayLabel(d)}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((e, index) => {
          const inPlan = Boolean(findItem(plan.items, 'side', e.id))
          const clashes = inPlan ? 0 : countClashes(`side:${e.id}`, e, planEntries)
          const newDay = index === 0 || visible[index - 1].day !== e.day
          return (
            <div key={e.id}>
              {newDay && <h2 className="mb-2 text-lg font-bold">{formatDayLabel(e.day)}</h2>}
              <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">{formatTime(e.start, timeZone)}</p>
              <SideEventCard
                event={e}
                timeZone={timeZone}
                notice={
                  clashes > 0 && (
                    <span className="text-amber-700 dark:text-amber-400">
                      ⚠ Clashes with {clashes} {clashes === 1 ? 'item' : 'items'} in your plan
                    </span>
                  )
                }
                actions={
                  <Button variant={inPlan ? 'secondary' : 'primary'} aria-pressed={inPlan} onClick={() => plan.toggle('side', e.id)}>
                    {inPlan ? '✓ In my plan' : '+ Add to plan'}
                  </Button>
                }
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

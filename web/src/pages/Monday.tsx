// Monday guide: compare the co-located events and understand which pass gets you in.
// Built entirely from the official schedule (see lib/monday.ts).

import { useMemo } from 'react'
import { Button } from '../components/Button'
import type { PlanApi } from '../hooks/usePlan'
import { roomLabel, tagLabel } from '../lib/labels'
import { MONDAY, mondayGuide, parseColocatedTitle } from '../lib/monday'
import { findItem } from '../lib/plan'
import { buildHash } from '../lib/route'
import { formatDayLabel, formatTime } from '../lib/time'
import type { Session } from '../types'

interface Props {
  sessions: Session[]
  plan: PlanApi
  timeZone?: string
}

export function Monday({ sessions, plan, timeZone }: Props) {
  const guide = useMemo(() => mondayGuide(sessions), [sessions])
  const lightningLink = buildHash(
    'browse',
    new URLSearchParams({ day: MONDAY, track: 'Project Lightning Talks' }),
  )
  const first = guide.lightning[0]
  const last = guide.lightning[guide.lightning.length - 1]

  return (
    <div className="space-y-6">
      <section aria-label="Which pass do I need?" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
        <h2 className="text-base font-bold">Which pass do I need on Monday?</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>All-Access pass:</strong> CNCF-hosted co-located events below, plus the main conference.
          </li>
          <li>
            <strong>KubeCon + CloudNativeCon-only pass:</strong> does <strong>not</strong> include the CNCF-hosted
            co-located events. It <strong>does</strong> include Monday's Project Lightning Talks.
          </li>
          <li>
            <strong>Sponsor-hosted events</strong> need their own registration with the sponsor.
          </li>
        </ul>
        <p className="text-slate-700 dark:text-slate-300">
          Always double-check your registration on the official site. This is an unofficial summary.
        </p>
      </section>

      {first && last && (
        <section aria-label="Project Lightning Talks" className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="font-bold">Project Lightning Talks · any pass</h2>
          <p className="mt-1 text-sm">
            {guide.lightning.length} five-minute project updates, {formatTime(first.start, timeZone)}–
            {formatTime(last.end, timeZone)}, {roomLabel(first.room)}.
          </p>
          <a href={lightningLink} className="mt-2 inline-block text-sm underline">
            See them all in Browse
          </a>
        </section>
      )}

      <EventList
        title="CNCF-hosted co-located events · All-Access pass"
        events={guide.cncf}
        plan={plan}
        timeZone={timeZone}
      />
      <EventList
        title="Sponsor-hosted events · separate registration"
        events={guide.sponsor}
        plan={plan}
        timeZone={timeZone}
        showDay
      />
    </div>
  )
}

function EventList({
  title,
  events,
  plan,
  timeZone,
  showDay = false,
}: {
  title: string
  events: Session[]
  plan: PlanApi
  timeZone?: string
  showDay?: boolean
}) {
  if (events.length === 0) return null
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-lg font-bold">
        {title} <span className="font-normal text-slate-500 dark:text-slate-400">({events.length})</span>
      </h2>
      {events.map((s) => {
        const info = parseColocatedTitle(s.title)
        const inPlan = Boolean(findItem(plan.items, 'session', s.id))
        return (
          <article key={s.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>
                {showDay && `${formatDayLabel(s.day)} · `}
                {formatTime(s.start, timeZone)}–{formatTime(s.end, timeZone)}
              </span>
              {info.length && (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {info.length === 'full' ? 'Full day' : 'Half day'}
                </span>
              )}
            </div>
            <h3 className="mt-1 font-semibold leading-snug">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {info.name}
                <span className="sr-only"> (opens the official page)</span>
              </a>
            </h3>
            {info.host && <p className="text-sm">Hosted by {info.host}</p>}
            <p className="text-sm text-slate-600 dark:text-slate-400">{roomLabel(s.room)}</p>
            {s.summary && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{s.summary}</p>}
            {s.tags.length > 0 && (
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Topics: {s.tags.map(tagLabel).join(', ')}
              </p>
            )}
            <div className="mt-3">
              <Button
                variant={inPlan ? 'secondary' : 'primary'}
                aria-pressed={inPlan}
                onClick={() => plan.toggle('session', s.id)}
              >
                {inPlan ? '✓ In my plan' : '+ Add to plan'}
              </Button>
            </div>
          </article>
        )
      })}
    </section>
  )
}

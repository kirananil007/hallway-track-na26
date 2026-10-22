// My Plan: the sessions and side events the user picked, with conflicts flagged,
// plus export and share.

import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { SessionCard } from '../components/SessionCard'
import { SideEventCard } from '../components/SideEventCard'
import type { PlanApi } from '../hooks/usePlan'
import { downloadFile, shareLink } from '../lib/browser'
import { buildCalendar, sessionToEvent, sideEventToEvent } from '../lib/ics'
import { planKey, type PlanItem } from '../lib/plan'
import { planConflicts, type PlanEntry } from '../lib/planEntries'
import { buildHash } from '../lib/route'
import { decodePlan, encodePlan } from '../lib/share'
import { formatDayLabel, formatTime } from '../lib/time'
import type { Session, SideEvent } from '../types'

interface Props {
  sessions: Session[]
  sideEvents: SideEvent[]
  plan: PlanApi
  entries: PlanEntry[] // plan items matched to sessions/side events (see planEntries.ts)
  missing: PlanItem[] // plan items whose session/event no longer exists
  params: URLSearchParams // may contain ?share=<code> from a shared link
  timeZone?: string
  onCloseShared: () => void
}

export function MyPlan({ sessions, sideEvents, plan, entries, missing, params, timeZone, onCloseShared }: Props) {
  const [includeBackups, setIncludeBackups] = useState(true)
  const [shareStatus, setShareStatus] = useState('')

  const titles = useMemo(() => new Map(entries.map((e) => [e.key, e.title])), [entries])
  const conflicts = planConflicts(entries)
  const backupCount = entries.filter((e) => e.item.backup).length

  const exportCalendar = () => {
    const events = entries
      .filter((e) => includeBackups || !e.item.backup)
      .map((e) => (e.session ? sessionToEvent(e.session, e.item.backup) : sideEventToEvent(e.side!, e.item.backup)))
    downloadFile('kubecon-na-2026-plan.ics', buildCalendar(events), 'text/calendar;charset=utf-8')
  }

  const share = async () => {
    const hash = buildHash('plan', new URLSearchParams({ share: encodePlan(plan.items) }))
    const url = `${window.location.origin}${window.location.pathname}${hash}`
    const result = await shareLink(url, 'My KubeCon NA 2026 plan')
    setShareStatus(
      result === 'copied' ? 'Link copied.' : result === 'failed' ? `Couldn't copy. Here's the link: ${url}` : '',
    )
  }

  return (
    <div className="space-y-6">
      <SharedPlanPreview
        params={params}
        sessions={sessions}
        sideEvents={sideEvents}
        onImport={plan.merge}
        onClose={onCloseShared}
      />

      {!plan.saved && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Your browser isn't letting this site save data (private mode?). Your plan will be lost when you close
          this tab, so export it or share the link to keep it.
        </p>
      )}

      {entries.length === 0 && missing.length === 0 ? (
        <p className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900">
          Your plan is empty. Go to{' '}
          <a href="#/browse" className="underline">
            Browse
          </a>{' '}
          or{' '}
          <a href="#/recommend" className="underline">
            Plan my KubeCon
          </a>{' '}
          and add the sessions you like.
        </p>
      ) : (
        <section aria-label="Plan actions" className="space-y-3">
          <p className="text-sm">
            {entries.length} {entries.length === 1 ? 'item' : 'items'}
            {backupCount > 0 && ` (${backupCount} backup)`}
            {conflicts.size > 0 && (
              <span className="text-red-700 dark:text-red-400"> · {conflicts.size} overlapping, see the red cards</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={exportCalendar} disabled={entries.length === 0}>
              Export to calendar (.ics)
            </Button>
            <Button onClick={share}>Share plan link</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm('Remove everything from your plan?')) plan.clear()
              }}
            >
              Clear plan
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeBackups} onChange={(e) => setIncludeBackups(e.target.checked)} />
            Include backups in the calendar (as “tentative”)
          </label>
          {shareStatus && (
            <p role="status" className="text-sm break-all text-slate-600 dark:text-slate-400">
              {shareStatus}
            </p>
          )}
        </section>
      )}

      {missing.length > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {missing.length} {missing.length === 1 ? 'item in your plan is' : 'items in your plan are'} no longer
          listed (cancelled or changed).{' '}
          <button
            type="button"
            className="underline"
            onClick={() => plan.remove(new Set(missing.map((i) => planKey(i.kind, i.id))))}
          >
            Remove {missing.length === 1 ? 'it' : 'them'}
          </button>
        </p>
      )}

      {entries.map((entry, index) => {
        const newDay = index === 0 || entries[index - 1].day !== entry.day
        const isBackup = entry.item.backup
        const clashTitles = (conflicts.get(entry.key) ?? []).map((key) => titles.get(key) ?? key)
        const tone = clashTitles.length ? 'conflict' : isBackup ? 'backup' : 'normal'
        const notice =
          clashTitles.length > 0 ? (
            <span className="text-red-700 dark:text-red-400">
              ⚠ Overlaps with {clashTitles.map((t) => `“${t}”`).join(', ')}. Mark one as a backup?
            </span>
          ) : isBackup ? (
            <span className="text-slate-600 dark:text-slate-400">Backup choice</span>
          ) : null
        const actions = (
          <>
            <Button onClick={() => plan.setBackup(entry.item.kind, entry.item.id, !isBackup)}>
              {isBackup ? 'Make main choice' : 'Mark as backup'}
            </Button>
            <Button variant="danger" onClick={() => plan.toggle(entry.item.kind, entry.item.id)}>
              Remove
            </Button>
          </>
        )

        return (
          <div key={entry.key}>
            {newDay && <h2 className="mb-2 text-lg font-bold">{formatDayLabel(entry.day)}</h2>}
            <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">{formatTime(entry.start, timeZone)}</p>
            {entry.session ? (
              <SessionCard session={entry.session} timeZone={timeZone} tone={tone} notice={notice} actions={actions} />
            ) : (
              <SideEventCard event={entry.side!} timeZone={timeZone} tone={tone} notice={notice} actions={actions} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Shown when someone opens a shared plan link. It never replaces the viewer's own plan
// on its own: they choose whether to add the shared items.
function SharedPlanPreview({
  params,
  sessions,
  sideEvents,
  onImport,
  onClose,
}: {
  params: URLSearchParams
  sessions: Session[]
  sideEvents: SideEvent[]
  onImport: (items: PlanItem[]) => void
  onClose: () => void
}) {
  const code = params.get('share')
  if (!code) return null

  const shared = decodePlan(code)
  if (!shared) {
    return (
      <section className="rounded-lg border border-amber-400 p-3 text-sm">
        This shared plan link looks broken or incomplete. Ask for the link again.{' '}
        <button type="button" className="underline" onClick={onClose}>
          Dismiss
        </button>
      </section>
    )
  }

  const titleOf = (item: PlanItem) =>
    (item.kind === 'session' ? sessions : sideEvents).find((x) => x.id === item.id)?.title
  const known = shared.filter((item) => titleOf(item))
  return (
    <section aria-label="Shared plan" className="space-y-2 rounded-lg border border-sky-400 p-3">
      <h2 className="font-semibold">
        Someone shared a plan with {known.length} {known.length === 1 ? 'item' : 'items'}
      </h2>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {known.map((item) => (
          <li key={planKey(item.kind, item.id)}>
            {titleOf(item)}
            {item.kind === 'side' && ' (side event)'}
            {item.backup && ' (backup)'}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={known.length === 0}
          onClick={() => {
            onImport(known)
            onClose()
          }}
        >
          Add to my plan
        </Button>
        <Button onClick={onClose}>Close</Button>
      </div>
    </section>
  )
}

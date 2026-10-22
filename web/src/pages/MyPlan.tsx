// My Plan: the sessions the user picked, with conflicts flagged, plus export and share.

import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { SessionCard } from '../components/SessionCard'
import type { PlanApi } from '../hooks/usePlan'
import { downloadFile, shareLink } from '../lib/browser'
import { findConflicts } from '../lib/conflicts'
import { groupByDayAndSlot } from '../lib/filters'
import { buildCalendar, sessionToEvent } from '../lib/ics'
import { planKey, type PlanItem } from '../lib/plan'
import { buildHash } from '../lib/route'
import { decodePlan, encodePlan } from '../lib/share'
import { formatDayLabel, formatTime } from '../lib/time'
import type { Session } from '../types'

interface Props {
  sessions: Session[]
  plan: PlanApi
  params: URLSearchParams // may contain ?share=<code> from a shared link
  timeZone?: string
  onCloseShared: () => void
}

export function MyPlan({ sessions, plan, params, timeZone, onCloseShared }: Props) {
  const [includeBackups, setIncludeBackups] = useState(true)
  const [shareStatus, setShareStatus] = useState('')

  const byId = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions])

  // Plan items matched to sessions. Items whose session vanished from the schedule are kept
  // aside so we can tell the user, instead of silently dropping them.
  const sessionItems = plan.items.filter((i) => i.kind === 'session')
  const entries = sessionItems.flatMap((item) => {
    const session = byId.get(item.id)
    return session ? [{ item, session }] : []
  })
  const missing = sessionItems.filter((item) => !byId.has(item.id))
  const backupIds = new Set(entries.filter((e) => e.item.backup).map((e) => e.session.id))

  // Conflicts only count main picks: marking one as a backup resolves the clash.
  const conflicts = findConflicts(
    entries
      .filter((e) => !e.item.backup)
      .map((e) => ({ key: e.session.id, start: e.session.start, end: e.session.end })),
  )
  const groups = groupByDayAndSlot(entries.map((e) => e.session))

  const exportCalendar = () => {
    const events = entries
      .filter((e) => includeBackups || !e.item.backup)
      .map((e) => sessionToEvent(e.session, e.item.backup))
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
      <SharedPlanPreview params={params} byId={byId} onImport={plan.merge} onClose={onCloseShared} />

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
          and tap “Add to plan” on the sessions you like.
        </p>
      ) : (
        <section aria-label="Plan actions" className="space-y-3">
          <p className="text-sm">
            {entries.length} {entries.length === 1 ? 'session' : 'sessions'}
            {backupIds.size > 0 && ` (${backupIds.size} backup)`}
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
                if (window.confirm('Remove every session from your plan?')) plan.clear()
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
          {missing.length} {missing.length === 1 ? 'session in your plan is' : 'sessions in your plan are'} no
          longer in the schedule (cancelled or changed).{' '}
          <button
            type="button"
            className="underline"
            onClick={() => plan.remove(new Set(missing.map((i) => planKey(i.kind, i.id))))}
          >
            Remove {missing.length === 1 ? 'it' : 'them'}
          </button>
        </p>
      )}

      {groups.map((group) => (
        <section key={group.day} aria-labelledby={`plan-day-${group.day}`}>
          <h2 id={`plan-day-${group.day}`} className="mb-2 text-lg font-bold">
            {formatDayLabel(group.day)}
          </h2>
          <div className="space-y-2">
            {group.slots.flatMap((slot) =>
              slot.sessions.map((s) => {
                const isBackup = backupIds.has(s.id)
                const clashTitles = (conflicts.get(s.id) ?? []).map((id) => byId.get(id)?.title ?? id)
                return (
                  <div key={s.id}>
                    <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">{formatTime(s.start, timeZone)}</p>
                    <SessionCard
                      session={s}
                      timeZone={timeZone}
                      tone={clashTitles.length ? 'conflict' : isBackup ? 'backup' : 'normal'}
                      notice={
                        clashTitles.length > 0 ? (
                          <span className="text-red-700 dark:text-red-400">
                            ⚠ Overlaps with {clashTitles.map((t) => `“${t}”`).join(', ')}. Mark one as a backup?
                          </span>
                        ) : isBackup ? (
                          <span className="text-slate-600 dark:text-slate-400">Backup choice</span>
                        ) : null
                      }
                      actions={
                        <>
                          <Button onClick={() => plan.setBackup('session', s.id, !isBackup)}>
                            {isBackup ? 'Make main choice' : 'Mark as backup'}
                          </Button>
                          <Button variant="danger" onClick={() => plan.toggle('session', s.id)}>
                            Remove
                          </Button>
                        </>
                      }
                    />
                  </div>
                )
              }),
            )}
          </div>
        </section>
      ))}
    </div>
  )
}

// Shown when someone opens a shared plan link. It never replaces the viewer's own plan
// on its own: they choose whether to add the shared sessions.
function SharedPlanPreview({
  params,
  byId,
  onImport,
  onClose,
}: {
  params: URLSearchParams
  byId: Map<string, Session>
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

  const known = shared.filter((item) => item.kind === 'session' && byId.has(item.id))
  return (
    <section aria-label="Shared plan" className="space-y-2 rounded-lg border border-sky-400 p-3">
      <h2 className="font-semibold">
        Someone shared a plan with {known.length} {known.length === 1 ? 'session' : 'sessions'}
      </h2>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {known.map((item) => (
          <li key={item.id}>
            {byId.get(item.id)?.title}
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

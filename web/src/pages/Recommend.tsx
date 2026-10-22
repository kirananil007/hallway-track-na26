// "Plan my KubeCon": a short form, then a suggested conflict-free plan with reasons.
// The suggestion updates as you change the form; nothing is added until you say so.

import { useMemo } from 'react'
import { Button } from '../components/Button'
import { SessionCard } from '../components/SessionCard'
import type { PlanApi } from '../hooks/usePlan'
import { filterOptions } from '../lib/filters'
import { tagLabel } from '../lib/labels'
import { findItem, type PlanItem } from '../lib/plan'
import { ATTEND_DAYS, profileFromParams, profileToParams, recommend, type Profile } from '../lib/recommend'
import { MAX_INTERESTS, ROLES, type Experience, type Role, type Scored } from '../lib/scoring'
import { formatDayLabel, formatTime } from '../lib/time'
import type { Session } from '../types'

interface Props {
  sessions: Session[]
  plan: PlanApi
  params: URLSearchParams
  timeZone?: string
  onParamsChange: (params: URLSearchParams) => void
}

const EXPERIENCE: { value: Experience; label: string }[] = [
  { value: 'beginner', label: 'New to this' },
  { value: 'intermediate', label: 'Some experience' },
  { value: 'advanced', label: 'Deep expertise' },
]

const pill = (on: boolean) =>
  `rounded-full border px-3 py-1 text-sm ${
    on
      ? 'border-sky-700 bg-sky-700 text-white dark:border-sky-400 dark:bg-sky-400 dark:text-slate-950'
      : 'border-slate-300 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800'
  }`

export function Recommend({ sessions, plan, params, timeZone, onParamsChange }: Props) {
  const paramsKey = params.toString()
  const profile = useMemo(() => profileFromParams(new URLSearchParams(paramsKey)), [paramsKey])
  const set = (patch: Partial<Profile>) => onParamsChange(profileToParams({ ...profile, ...patch }))

  const tags = useMemo(() => filterOptions(sessions).tags, [sessions])
  const picks = useMemo(
    () => (profile.interests.length ? recommend(sessions, profile) : []),
    [sessions, profile],
  )

  const toggleInterest = (tag: string) =>
    set({
      interests: profile.interests.includes(tag)
        ? profile.interests.filter((t) => t !== tag)
        : [...profile.interests, tag].slice(0, MAX_INTERESTS),
    })
  const toggleDay = (day: string) => {
    const days = profile.days.includes(day) ? profile.days.filter((d) => d !== day) : [...profile.days, day].sort()
    if (days.length) set({ days }) // keep at least one day
  }

  const inPlan = (s: Session) => Boolean(findItem(plan.items, 'session', s.id))
  const addAll = () => {
    const items: PlanItem[] = picks.flatMap(({ main, backup }) => [
      { id: main.session.id, kind: 'session', backup: false },
      ...(backup ? [{ id: backup.session.id, kind: 'session' as const, backup: true }] : []),
    ])
    plan.merge(items)
  }

  const dayCount = new Set(picks.map((p) => p.main.session.day)).size
  const backupCount = picks.filter((p) => p.backup).length

  return (
    <div className="space-y-6">
      <section aria-label="Your profile" className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Tell us a little about you and we'll suggest a clash-free schedule. No account, nothing leaves your
          browser.
        </p>

        <label className="block text-sm font-medium">
          Your role
          <select
            value={profile.role}
            onChange={(e) => set({ role: e.target.value as Role | '' })}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-normal dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Prefer not to say</option>
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLES[r].label}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-medium">
            Interests{' '}
            <span className="font-normal text-slate-600 dark:text-slate-400">
              ({profile.interests.length}/{MAX_INTERESTS}, pick at least one)
            </span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => {
              const on = profile.interests.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && profile.interests.length >= MAX_INTERESTS}
                  onClick={() => toggleInterest(tag)}
                  className={pill(on)}
                >
                  {tagLabel(tag)}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Experience with these topics</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXPERIENCE.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={profile.experience === value}
                onClick={() => set({ experience: value })}
                className={pill(profile.experience === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Days you're attending</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {ATTEND_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={profile.days.includes(day)}
                onClick={() => toggleDay(day)}
                className={pill(profile.days.includes(day))}
              >
                {formatDayLabel(day)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={profile.allAccess}
            onChange={(e) => set({ allAccess: e.target.checked })}
          />
          <span>
            I have an <strong>All-Access pass</strong>
            <span className="block text-slate-600 dark:text-slate-400">
              Needed for Monday's CNCF-hosted co-located events. The KubeCon-only pass still includes Monday's
              Project Lightning Talks.
            </span>
          </span>
        </label>
      </section>

      {profile.interests.length === 0 ? (
        <p className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900">Pick at least one interest to see suggestions.</p>
      ) : picks.length === 0 ? (
        <p className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900">
          No sessions match these interests on the days you picked. Try another interest or add a day.
        </p>
      ) : (
        <section aria-label="Suggested plan" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <strong>{picks.length}</strong> suggested {picks.length === 1 ? 'session' : 'sessions'} over {dayCount}{' '}
              {dayCount === 1 ? 'day' : 'days'}, with {backupCount} {backupCount === 1 ? 'backup' : 'backups'}. No
              clashes.
            </p>
            <Button variant="primary" onClick={addAll}>
              Add all to my plan
            </Button>
          </div>

          {picks.map(({ main, backup }, index) => {
            const newDay = index === 0 || picks[index - 1].main.session.day !== main.session.day
            return (
              <div key={main.session.id}>
                {newDay && <h2 className="mb-2 text-lg font-bold">{formatDayLabel(main.session.day)}</h2>}
                <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">
                  {formatTime(main.session.start, timeZone)}
                </p>
                <SessionCard
                  session={main.session}
                  timeZone={timeZone}
                  notice={<Reasons scored={main} />}
                  actions={
                    <>
                      <AddButton inPlan={inPlan(main.session)} onAdd={() => plan.merge([{ id: main.session.id, kind: 'session', backup: false }])} label="Add" />
                      {backup && (
                        <BackupLine
                          backup={backup}
                          timeZone={timeZone}
                          inPlan={inPlan(backup.session)}
                          onAdd={() => plan.merge([{ id: backup.session.id, kind: 'session', backup: true }])}
                        />
                      )}
                    </>
                  }
                />
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

function Reasons({ scored }: { scored: Scored }) {
  return (
    <span className="text-emerald-800 dark:text-emerald-300">
      Why: {scored.reasons.join(' · ')} <span className="text-slate-500 dark:text-slate-400">(score {scored.score})</span>
    </span>
  )
}

function AddButton({ inPlan, onAdd, label }: { inPlan: boolean; onAdd: () => void; label: string }) {
  return inPlan ? (
    <span className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700">✓ In my plan</span>
  ) : (
    <Button variant="primary" onClick={onAdd}>
      {label}
    </Button>
  )
}

// The backup choice for a pick, shown compactly at the bottom of its card.
function BackupLine({
  backup,
  timeZone,
  inPlan,
  onAdd,
}: {
  backup: Scored
  timeZone?: string
  inPlan: boolean
  onAdd: () => void
}) {
  return (
    <div className="mt-1 w-full rounded-lg border border-dashed border-slate-300 p-2 text-sm dark:border-slate-700">
      <p>
        <span className="font-medium">Backup:</span>{' '}
        <a href={backup.session.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {backup.session.title}
        </a>{' '}
        <span className="text-slate-600 dark:text-slate-400">({formatTime(backup.session.start, timeZone)})</span>
      </p>
      <p className="text-xs text-slate-600 dark:text-slate-400">Why: {backup.reasons.join(' · ')}</p>
      <div className="mt-2">
        <AddButton inPlan={inPlan} onAdd={onAdd} label="Add as backup" />
      </div>
    </div>
  )
}

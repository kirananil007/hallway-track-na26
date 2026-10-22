// One community side event. Same slots as SessionCard (actions, notice, tone), so pages
// can show both kinds of card side by side.

import type { ReactNode } from 'react'
import { tagLabel } from '../lib/labels'
import { durationMinutes, formatDuration, formatTime } from '../lib/time'
import type { SideEvent } from '../types'
import { TONE_CLASS, type CardTone } from './cardTone'

interface Props {
  event: SideEvent
  timeZone?: string
  actions?: ReactNode
  notice?: ReactNode
  tone?: CardTone
}

const badge = 'rounded px-1.5 py-0.5 font-medium'

export function SideEventCard({ event: e, timeZone, actions, notice, tone = 'normal' }: Props) {
  return (
    <article className={`rounded-xl border p-3 ${TONE_CLASS[tone]}`}>
      {notice && <div className="mb-1 text-xs font-medium">{notice}</div>}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span>
          until {formatTime(e.end, timeZone)} · {formatDuration(durationMinutes(e.start, e.end))}
        </span>
        <span className={`${badge} bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300`}>Side event</span>
        <span className="rounded border border-slate-300 px-1.5 py-0.5 dark:border-slate-700">
          {e.cost === 'free' ? 'Free' : 'Paid'}
          {e.requires_registration && ' · RSVP required'}
        </span>
      </div>

      <h3 className="mt-1 font-semibold leading-snug">
        <a href={e.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {e.title}
          <span className="sr-only"> (opens the organizer's page)</span>
        </a>
      </h3>
      <p className="mt-0.5 text-sm">Hosted by {e.host}</p>
      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
        {[e.venue, e.address].filter(Boolean).join(' · ')}
      </p>

      {e.tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Interests">
          {e.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {tagLabel(tag)}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Added by{' '}
        <a className="underline" href={`https://github.com/${e.submitted_by}`}>
          @{e.submitted_by}
        </a>{' '}
        · details checked {e.last_verified}
      </p>

      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </article>
  )
}

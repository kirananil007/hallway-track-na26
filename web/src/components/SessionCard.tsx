// One session in the list. The title links to the official session page, where the
// full abstract lives (we only keep a short summary).

import { LEVEL_LABELS, TYPE_LABELS, roomLabel, tagLabel } from '../lib/labels'
import { durationMinutes, formatDuration, formatTime } from '../lib/time'
import type { Session, SessionType } from '../types'

// Colored badge per session type. Plain talks get no badge to keep the list calm.
const TYPE_BADGE: Partial<Record<SessionType, string>> = {
  keynote: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
  lightning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  colocated: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

interface Props {
  session: Session
  timeZone?: string
  activeTags: string[]
  onTagClick: (tag: string) => void
}

export function SessionCard({ session: s, timeZone, activeTags, onTagClick }: Props) {
  const minutes = durationMinutes(s.start, s.end)

  return (
    <article className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span>
          until {formatTime(s.end, timeZone)} · {formatDuration(minutes)}
        </span>
        {TYPE_BADGE[s.type] && (
          <span className={`rounded px-1.5 py-0.5 font-medium ${TYPE_BADGE[s.type]}`}>{TYPE_LABELS[s.type]}</span>
        )}
        {s.level !== 'unknown' && (
          <span className="rounded border border-slate-300 px-1.5 py-0.5 dark:border-slate-700">
            {LEVEL_LABELS[s.level]}
          </span>
        )}
      </div>

      <h3 className="mt-1 font-semibold leading-snug">
        <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {s.title}
          <span className="sr-only"> (opens the official session page)</span>
        </a>
      </h3>

      {s.speakers.length > 0 && <p className="mt-0.5 text-sm">{s.speakers.join(', ')}</p>}

      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
        {[roomLabel(s.room), s.track].filter(Boolean).join(' · ')}
      </p>

      {s.summary && <p className="mt-2 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">{s.summary}</p>}

      {s.tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Interests">
          {s.tags.map((tag) => (
            <li key={tag}>
              {/* Tapping a tag filters the list by it */}
              <button
                type="button"
                onClick={() => onTagClick(tag)}
                aria-pressed={activeTags.includes(tag)}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  activeTags.includes(tag)
                    ? 'bg-sky-700 text-white dark:bg-sky-400 dark:text-slate-950'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {tagLabel(tag)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

// Shown on every page. The disclaimer is required: this is a community project,
// not an official CNCF / Linux Foundation product.

import { EVENT } from '../lib/event'
import { formatUpdatedAt } from '../lib/time'
import type { Meta } from '../types'

export function Footer({ meta }: { meta?: Meta }) {
  return (
    <footer className="mt-12 space-y-2 border-t border-slate-200 py-6 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
      {meta && (
        <p>
          Schedule data updated {formatUpdatedAt(meta.updated_at)} (your time) from the{' '}
          <a className="underline" href={EVENT.officialScheduleUrl}>
            official schedule
          </a>
          . Always check the official page for last-minute changes.
        </p>
      )}
      <p>
        Hallway Track is an unofficial community project. Not affiliated with or endorsed by CNCF
        or the Linux Foundation.
      </p>
      <p>
        Open source on{' '}
        <a className="underline hover:text-slate-900 dark:hover:text-slate-200" href="https://github.com/kirananil007/hallway-track-na26">
          GitHub
        </a>
        . No cookies, no tracking.
      </p>
    </footer>
  )
}

// Tabs across the top. They're plain links to "#/route", so Back/Forward work as expected.

import type { Route } from '../lib/route'

interface Props {
  current: Route
  planCount: number
}

export function TabBar({ current, planCount }: Props) {
  // `short` is shown on phones so all four tabs fit without scrolling.
  const tabs: { route: Route; label: string; short?: string }[] = [
    { route: 'browse', label: 'Browse' },
    { route: 'recommend', label: 'Plan my KubeCon', short: 'Suggest' },
    { route: 'side-events', label: 'Side events' },
    { route: 'plan', label: planCount ? `My plan (${planCount})` : 'My plan' },
  ]

  return (
    <nav aria-label="Pages" className="-mx-4 mt-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 dark:border-slate-800">
      {tabs.map((tab) => (
        <a
          key={tab.route}
          href={`#/${tab.route}`}
          aria-current={current === tab.route ? 'page' : undefined}
          className={`-mb-px shrink-0 border-b-2 px-2 py-2 text-sm font-medium whitespace-nowrap sm:px-3 ${
            current === tab.route
              ? 'border-sky-700 text-sky-800 dark:border-sky-400 dark:text-sky-300'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          {tab.short ? (
            <>
              <span className="sm:hidden">{tab.short}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </>
          ) : (
            tab.label
          )}
        </a>
      ))}
    </nav>
  )
}

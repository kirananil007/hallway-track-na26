// Tabs across the top. They're plain links to "#/route", so Back/Forward work as expected.

import type { Route } from '../lib/route'

interface Props {
  current: Route
  planCount: number
}

export function TabBar({ current, planCount }: Props) {
  const tabs: { route: Route; label: string }[] = [
    { route: 'browse', label: 'Browse' },
    { route: 'recommend', label: 'Plan my KubeCon' },
    { route: 'plan', label: planCount ? `My plan (${planCount})` : 'My plan' },
  ]

  return (
    <nav aria-label="Pages" className="-mx-4 mt-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 dark:border-slate-800">
      {tabs.map((tab) => (
        <a
          key={tab.route}
          href={`#/${tab.route}`}
          aria-current={current === tab.route ? 'page' : undefined}
          className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${
            current === tab.route
              ? 'border-sky-700 text-sky-800 dark:border-sky-400 dark:text-sky-300'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  )
}

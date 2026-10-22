import { useMemo, useState } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { TabBar } from './components/TabBar'
import { useData } from './hooks/useData'
import { useHashRoute } from './hooks/useHashRoute'
import { usePlan } from './hooks/usePlan'
import { useDarkMode, useTimeMode } from './hooks/useSettings'
import { EVENT, daysUntilEvent } from './lib/event'
import { resolvePlan } from './lib/planEntries'
import { todayInEventZone, zoneFor } from './lib/time'
import { Browse } from './pages/Browse'
import { MyPlan } from './pages/MyPlan'
import { Recommend } from './pages/Recommend'
import { SideEvents } from './pages/SideEvents'

// The app shell: header, tabs, the current page, footer.
// Pages are picked from the URL hash (see lib/route.ts).
export default function App() {
  const data = useData()
  const plan = usePlan() // lives here so every page sees the same plan
  const { route, params, navigate } = useHashRoute()
  const [timeMode, setTimeMode] = useTimeMode()
  const [dark, toggleDark] = useDarkMode()
  // Read the clock once on first render, not on every re-render.
  const [today] = useState(() => todayInEventZone())

  // Plan items matched to their sessions/side events, shared by every page.
  const { entries, missing } = useMemo(() => {
    if (data.status !== 'ready') return { entries: [], missing: [] }
    return resolvePlan(
      plan.items,
      new Map(data.sessions.map((s) => [s.id, s])),
      new Map(data.sideEvents.map((e) => [e.id, e])),
    )
  }, [data, plan.items])

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Header
          daysToGo={daysUntilEvent(today)}
          timeMode={timeMode}
          onTimeModeChange={setTimeMode}
          dark={dark}
          onToggleDark={toggleDark}
        />
        <TabBar current={route} planCount={plan.items.length} />

        <main className="mt-6">
          {data.status === 'loading' && <p className="text-slate-600 dark:text-slate-400">Loading the schedule…</p>}

          {data.status === 'error' && (
            <p className="rounded-lg bg-red-50 p-4 text-red-900 dark:bg-red-950 dark:text-red-200">
              Couldn't load the schedule ({data.message}). Try reloading, or use the{' '}
              <a className="underline" href={EVENT.officialScheduleUrl}>
                official schedule
              </a>
              .
            </p>
          )}

          {data.status === 'ready' && route === 'browse' && (
            <Browse
              sessions={data.sessions}
              params={params}
              today={today}
              timeZone={zoneFor(timeMode)}
              plan={plan}
              planEntries={entries}
              onParamsChange={(next) => navigate('browse', next, { replace: true })}
            />
          )}

          {data.status === 'ready' && route === 'side-events' && (
            <SideEvents events={data.sideEvents} plan={plan} planEntries={entries} timeZone={zoneFor(timeMode)} />
          )}

          {data.status === 'ready' && route === 'recommend' && (
            <Recommend
              sessions={data.sessions}
              plan={plan}
              params={params}
              timeZone={zoneFor(timeMode)}
              onParamsChange={(next) => navigate('recommend', next, { replace: true })}
            />
          )}

          {data.status === 'ready' && route === 'plan' && (
            <MyPlan
              sessions={data.sessions}
              sideEvents={data.sideEvents}
              plan={plan}
              entries={entries}
              missing={missing}
              params={params}
              timeZone={zoneFor(timeMode)}
              onCloseShared={() => navigate('plan', undefined, { replace: true })}
            />
          )}
        </main>

        <Footer meta={data.status === 'ready' ? data.meta : undefined} />
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { useData } from './hooks/useData'
import { useHashRoute } from './hooks/useHashRoute'
import { useDarkMode, useTimeMode } from './hooks/useSettings'
import { EVENT, daysUntilEvent } from './lib/event'
import { todayInEventZone, zoneFor } from './lib/time'
import { Browse } from './pages/Browse'

// The app shell: header, the current page, footer.
// Pages are picked from the URL hash (see lib/route.ts); for now there's only Browse.
export default function App() {
  const data = useData()
  const { params, navigate } = useHashRoute()
  const [timeMode, setTimeMode] = useTimeMode()
  const [dark, toggleDark] = useDarkMode()
  // Read the clock once on first render, not on every re-render.
  const [today] = useState(() => todayInEventZone())

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

          {data.status === 'ready' && (
            <Browse
              sessions={data.sessions}
              params={params}
              today={today}
              timeZone={zoneFor(timeMode)}
              onParamsChange={(next) => navigate('browse', next, { replace: true })}
            />
          )}
        </main>

        <Footer meta={data.status === 'ready' ? data.meta : undefined} />
      </div>
    </div>
  )
}

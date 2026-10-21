import { useState } from 'react'
import { Footer } from './components/Footer'
import { EVENT, daysUntilEvent } from './lib/event'

// M0 placeholder. Later milestones replace the <main> content with hash-based tabs
// (Browse, My Plan, Recommend, Side Events, Monday, First-timer).
export default function App() {
  // Read the clock once on first render, not on every re-render.
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const days = daysUntilEvent(today)

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Hallway Track</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            A community planner for {EVENT.name}
          </p>
        </header>

        <main className="mt-8 space-y-4">
          <p>
            {EVENT.venue}, {EVENT.city} · Nov 9–12, 2026
            {days > 0 && <> · {days} days to go</>}
          </p>
          <p className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900">
            Coming soon: build a conflict-free schedule, export it to your calendar, and find
            community side events in one place.
          </p>
        </main>

        <Footer />
      </div>
    </div>
  )
}

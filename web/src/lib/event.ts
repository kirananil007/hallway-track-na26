// Facts about the event that the whole app shares.
// Times are shown in the venue's time zone by default (Salt Lake City, MST in November).

export const EVENT = {
  name: 'KubeCon + CloudNativeCon North America 2026',
  city: 'Salt Lake City',
  venue: 'Salt Palace Convention Center',
  timeZone: 'America/Denver',
  firstDay: '2026-11-09',
  lastDay: '2026-11-12',
  // Nov 8 only has registration, but it's in the schedule, so it gets a day button too.
  days: ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'],
  // What Browse shows before the event starts: the first main-conference day.
  defaultDay: '2026-11-10',
  officialScheduleUrl: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/program/schedule/',
} as const

export const REPO = {
  url: 'https://github.com/kirananil007/hallway-track-na26',
  // Opens events.yaml in GitHub's web editor; GitHub offers to fork it for non-members.
  addEventUrl: 'https://github.com/kirananil007/hallway-track-na26/edit/main/data/events.yaml',
  contributingUrl: 'https://github.com/kirananil007/hallway-track-na26/blob/main/CONTRIBUTING.md',
} as const

// Whole days from `today` until the first event day (0 once the event has started).
// Both arguments are 'YYYY-MM-DD' strings so this never depends on the viewer's time zone.
export function daysUntilEvent(today: string, firstDay: string = EVENT.firstDay): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const diff = Date.parse(firstDay) - Date.parse(today)
  return Math.max(0, Math.round(diff / msPerDay))
}

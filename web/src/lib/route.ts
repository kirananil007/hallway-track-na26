// Hash-based routing without a router library.
// "#/browse?day=2026-11-11" -> { route: 'browse', params: day=2026-11-11 }

export const ROUTES = ['browse', 'plan'] as const // more tabs arrive in later milestones
export type Route = (typeof ROUTES)[number]

export function parseHash(hash: string): { route: Route; params: URLSearchParams } {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const route = (ROUTES as readonly string[]).includes(path) ? (path as Route) : 'browse'
  return { route, params: new URLSearchParams(query) }
}

export function buildHash(route: Route, params?: URLSearchParams): string {
  const query = params?.toString()
  return `#/${route}${query ? `?${query}` : ''}`
}

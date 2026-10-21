import { useCallback, useEffect, useState } from 'react'
import { buildHash, parseHash, type Route } from '../lib/route'

// Keeps React in sync with the "#/route?params" part of the URL.
export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  // replace: true updates the URL without adding a history entry. We use it for filter
  // changes, so typing in the search box doesn't fill up the Back button.
  const navigate = useCallback((route: Route, params?: URLSearchParams, options?: { replace?: boolean }) => {
    const next = buildHash(route, params)
    if (options?.replace) {
      window.history.replaceState(null, '', next)
      setHash(next) // replaceState doesn't fire 'hashchange'
    } else {
      window.location.hash = next
    }
  }, [])

  return { ...parseHash(hash), navigate }
}

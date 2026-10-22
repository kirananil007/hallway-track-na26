// Share a plan without a backend: the plan is packed into the link itself.
//
// Format: "1.<base64url of JSON>", where the JSON is [[id, flags], ...]
// and flags is a bit field: 1 = side event, 2 = backup. The leading "1." is a version,
// so we can change the format later without breaking old links.

import { parsePlan, type PlanItem } from './plan'

const VERSION = '1'
const FLAG_SIDE = 1
const FLAG_BACKUP = 2

export function encodePlan(items: PlanItem[]): string {
  const compact = items.map((item) => [
    item.id,
    (item.kind === 'side' ? FLAG_SIDE : 0) | (item.backup ? FLAG_BACKUP : 0),
  ])
  return `${VERSION}.${toBase64Url(JSON.stringify(compact))}`
}

// Returns null if the code is broken (truncated link, wrong version, not our format).
export function decodePlan(code: string): PlanItem[] | null {
  const [version, payload] = code.split('.')
  if (version !== VERSION || !payload) return null
  try {
    const data: unknown = JSON.parse(fromBase64Url(payload))
    if (!Array.isArray(data)) return null
    const items = data
      .filter((entry): entry is [string, number] => Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'number')
      .map(([id, flags]) => ({
        id,
        kind: flags & FLAG_SIDE ? 'side' : 'session',
        backup: Boolean(flags & FLAG_BACKUP),
      }))
    return parsePlan(items)
  } catch {
    return null
  }
}

// base64url = base64 with URL-safe characters and no padding.
function toBase64Url(text: string): string {
  let binary = ''
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

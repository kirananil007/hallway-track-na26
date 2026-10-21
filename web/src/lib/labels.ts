// Human-friendly names for the values in sessions.json.

import type { Level, SessionType } from '../types'

export const TYPE_LABELS: Record<SessionType, string> = {
  keynote: 'Keynote',
  breakout: 'Talk',
  lightning: 'Lightning talk',
  colocated: 'Co-located event',
  other: 'Break / expo',
}

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  unknown: 'Any level',
}

// Tags whose names need special casing. Others just get a capital first letter.
const TAG_LABELS: Record<string, string> = {
  'ai-ml': 'AI/ML',
  sre: 'SRE',
  ebpf: 'eBPF',
  wasm: 'Wasm',
  finops: 'FinOps',
  gitops: 'GitOps',
  opentelemetry: 'OpenTelemetry',
}

export function tagLabel(tag: string): string {
  if (TAG_LABELS[tag]) return TAG_LABELS[tag]
  const words = tag.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// "Salt Palace | Level 1 | Hall DE" -> "Salt Palace · Level 1 · Hall DE"
export function roomLabel(room: string): string {
  return room.split('|').map((part) => part.trim()).filter(Boolean).join(' · ')
}

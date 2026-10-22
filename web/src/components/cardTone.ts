// Border styles shared by SessionCard and SideEventCard, so both look the same in My Plan.
// (Kept in its own file: React's hot reload works best when component files only export components.)

export const TONE_CLASS = {
  normal: 'border-slate-200 dark:border-slate-800',
  conflict: 'border-red-500 dark:border-red-500',
  backup: 'border-dashed border-slate-400 dark:border-slate-600',
}

export type CardTone = keyof typeof TONE_CLASS

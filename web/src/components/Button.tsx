// The app's standard button, in three looks.

import type { ButtonHTMLAttributes } from 'react'

const VARIANTS = {
  primary: 'bg-sky-700 text-white hover:bg-sky-800 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300',
  secondary:
    'border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
  danger: 'border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS
}

export function Button({ variant = 'secondary', className = '', ...props }: Props) {
  return (
    <button
      type="button"
      className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

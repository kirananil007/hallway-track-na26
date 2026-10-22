// First-timer guide. The text lives in content/first-timer.md so the community can
// improve it with a pull request; `marked` turns the Markdown into HTML.
//
// The Markdown comes from this repo (every change is a reviewed pull request), not from
// visitors, so rendering it as HTML is safe.

import { marked } from 'marked'
import guide from '../content/first-timer.md?raw' // ?raw: Vite imports the file as a string

const html = marked.parse(guide, { async: false })

// Default export so App.tsx can load this page (and `marked`) only when it's opened.
export default function FirstTimer() {
  return <article className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
}

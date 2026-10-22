// Browser-only helpers (downloading a file, sharing a link). Not unit-tested: they
// just call browser APIs.

export function downloadFile(filename: string, contents: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before freeing the memory.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Use the phone's share sheet when there is one; otherwise copy to the clipboard.
// Returns what happened so the UI can say "Link copied".
export async function shareLink(url: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ url, title })
      return 'shared'
    } catch {
      // The user closed the share sheet; fall through to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

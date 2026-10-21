/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages serves this site from https://<user>.github.io/hallway-track-na26/,
// so every asset URL needs that prefix. Change this if you fork under another name.
const REPO_BASE = '/hallway-track-na26/'

// https://vite.dev/config/
export default defineConfig({
  base: REPO_BASE,
  plugins: [react(), tailwindcss()],
  test: {
    // Our tests cover pure logic in src/lib, so no browser/DOM emulation is needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

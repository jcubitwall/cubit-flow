import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: change 'cubit-flow' to your actual GitHub repo name.
// This must match exactly for GitHub Pages to load assets correctly.
// If you deploy to a custom domain instead, set base to '/'.
export default defineConfig({
  plugins: [react()],
  base: '/cubit-flow/',
})

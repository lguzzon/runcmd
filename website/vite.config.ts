import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public', // Build directly to repo-root/public which actions will deploy
    emptyOutDir: true,
  },
  base: '/runcmd/', // GitHub Pages base URL
})

import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  site: 'https://lguzzon.github.io/runcmd/',
  base: '/runcmd/',
  outDir: '../public',
  integrations: [tailwind()],
})

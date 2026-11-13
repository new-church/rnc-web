// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  adapter: vercel({ maxDuration: 300 }),

  redirects: {
    '/join': '/events',
    '/join/sunday-worship': '/events/sunday-worship',
    '/join/open-discussion': '/events/open-discussion',
    '/join/read-and-reflect': '/events/read-and-reflect',
    '/join/meditation': '/events/meditation',
    '/join/family-retreat-2027': '/events/family-retreat-2027',
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [react()],
});
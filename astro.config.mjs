// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // www is the live host; the apex redirects to it.
  site: 'https://www.rosevillenewchurch.com.au',
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

  integrations: [
    react(),
    // Keep sign-in, admin and API routes out of the sitemap, and the blog and
    // articles indexes while they have no published posts (they redirect home).
    // Remove them from this filter when posts are published again.
    sitemap({
      filter: (page) => !/\/(admin|login|api|blog|articles|subscribe\/confirm(ed)?)(\/|$)/.test(page),
    }),
  ],
});
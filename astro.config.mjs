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
    '/join/family-retreat-2027': '/events/family-retreat',
    '/events/family-retreat-2027': '/events/family-retreat',
    // Old Wix blog URLs (/post/<slug>) keep their slugs under /blog.
    '/post/[slug]': '/blog/[slug]',
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    react(),
    // Keep sign-in, admin and API routes out of the sitemap, and the articles
    // index while it has no published posts (it redirects home). The blog holds
    // the migrated Wix posts, so it stays in.
    sitemap({
      filter: (page) => !/\/(admin|login|api|articles|subscribe\/confirm(ed)?)(\/|$)/.test(page),
    }),
  ],
});
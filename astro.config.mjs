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
    // Old Wix pages (titles from the Wayback copy). Wix named them /blank-N and /about-N, and Google
    // still lists some of them. Each goes to the nearest page on this site.
    '/blank': '/about', // Understanding the Bible
    '/blank-1': '/about', // About
    '/blank-2': '/contact', // Contact
    '/blank-3': '/events', // Join Us
    '/blank-4': '/newsletters', // Newsletter
    '/about-3': '/about', // Road Map to the Bible
    '/about-5': '/about', // Meet our Minister
    '/services-4': '/events/sunday-worship', // What to Expect
    '/general-8': '/events', // Christmas Readings
    '/search': '/',
    '/newsletter': '/newsletters',
    '/meet-our-minister': '/about',
    // Old Wix blog URLs (/post/<slug>) keep their slugs under /blog.
    '/post/[slug]': '/blog/[slug]',
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    react(),
    // Keep sign-in, admin and API routes out of the sitemap, and the articles
    // index while it has no published posts (it redirects home), and the draft
    // /new-church page until the committee has reviewed it. The blog holds
    // the migrated Wix posts, so it stays in.
    sitemap({
      filter: (page) => !/\/(admin|login|api|articles|new-church|subscribe\/confirm(ed)?)(\/|$)/.test(page),
    }),
  ],
});
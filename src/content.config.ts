import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const newsletters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/newsletters' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    pdfUrl: z.string().url(),
    pdfId: z.string(),
    bytes: z.number().optional(),
    highlights: z.array(z.string()).default([]),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    relatedArticles: z.array(z.string()).default([]),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    sourceNewsletter: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    bio: z.string(),
    photo: z.string().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    author: z.string(),
    series: z.string().optional(),
    tags: z.array(z.string()).default([]),
    relatedPosts: z.array(z.string()).default([]),
    relatedArticle: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// Extra detail layered onto calendar events. The Outlook calendar is the single source of truth for what is on and
// when; a file in src/content/event-info is picked up by any calendar event whose title contains one of its `match`
// phrases (or its file name), and adds the write-up, links and picture. See src/content/event-info/_HOW-TO.md.
const eventInfo = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/_*'], base: './src/content/event-info' }),
  schema: z.object({
    /** Page heading, e.g. "Monday's Meditation with Kathryn Baker". */
    title: z.string(),
    /** Short name for cards, e.g. "Meditation". Defaults to title. */
    shortTitle: z.string().optional(),
    /** Phrases matched (case-insensitively) against the calendar title. The file name always matches too. */
    match: z.array(z.string()).default([]),
    /** A calendar title containing any of these is never matched (e.g. another church's service). */
    exclude: z.array(z.string()).default([]),
    /** One or two sentences for cards, and for the calendar entry's description. */
    summary: z.string(),
    category: z.enum(['Worship', 'Study', 'Community']).default('Community'),
    where: z.enum(['In person', 'On Zoom', 'Online']).optional(),
    /** Show on the home page "Visiting us" row. */
    featured: z.number().optional(),
    /** A page that is built by hand (e.g. /events/sunday-worship); calendar events link there. */
    page: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    zoomlink: z.string().optional(),
    buttons: z
      .array(z.object({ label: z.string(), href: z.string(), secondary: z.boolean().default(false) }))
      .default([]),
  }),
});

export const collections = { newsletters, articles, authors, blog, 'event-info': eventInfo };

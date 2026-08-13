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

export const collections = { newsletters, articles, authors, blog };

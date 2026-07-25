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
  }),
});

export const collections = { newsletters };

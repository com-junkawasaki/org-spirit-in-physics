import { defineCollection, z } from 'astro:content';

const papersCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    authors: z.array(
      z.object({
        name: z.string(),
        email: z.string().email().optional(),
        affiliation: z.string(),
      })
    ),
    date: z.string().or(z.date().transform((d) => d.toISOString())),
    affiliations: z.array(z.string()),
    schemaId: z.string().url().optional(),
  }),
});

export const collections = {
  papers: papersCollection,
} as const;


import { defineCollection, z } from 'astro:content';

const papersCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    authors: z.array(
      z.object({
        name: z.string(),
        email: z.string().optional(),
        affiliation: z.string(),
      })
    ),
    date: z.string(),
    affiliations: z.array(z.string()).optional(),
    schemaId: z.string().optional(),
  }),
});

export const collections = {
  papers: papersCollection,
};


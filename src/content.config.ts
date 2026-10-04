import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One JSON file per product in src/content/products, edited through Sveltia CMS (/admin/).
const products = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/products' }),
  schema: z.object({
    slug: z.string(),
    category: z.enum(['tv', 'headphones', 'soundbars']),
    name: z.string(),
    model: z.string(),
    price: z.number(),
    mrp: z.number().nullish(),
    image: z.string(),
    order: z.number().default(999),
    tags: z.array(z.enum(['new', 'highlight', 'trending'])).default([]),
    description: z.string().nullish(),
    // televisions
    size: z.number().nullish(),
    cm: z.number().nullish(),
    series: z.string().nullish(),
    resolution: z.string().nullish(),
    panel: z.string().nullish(),
    // headphones
    type: z.string().nullish(),
    // soundbars
    channels: z.string().nullish(),
    hidden: z.boolean().default(false)
  })
});

export const collections = { products };

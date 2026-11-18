import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const localAsset = z.string().regex(/^(people|media)\/[a-zA-Z0-9_./-]+$/)
  .refine(value => !value.split('/').includes('..'), 'Asset paths must stay inside public/');
const common = { order: z.number().int().default(100), draft: z.boolean().default(false) };
export const collections = {
  news: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './content/news' }),
    schema: z.object({
      title: z.string().min(1), summary: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value, 'Use a valid YYYY-MM-DD date'),
      sample: z.boolean().default(false), ...common,
    }),
  }),
  people: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './content/people' }),
    schema: z.object({
      name: z.string().min(1),
      role: z.enum(['group-leader', 'postdoc', 'phd', 'msc', 'technician']),
      status: z.enum(['current', 'alumni']),
      photo: localAsset.optional(),
      thumbnail: localAsset.optional(), thumbnailWidth: z.number().int().positive().optional(), thumbnailHeight: z.number().int().positive().optional(),
      photoWidth: z.number().int().positive().optional(), photoHeight: z.number().int().positive().optional(),
      roleLabel: z.string().optional(),
      thesis: z.union([z.literal(''), z.string().url().refine(value => /^https?:\/\//.test(value), 'Use an HTTP or HTTPS thesis link')]).optional(),
      email: z.string().email().optional(),
      ...common,
    }),
  }),
  research: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './content/research' }),
    schema: z.object({ title: z.string().min(1), homeTitle: z.string().optional(), image: z.union([localAsset, z.string().url().refine(value => value.startsWith('https://'))]).optional(), imageAlt: z.string().optional(), summary: z.string().optional(), ...common }),
  }),
  publications: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './content/publications' }),
    schema: z.object({
      title: z.string().min(1), year: z.number().int().min(1900).max(2200),
      journal: z.string().min(1), authors: z.string().optional(), number: z.number().int().optional(),
      doi: z.string().url().refine(value => new URL(value).origin === 'https://doi.org', 'Use an https://doi.org/ link'),
      ...common,
    }),
  }),
  sections: defineCollection({
    loader: glob({ pattern: '*.md', base: './content/sections' }),
    schema: z.object({
      title: z.string().min(1), eyebrow: z.string().optional(), subtitle: z.string().optional(),
      video: localAsset.optional(), email: z.string().email().optional(),
      phone: z.string().optional(), note: z.string().optional(), linkLabel: z.string().optional(),
      linkUrl: z.string().refine(value => /^(https:\/\/|mailto:)/.test(value), 'Use an HTTPS or email link').optional(),
    }),
  }),
};

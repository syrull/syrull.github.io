import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string().optional(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			tags: z.array(z.string()).optional(),
			toc: z.boolean().optional(),
			math: z.boolean().optional(),
			heroImage: image().optional(),
		}),
});

const writeups = defineCollection({
	loader: glob({ base: './src/content/writeups', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string().optional(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			tags: z.array(z.string()).optional(),
			toc: z.boolean().optional(),
			math: z.boolean().optional(),
			heroImage: image().optional(),
		}),
});

export const collections = { posts, writeups };

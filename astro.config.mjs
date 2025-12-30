// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import expressiveCode from 'astro-expressive-code';

// https://astro.build/config
export default defineConfig({
    site: 'https://dganev.com/',
    integrations: [react(), expressiveCode(), mdx(), sitemap()],
});
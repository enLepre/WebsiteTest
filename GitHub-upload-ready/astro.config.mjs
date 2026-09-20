import { defineConfig } from 'astro/config';

// GitHub Actions supplies these values automatically for a github.io preview.
// Set SITE_URL to your custom domain and BASE_PATH to / when it is connected.
export default defineConfig({
  site: process.env.SITE_URL || 'https://tilleyresearchgroup.com',
  base: process.env.BASE_PATH || '/',
  output: 'static',
  build: { inlineStylesheets: 'always' },
});

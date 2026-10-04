import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The live domain. Canonical URLs, Open Graph tags and the sitemap use it.
export default defineConfig({
  site: 'https://arshad-sonyhsrlayout.com',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: page => !page.includes('/admin/') })],
  build: { inlineStylesheets: 'auto' }
});

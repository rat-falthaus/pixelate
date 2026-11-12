import { defineConfig } from 'astro/config';
import { basePath, siteUrl } from './site.config.mjs';

export default defineConfig({
  base: basePath,
  site: siteUrl,
});

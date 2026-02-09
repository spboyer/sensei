// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://spboyer.github.io',
  base: '/sensei',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});

import { defineConfig } from 'vite';

// base './' so the built site also works from GitHub Pages or any subfolder
export default defineConfig({
  base: './',
  server: { port: 5173, open: true },
});

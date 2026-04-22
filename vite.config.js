import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      '/kuma': {
        target: 'http://letsapi-kuma.way2api.fun',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kuma/, ''),
      },
    },
  },
});

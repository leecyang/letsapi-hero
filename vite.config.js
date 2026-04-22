import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      '/kuma': {
        target: 'http://111.229.65.23:33001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kuma/, ''),
      },
    },
  },
});

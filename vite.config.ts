import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: '/richexile/',
  server: {
    proxy: {
      '/poeninja-api': {
        target: 'https://poe2.ninja',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/poeninja-api/, '/api/data'),
      },
      '/ggg-api': {
        target: 'https://api.pathofexile.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ggg-api/, ''),
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: '/richexile/',
  server: {
    proxy: {
      '/poeninja-api': {
        target: 'https://poe.ninja',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/poeninja-api/, '/poe2/api/economy/exchange/current'),
      },
    },
  },
})

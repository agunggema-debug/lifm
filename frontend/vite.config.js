import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind CSS v4 via @tailwindcss/vite
// https://tailwindcss.com/docs/installation/using-vite
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pisahkan library vendor (React) dari kode game: bundle utama jadi lebih kecil dan
  // vendor yang jarang berubah bisa di-cache lama oleh browser (hemat unduhan saat online).
  // Referensi resmi Vite (Building for Production):
  // https://vite.dev/guide/build.html
  build: {
    rollupOptions: {
      output: {
        manualChunks: { vendor: ['react', 'react-dom'] }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/img': 'http://localhost:3001'
    }
  }
})



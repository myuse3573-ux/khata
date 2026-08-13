import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Ignore server database files to prevent Vite dev server HMR from triggering automatic page reloads
    watch: {
      ignored: ['**/server/**', '**/data.db.json', '**/*.db.json']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
  ,
  build: {
    // increase warning threshold and split large vendor libraries into separate chunks
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('html2canvas')) return 'html2canvas'
            if (id.toLowerCase().includes('purify')) return 'purify'
            if (id.includes('react')) return 'react-vendor'
            return 'vendor'
          }
        }
      }
    }
  }
})

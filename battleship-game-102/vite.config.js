import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // This makes it accessible from all network interfaces
    port: 3000,       // You can specify any port you want
    open: true,       // Opens the browser automatically
  },
  build: {
    sourcemap: true,  // Enable source maps for better debugging
  },
  // Explicitly disable source maps in development to avoid parsing errors
  css: {
    devSourcemap: false
  }
})

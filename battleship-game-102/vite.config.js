import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // This makes it accessible from all network interfaces
    port: 3000,       // You can specify any port you want
    open: true,       // Opens the browser automatically
  }
})

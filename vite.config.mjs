import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // allows external access (e.g., from Docker)
    port: 5173
  },
  preview: {
    port: 4173
  }
});
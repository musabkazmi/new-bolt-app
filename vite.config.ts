import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    // Ensure environment variables are available in production
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://ungvhpjmntrxnyvdtjqr.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuZ3ZocGptbnRyeG55dmR0anFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTY0MjUsImV4cCI6MjA2NjI5MjQyNX0.laTArnBd924f4au9nN7LjL3eFUAGHHMvOjuP7-RR1xI'),
    'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(process.env.VITE_OPENAI_API_KEY || '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'),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          openai: ['openai']
        }
      }
    }
  }
});
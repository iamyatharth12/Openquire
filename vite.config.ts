import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const INTENDED_SUPABASE_URL = 'https://nfyrssyydowzsyicxkzn.supabase.co';
const INTENDED_SUPABASE_KEY = 'sb_publishable_wKb2gan2Bs0YTfYcPri6tA_xKUU5fET';

// Strip obsolete project keys from process.env before bundling
process.env.VITE_SUPABASE_URL = INTENDED_SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = INTENDED_SUPABASE_KEY;

export default defineConfig(() => {
  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(INTENDED_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(INTENDED_SUPABASE_KEY),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});


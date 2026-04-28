import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/**/*.test.tsx', 'jsdom'],
    ],
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.tsx'],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});

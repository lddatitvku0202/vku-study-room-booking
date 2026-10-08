// Unit tests: pure modules under src/ (no emulator, no network).
// Emulator-backed tests have their own config: vitest.emulator.config.mjs.
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: { __DEV__: 'false' },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});

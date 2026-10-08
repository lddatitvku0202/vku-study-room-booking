// Emulator-backed tests (Auth + Firestore emulators, Security Rules, concurrency).
// Run through `npm run test:rules`, which starts the emulators with a `demo-` project id
// (AD-42) so these tests can never reach the real Firebase project.
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: { __DEV__: 'false' },
  test: {
    include: ['tests/emulator/**/*.test.ts'],
    environment: 'node',
    // Test files share one emulator; run them one after another.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});

import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Qwik 1's SSR entry imports this virtual module; tests render without a client manifest.
      '@qwik-client-manifest': fileURLToPath(new URL('./test/stubs/qwik-client-manifest.ts', import.meta.url)),
    },
  },
  test: {
    globalSetup: ['./test/global-setup.ts'],
    include: ['test/**/*.test.ts'],
    testTimeout: 30_000,
    server: {
      deps: {
        // Let Vite process Qwik 1 so the manifest alias above applies.
        inline: ['@builder.io/qwik'],
      },
    },
  },
})

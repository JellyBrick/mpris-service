import { fileURLToPath } from 'node:url';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: false,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorVersion: '2022-03', useDefineForClassFields: true },
        target: 'es2019',
        keepClassNames: true,
      },
    }),
  ],
  test: {
    include:
      process.env.MPRIS_INTEGRATION === '1'
        ? ['test/integration/**/*.test.ts']
        : ['test/*.test.ts'],
    environment: 'node',
    testTimeout: 10000,
    passWithNoTests: true,
  },
});

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const testingLibraryPath = dirname(require.resolve('@testing-library/react'));
const testingReactPath = dirname(require.resolve('react', { paths: [testingLibraryPath] }));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: [{ find: /^react$/, replacement: testingReactPath }] },
  test: { environment: 'jsdom', restoreMocks: true },
});

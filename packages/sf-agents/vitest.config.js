import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
  resolve: {
    alias: {
      '@sf/core': '/home/user/system-friction/packages/sf-core/src/index.js',
      '@sf/engine': '/home/user/system-friction/packages/sf-engine/src/index.js',
    },
  },
})

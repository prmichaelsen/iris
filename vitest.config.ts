import { defineConfig } from 'vitest/config'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// Only include UI tests if jsdom + @testing-library/react are installed.
let uiDepsAvailable = true
try {
  require.resolve('jsdom')
  require.resolve('@testing-library/react')
} catch {
  uiDepsAvailable = false
}

const include = ['tests/**/*.test.ts']
if (uiDepsAvailable) include.push('client/**/*.test.{ts,tsx}')

export default defineConfig({
  test: {
    include,
    testTimeout: 30000,
  },
})

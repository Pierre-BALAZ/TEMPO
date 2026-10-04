import type { E2EConfig } from 'e2e'
import { web } from '@e2e-dev/web'
export default {
  tests: 'tests/e2e/**/*.e2e.ts', workers: 1, retries: 0,
  targets: [{ name: 'chromium', engine: web({ viewport: { width: 1440, height: 1000 } }),
    app: { url: 'http://127.0.0.1:4315', command: { executable: 'npm', args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4315', '--strictPort'], env: { VITE_SYNC_URL: 'http://127.0.0.1:4415' }, log: '.e2e/logs/app.log' } } }],
} satisfies E2EConfig

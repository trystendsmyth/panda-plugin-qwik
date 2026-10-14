import { createRequire } from 'node:module'
import { join } from 'node:path'

import type { QwikModule } from './types'

// Qwik 2 first: a project mid-migration may still have Qwik 1 installed transitively.
const CANDIDATES: QwikModule[] = ['@qwik.dev/core', '@builder.io/qwik']

export function detectQwikModule(cwd: string): QwikModule {
  const require = createRequire(join(cwd, 'package.json'))
  for (const candidate of CANDIDATES) {
    try {
      require.resolve(`${candidate}/package.json`)
      return candidate
    } catch {
      // not installed
    }
  }
  throw new Error(
    `[panda-plugin-qwik] Could not find Qwik from ${cwd}. Install @qwik.dev/core (Qwik 2) or @builder.io/qwik (Qwik 1), or pass qwik({ qwik: '…' }).`,
  )
}

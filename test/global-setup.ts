import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { join } from 'node:path'

import { cssFile, FIXTURE, GENERATED, outdir, ROOT, VARIANTS } from './variants'

const panda = join(ROOT, 'node_modules/.bin/panda')

export default function setup() {
  rmSync(GENERATED, { recursive: true, force: true })

  for (const variant of VARIANTS) {
    const env = {
      ...process.env,
      FIXTURE_TARGET: variant.target,
      FIXTURE_EXT: variant.ext,
      FIXTURE_STYLE_PROPS: variant.styleProps,
      FIXTURE_FORCE_EXT: variant.forceExt ? '1' : '0',
      FIXTURE_OUTDIR: outdir(variant.id),
    }
    const run = (args: string[]) => execFileSync(panda, args, { cwd: FIXTURE, env, stdio: 'pipe' })
    run(['codegen', '--log-level', 'error'])
    run(['cssgen', '--outfile', cssFile(variant.id), '--log-level', 'error'])
  }
}

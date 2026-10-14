// Type-checks a Qwik TSX fixture against the generated declarations, for each
// Qwik major and TypeScript version consumers are likely to run.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import generate from '../global-setup'
import { GENERATED, outdir, ROOT, type VariantId } from '../variants'

const COMPILERS = {
  'ts-6.0': join(ROOT, 'node_modules/typescript/bin/tsc'),
  'ts-5.9': join(ROOT, 'node_modules/typescript-5.9/bin/tsc'),
}

const TARGETS: { variant: VariantId; jsxImportSource: string }[] = [
  { variant: 'qwik2', jsxImportSource: '@qwik.dev/core' },
  { variant: 'qwik1', jsxImportSource: '@builder.io/qwik' },
  { variant: 'qwik2-ts', jsxImportSource: '@qwik.dev/core' },
]

generate()

let failed = 0
for (const { variant, jsxImportSource } of TARGETS) {
  for (const [compiler, tsc] of Object.entries(COMPILERS)) {
    const dir = join(GENERATED, `types-${variant}-${compiler}`)
    mkdirSync(dir, { recursive: true })
    const tsconfig = join(dir, 'tsconfig.json')
    writeFileSync(
      tsconfig,
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            jsx: 'react-jsx',
            jsxImportSource,
            strict: true,
            noEmit: true,
            // Check the generated declarations themselves, not just their use. Qwik 1.20's
            // own core.d.ts fails lib checking, so that run checks usage only; the
            // declarations are identical apart from the Qwik import.
            skipLibCheck: variant === 'qwik1',
            types: [],
            paths: { '@styled/*': [`${outdir(variant)}/*`] },
          },
          files: [join(ROOT, 'test/types/fixtures/usage.tsx')],
        },
        null,
        2,
      ),
    )
    const label = `${variant} × ${compiler}`
    try {
      execFileSync(process.execPath, [tsc, '-p', tsconfig], { stdio: 'pipe' })
      console.log(`ok   ${label}`)
    } catch (error) {
      failed++
      const output = (error as { stdout?: Buffer }).stdout?.toString() ?? String(error)
      console.error(`FAIL ${label}\n${output}`)
    }
  }
}

process.exit(failed === 0 ? 0 : 1)

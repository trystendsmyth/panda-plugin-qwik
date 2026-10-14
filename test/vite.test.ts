import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import pandacss from '@pandacss/vite'
import { build } from 'vite'
import { expect, test } from 'vitest'

import { FIXTURE, GENERATED } from './variants'

// The Panda docs recommend @pandacss/vite for Qwik; its codegen must run plugin hooks too.
test('@pandacss/vite generates the Qwik layer and extracts pattern usage', async () => {
  const root = join(GENERATED, 'vite')
  const styledSystem = join(root, 'styled-system')
  const previous = { ...process.env }
  Object.assign(process.env, { FIXTURE_TARGET: 'qwik2', FIXTURE_OUTDIR: styledSystem, FIXTURE_EXT: 'js' })

  try {
    await build({
      root: FIXTURE,
      configFile: false,
      logLevel: 'silent',
      plugins: [pandacss({ cwd: FIXTURE, configPath: join(FIXTURE, 'panda.config.ts') })],
      resolve: { alias: { '@styled': styledSystem } },
      build: {
        outDir: join(root, 'dist'),
        emptyOutDir: true,
        cssCodeSplit: false,
        lib: { entry: join(FIXTURE, 'src/vite-entry.ts'), formats: ['es'], fileName: 'entry' },
        rollupOptions: { external: [/^@qwik\.dev\//, /^@builder\.io\//] },
      },
    })
  } finally {
    process.env = previous
  }

  expect(existsSync(join(styledSystem, 'jsx/vstack.js'))).toBe(true)
  expect(readFileSync(join(styledSystem, 'jsx/render-pattern.js'), 'utf8')).toContain(`from '@qwik.dev/core'`)

  const cssFile = readdirSync(join(root, 'dist')).find((file) => file.endsWith('.css'))
  expect(cssFile).toBeDefined()
  const css = readFileSync(join(root, 'dist', cssFile!), 'utf8')
  // Classes only produced by JSX style props in usage.tsx.
  for (const className of ['gap_8', 'mt_4', 'hover\\:bg_red\\.500', 'ls_wide']) {
    expect(css).toContain(`.${className}`)
  }
})

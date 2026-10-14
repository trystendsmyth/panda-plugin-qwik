import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { cssFile, outdir, type VariantId } from './variants'

const read = (id: VariantId, path: string) => readFileSync(join(outdir(id), path), 'utf8')
const propSet = (id: VariantId) => /new Set(?:<string>)?\((\[.*?\])\)/s.exec(read(id, 'jsx/is-valid-prop.js'))?.[1]

describe('CSS parity with the React target', () => {
  test.each([
    ['qwik2', 'react'],
    ['qwik1', 'react'],
    ['qwik2-minimal', 'react-minimal'],
    ['qwik2-none', 'react-none'],
  ] as const)('%s emits the same CSS as %s', (qwik, react) => {
    const css = readFileSync(cssFile(qwik), 'utf8')
    expect(css.length).toBeGreaterThan(1000)
    expect(css).toBe(readFileSync(cssFile(react), 'utf8'))
  })
})

describe('is-valid-prop', () => {
  test('lists exactly the style props React would', () => {
    expect(propSet('qwik2')).toBe(propSet('react'))
  })

  test.each([
    ['qwik2-minimal', 'react-minimal'],
    ['qwik2-none', 'react-none'],
  ] as const)('%s matches %s', (qwik, react) => {
    expect(propSet(qwik)).toBe(propSet(react))
    expect(propSet(qwik)).toBe('["css"]')
  })
})

describe('generated files', () => {
  test('one component per pattern, including patterns.extend', () => {
    const react = readdirSync(join(outdir('react'), 'jsx')).filter((file) => file.endsWith('.js'))
    const qwik = readdirSync(join(outdir('qwik2'), 'jsx')).filter((file) => file.endsWith('.js'))
    const patternFiles = (files: string[]) =>
      files.filter((file) => !/^(factory|helper|index|is-valid-prop|render-pattern|create-.*)\.js$/.test(file))
    expect(patternFiles(qwik)).toEqual(patternFiles(react))
    expect(qwik).toContain('section.js')
  })

  test('no styled factory or recipe contexts', () => {
    const files = readdirSync(join(outdir('qwik2'), 'jsx'))
    expect(files.some((file) => /^(factory|create-recipe-context|create-slot-recipe-context)\./.test(file))).toBe(false)
  })

  test('types/index re-exports the Qwik jsx types', () => {
    expect(read('qwik2', 'types/index.d.ts')).toContain(`export * from './jsx';`)
    expect(read('qwik2', 'types/jsx.d.ts')).toContain(`from '@qwik.dev/core'`)
    expect(read('qwik1', 'types/jsx.d.ts')).toContain(`from '@builder.io/qwik'`)
  })

  test('imports the selected Qwik package', () => {
    expect(read('qwik2', 'jsx/render-pattern.js')).toContain(`import { jsx } from '@qwik.dev/core';`)
    expect(read('qwik1', 'jsx/render-pattern.js')).toContain(`import { jsx } from '@builder.io/qwik';`)
  })

  test('minimal mode merges pattern styles into the css prop like React', () => {
    expect(read('qwik2-minimal', 'jsx/vstack.js')).toContain('css: mergeCss(styleProps, props.css)')
    expect(read('react-minimal', 'jsx/vstack.js')).toContain('css: mergeCss(styleProps, props.css)')
  })

  test('custom pattern keeps its element, blocklist and description', () => {
    const dts = read('qwik2', 'jsx/section.d.ts')
    expect(dts).toContain(`PatternComponent<SectionProperties, 'section', "p">`)
    expect(dts).toContain('A padded page section.')
    expect(read('qwik2', 'jsx/section.js')).toContain('renderPattern("section"')
  })
})

describe('output formats', () => {
  test('outExtension: mjs', () => {
    expect(existsSync(join(outdir('qwik2-mjs'), 'jsx/vstack.mjs'))).toBe(true)
    expect(existsSync(join(outdir('qwik2-mjs'), 'jsx/vstack.d.ts'))).toBe(true)
  })

  test('outExtension: ts inlines types and emits no declarations', () => {
    const files = readdirSync(join(outdir('qwik2-ts'), 'jsx'))
    expect(files).toContain('vstack.ts')
    expect(files.some((file) => file.endsWith('.d.ts') || file.endsWith('.js'))).toBe(false)
    expect(read('qwik2-ts', 'types/index.ts')).toContain(`export type * from './jsx';`)
    expect(read('qwik2-ts', 'jsx/vstack.ts')).toContain('as PatternComponent<VstackProperties')
  })

  test('forceImportExtension matches what Panda writes for its own files', () => {
    for (const id of ['qwik2-force-ext', 'qwik2-mjs-force-ext'] as const) {
      const ext = id === 'qwik2-force-ext' ? '.js' : '.mjs'
      const pandaPattern = read(id, `patterns/vstack${ext}`)
      const ours = read(id, `jsx/vstack${ext}`)
      const helpersImport = /from '\.\.\/helpers[^']*'/.exec(pandaPattern)?.[0]
      expect(helpersImport).toBeDefined()
      expect(ours).toContain(helpersImport)
    }
  })
})

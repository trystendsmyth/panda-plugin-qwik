import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { qwik } from '../src/index'
import { fileStem, jsIdent, pascalCase } from '../src/naming'
import { collectPatterns } from '../src/patterns'
import { detectQwikModule } from '../src/qwik-module'
import { ROOT } from './variants'

describe('naming matches Panda', () => {
  test.each([
    ['vstack', 'vstack', 'Vstack', 'vstack'],
    ['gridItem', 'grid-item', 'GridItem', 'gridItem'],
    ['aspectRatio', 'aspect-ratio', 'AspectRatio', 'aspectRatio'],
    ['visually_hidden', 'visually-hidden', 'VisuallyHidden', 'visually_hidden'],
    ['2col', '2col', '2col', '_2col'],
  ])('%s', (name, stem, pascal, ident) => {
    expect(fileStem(name)).toBe(stem)
    expect(pascalCase(name)).toBe(pascal)
    expect(jsIdent(name)).toBe(ident)
  })
})

describe('collectPatterns', () => {
  test('folds in patterns.extend, sorts by key and applies defaults', () => {
    const patterns = collectPatterns({
      vstack: { jsxName: 'VStack' },
      box: {},
      extend: { card: { jsxElement: 'article', blocklist: ['p', 1], deprecated: 'Use Box' } },
    })
    expect(patterns.map((pattern) => pattern.name)).toEqual(['box', 'card', 'vstack'])
    expect(patterns[0]).toMatchObject({ jsxName: 'Box', jsxElement: 'div', blocklist: [] })
    expect(patterns[1]).toMatchObject({
      jsxName: 'Card',
      jsxElement: 'article',
      blocklist: ['p'],
      deprecated: 'Use Box',
    })
    expect(patterns[2]).toMatchObject({ jsxName: 'VStack', stem: 'vstack', fnName: 'vstack', upperName: 'Vstack' })
  })
})

describe('detectQwikModule', () => {
  test('prefers Qwik 2 when both are installed', () => {
    expect(detectQwikModule(ROOT)).toBe('@qwik.dev/core')
  })

  test('explains what to install when Qwik is missing', () => {
    expect(() => detectQwikModule(mkdtempSync(join(tmpdir(), 'no-qwik-')))).toThrow(/Install @qwik\.dev\/core/)
  })
})

describe('config:resolved', () => {
  const resolve = (config: Record<string, unknown>) => {
    const hook = qwik().hooks?.['config:resolved']
    if (typeof hook !== 'function') throw new Error('missing hook')
    const utils = { omit: (obj: object) => obj, pick: (obj: object) => obj, traverse: () => {} }
    return hook({ config, path: join(ROOT, 'panda.config.ts'), dependencies: [], utils } as never)
  }

  test('rejects another JSX framework', () => {
    expect(() => resolve({ jsxFramework: 'react' })).toThrow(/set jsxFramework: 'qwik'/)
  })

  test("defaults jsxFramework to 'qwik' so extraction stays on", () => {
    expect(resolve({})).toMatchObject({ jsxFramework: 'qwik' })
  })

  test('leaves an explicit qwik config untouched', () => {
    expect(resolve({ jsxFramework: 'qwik' })).toBeUndefined()
  })
})

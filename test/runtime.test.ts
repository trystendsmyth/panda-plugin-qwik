import { describe, expect, test } from 'vitest'

import { renderQwik, renderReact } from './render'
import type { VariantId } from './variants'

type Case = [name: string, component: string, props: Record<string, unknown>]

// Rendered by Panda's React pattern components and by ours; class strings and
// attributes must match.
const CASES: Case[] = [
  [
    'pattern props + style props + conditions',
    'VStack',
    { gap: '8', mt: '4', _hover: { bg: 'red.500' }, md: { px: '6' } },
  ],
  ['pattern prop aliases', 'HStack', { gap: '2', justify: 'space-between', color: 'blue.700' }],
  ['responsive pattern prop', 'Stack', { direction: { base: 'column', lg: 'row' }, align: 'center', p: '3' }],
  ['as + css prop', 'Box', { as: 'span', fontWeight: 'semibold', css: { letterSpacing: 'wide' } }],
  ['css prop array', 'Box', { css: [{ color: 'red.500' }, { color: 'blue.500', p: '2' }] }],
  ['style prop overrides a pattern default', 'VStack', { gap: '4', flexDirection: 'row' }],
  ['html* props map to attributes', 'Center', { w: '10', htmlWidth: '40', htmlHeight: '20' }],
  [
    'element attributes pass through',
    'Flex',
    { id: 'main', role: 'region', 'aria-label': 'Main', 'data-state': 'open' },
  ],
  ['undefined props are skipped', 'Grid', { columns: 3, gap: undefined, mt: undefined }],
  ['grid item', 'GridItem', { colSpan: 2, rounded: 'md' }],
  ['custom pattern with a non-div element', 'Section', { inset: '6', bg: 'gray.50' }],
  ['pattern with no props', 'VisuallyHidden', {}],
  ['box with nothing', 'Box', {}],
]

const parity = (qwik: VariantId, react: VariantId, cases: Case[]) =>
  test.each(cases)('%s', async (_name, component, props) => {
    const [ours, theirs] = await Promise.all([renderQwik(qwik, component, props), renderReact(react, component, props)])
    expect(ours.tag).toBe(theirs.tag)
    expect(ours.attrs).toEqual(theirs.attrs)
    expect(ours.html).toContain('content')
    if (Object.keys(props).length > 0) expect(ours.classes.length).toBeGreaterThan(0)
  })

describe('rendered output', () => {
  test('VStack renders its base styles, style props and conditions as atomic classes', async () => {
    const ours = await renderQwik('qwik2', 'VStack', { gap: '8', mt: '4', _hover: { bg: 'red.500' }, as: 'ul' })
    expect(ours.tag).toBe('ul')
    expect(ours.classes).toEqual(
      expect.arrayContaining(['d_flex', 'flex-d_column', 'ai_center', 'gap_8', 'mt_4', 'hover:bg_red.500']),
    )
  })
})

describe('runtime parity with React: Qwik 2', () => parity('qwik2', 'react', CASES))
describe('runtime parity with React: Qwik 1', () => parity('qwik1', 'react', CASES))

describe('runtime parity with React: jsxStyleProps minimal', () =>
  parity('qwik2-minimal', 'react-minimal', [
    ['pattern props + css prop', 'VStack', { gap: '4', css: { mt: '2', _hover: { color: 'red.500' } } }],
    ['style props are not extracted, only css', 'HStack', { gap: '2', css: { p: '1' } }],
  ]))

describe('runtime parity with React: jsxStyleProps none', () =>
  parity('qwik2-none', 'react-none', [['pattern props only', 'VStack', { gap: '4', justify: 'center' }]]))

describe('class merging', () => {
  test('class joins the generated classes like React className', async () => {
    const ours = await renderQwik('qwik2', 'VStack', { gap: '4', class: 'extra' })
    const theirs = await renderReact('react', 'VStack', { gap: '4', className: 'extra' })
    expect(ours.classes).toEqual(theirs.classes)
  })

  test("accepts Qwik's ClassList (arrays and objects)", async () => {
    const base = await renderQwik('qwik2', 'Box', { p: '2' })
    const ours = await renderQwik('qwik2', 'Box', { p: '2', class: ['a', false, { b: true, c: false }, ['d']] })
    expect(ours.classes).toEqual([...base.classes, 'a', 'b', 'd'])
  })

  test('reads a signal passed as class', async () => {
    const { createSignal } = await import('@qwik.dev/core')
    const base = await renderQwik('qwik2', 'Box', { p: '2' })
    const ours = await renderQwik('qwik2', 'Box', { p: '2', class: createSignal('from-signal') })
    expect(ours.classes).toEqual([...base.classes, 'from-signal'])
  })

  test('class and className both apply', async () => {
    const ours = await renderQwik('qwik1', 'Box', { class: 'one', className: 'two' })
    expect(ours.classes).toEqual(['one', 'two'])
  })
})

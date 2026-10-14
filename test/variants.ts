import { fileURLToPath } from 'node:url'

export const ROOT = fileURLToPath(new URL('..', import.meta.url))
export const FIXTURE = fileURLToPath(new URL('./fixture', import.meta.url))
export const GENERATED = fileURLToPath(new URL('./.generated', import.meta.url))

export interface Variant {
  id: string
  target: 'react' | 'qwik1' | 'qwik2'
  ext: 'js' | 'mjs' | 'ts'
  styleProps: 'all' | 'minimal' | 'none'
  forceExt: boolean
}

const variant = (id: string, overrides: Partial<Variant>): Variant => ({
  id,
  target: 'qwik2',
  ext: 'js',
  styleProps: 'all',
  forceExt: false,
  ...overrides,
})

export const VARIANTS = [
  variant('react', { target: 'react' }),
  variant('react-minimal', { target: 'react', styleProps: 'minimal' }),
  variant('react-none', { target: 'react', styleProps: 'none' }),
  variant('qwik2', {}),
  variant('qwik1', { target: 'qwik1' }),
  variant('qwik2-minimal', { styleProps: 'minimal' }),
  variant('qwik2-none', { styleProps: 'none' }),
  variant('qwik2-mjs', { ext: 'mjs' }),
  variant('qwik2-ts', { ext: 'ts' }),
  variant('qwik2-force-ext', { forceExt: true }),
  variant('qwik2-mjs-force-ext', { ext: 'mjs', forceExt: true }),
] as const satisfies readonly Variant[]

export type VariantId = (typeof VARIANTS)[number]['id']

export const outdir = (id: VariantId) => `${GENERATED}/${id}`
export const cssFile = (id: VariantId) => `${GENERATED}/${id}.css`

import { defineConfig, definePattern } from '@pandacss/dev'

import { qwik } from '../../src/index'

// One config, parameterised by env so the test setup can generate every variant.
const target = process.env.FIXTURE_TARGET ?? 'qwik2'
const outExtension = (process.env.FIXTURE_EXT ?? 'js') as 'js' | 'mjs' | 'ts'
const jsxStyleProps = (process.env.FIXTURE_STYLE_PROPS ?? 'all') as 'all' | 'minimal' | 'none'
const forceImportExtension = process.env.FIXTURE_FORCE_EXT === '1'

const plugins = target === 'react' ? [] : [qwik({ qwik: target === 'qwik1' ? '@builder.io/qwik' : '@qwik.dev/core' })]

export default defineConfig({
  presets: ['@pandacss/preset-base', '@pandacss/preset-panda'],
  include: ['./src/**/*.tsx'],
  preflight: false,
  importMap: '@styled',
  jsxFramework: target === 'react' ? 'react' : 'qwik',
  jsxStyleProps,
  outExtension,
  forceImportExtension,
  outdir: process.env.FIXTURE_OUTDIR ?? `../.generated/${target}`,
  patterns: {
    extend: {
      // A custom pattern with a blocklist and a non-div element.
      section: definePattern({
        jsxName: 'Section',
        jsxElement: 'section',
        description: 'A padded page section.',
        properties: { inset: { type: 'property', value: 'padding' } },
        blocklist: ['p'],
        transform(props) {
          const { inset, ...rest } = props
          return { display: 'block', padding: inset, ...rest }
        },
      }),
    },
  },
  plugins,
})

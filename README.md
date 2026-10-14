# panda-plugin-qwik

Qwik pattern components for [Panda CSS](https://panda-css.com) v2.

```tsx
import { VStack, HStack, Box } from 'styled-system/jsx'

export const Card = component$(() => (
  <VStack gap="4" p="6" bg="bg.subtle" _hover={{ shadow: 'md' }}>
    <HStack justify="space-between">
      <Box as="h3" fontWeight="semibold">
        Title
      </Box>
    </HStack>
  </VStack>
))
```

Panda v2 removed Qwik JSX generation: `jsxFramework: 'qwik'` no longer produces `Box`, `Stack`, `VStack` or any
other pattern component. This plugin generates them again, on top of Panda v2's compiler and plugin API, with the
same style props Panda's React pattern components accept.

## Built on Panda v2, not around it

The plugin doesn't fork, wrap or shim the old v1 pipeline. Every part of it uses the v2 infrastructure as designed:

- **Panda's compiler does the extraction.** In v2, `jsxFramework: 'qwik'` still switches on JSX style-prop
  extraction in the Oxc-based compiler. The plugin never parses your source. For the same JSX, the CSS Panda emits
  is byte-identical to what it emits for the React target.
- **Panda's plugin API does the generation.** `config:resolved` reads your patterns. `codegen:prepare` fills the
  `jsx/*` artifact slots Panda leaves empty for frameworks it doesn't generate for. It runs wherever Panda runs
  codegen; the test suite covers `panda codegen` and `@pandacss/vite`.
- **Components wrap Panda's own pattern functions.** Panda v2 generates `styled-system/patterns/*` for every
  framework. Each Qwik component calls that pattern's `.raw()` and `.propKeys`, so pattern behaviour lives in one
  place: your config.
- **The style-prop list comes from Panda's output.** `isCssProperty` is built from the generated `types/system`
  module, so utilities, shorthands, breakpoints and container conditions always match your config.

It respects `outExtension`, `forceImportExtension`, `jsxStyleProps`, `importMap`, `patterns.extend`, and each
pattern's `jsxName`, `jsxElement` and `blocklist`.

## What it brings back

Recipes and slot recipes are plain class-name functions in `styled-system/recipes`, and they work in Qwik as they
are: `class={button({ size: 'sm' })}`. What v2 took away is the JSX pattern layer: components that carry a pattern's
base styles and take everything else as props. That layer is what this plugin restores.

| Restored                                                                     | Not restored, on purpose                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------- |
| Every pattern component: built-in, from presets, and your own                | The `styled` factory (`styled.div`)               |
| All style props, conditions and responsive values (`mt`, `_hover`, `md={…}`) | `styled(el, recipe)` and cva-config components    |
| `as`, `css` and `class` props                                                | `createRecipeContext` / `createSlotRecipeContext` |
| The `styled-system/jsx` import path                                          |                                                   |
| `HTMLStyledProps`, `<Name>Props` types, `isCssProperty`, `splitCssProps`     |                                                   |

### Backwards compatibility for JSX-pattern codebases

If your Qwik app was built on Panda v1's `<Box>` / `<Stack>` / `<VStack>` components, the code that uses them works
unchanged once you upgrade to v2 and add the plugin. Upgrading doesn't mean rewriting every layout as
`class={vstack({ … })}`. Pattern props and style props behave the way they do in React, so a design system shared
between React and Qwik apps keeps one mental model for layout.

Migrating from Panda v1's Qwik target:

1. Upgrade Panda by following the [v2 upgrade guide](https://panda-css.com/docs/get-started/upgrading-to-v2)
   (ESM config, explicit presets).
2. Install this plugin and add it to `plugins`. Keep `jsxFramework: 'qwik'`.
3. Run `panda codegen --clean` once.
4. Replace any `styled.<el>` usage with `<Box as="el">` plus style props, and any `styled(el, recipe)` with
   `class={recipe(…)}`.

## Install

```bash
pnpm add -D panda-plugin-qwik
```

Requires `@pandacss/dev` 2.2 or later and Qwik 1.20+ (`@builder.io/qwik`) or Qwik 2 (`@qwik.dev/core`).

## Usage

```ts
// panda.config.ts
import { defineConfig } from '@pandacss/dev'
import { qwik } from 'panda-plugin-qwik'

export default defineConfig({
  presets: ['@pandacss/preset-base', '@pandacss/preset-panda'],
  include: ['./src/**/*.{ts,tsx}'],
  jsxFramework: 'qwik',
  plugins: [qwik()],
  outdir: 'styled-system',
})
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import pandacss from '@pandacss/vite'
import { qwikVite } from '@qwik.dev/core/optimizer'

export default defineConfig({
  plugins: [pandacss(), qwikVite()],
})
```

The components are Qwik [inline components](https://qwik.dev/docs/components/overview/#inline-components): plain
functions that render during their parent's render. There is no `component$` boundary and nothing extra to serialize
or lazy-load.

### Options

| Option | Default       | Description                                                                                                         |
| ------ | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `qwik` | auto-detected | `'@qwik.dev/core'` or `'@builder.io/qwik'`. Detection checks your project and prefers Qwik 2 if both are installed. |

If `jsxFramework` is unset, the plugin sets it to `'qwik'`. If it's set to anything else, the plugin throws.

## Improvements over v1's Qwik output

- **Patterns render directly.** v1 sent every pattern through the `styled` factory (a Proxy, an empty cva, and a
  five-way prop split). Here a pattern does one prop split, one `css()` call and one `jsx()` call.
- **`class` takes Qwik's `ClassList`.** Arrays, objects (`{ active: isOn }`) and signals merge with the generated
  classes. v1 kept only plain strings.
- **`as` re-types the element.** `<VStack as="ul">` accepts `<ul>` attributes, and `<Box as="a" href="…">`
  type-checks.
- **`jsxStyleProps: 'none'` works.** v1's Qwik patterns referenced an undefined `ref` in that mode and threw at
  render.

## How faithfulness is checked

The test suite builds a React and a Qwik `styled-system` from the same config and source, then requires:

- byte-identical CSS for `jsxStyleProps` `all`, `minimal` and `none`
- an identical style-prop list to the one Panda generates for React
- identical rendered tags, classes and attributes for every case, through Qwik 1 and Qwik 2 SSR, against
  `react-dom/server`
- generated declarations that type-check under TypeScript 5.9 and 6.0, including `as` re-typing and blocklists
- the same output through `@pandacss/vite`

A scheduled CI job runs the suite against the latest `@pandacss/dev` release.

## Limitations

- A signal passed to `class` is read when the component renders, so a change re-renders through the parent rather
  than patching the attribute in place.
- Panda's opt-in source transforms (`transform: true`) write `className` for frameworks Panda doesn't generate for.
  Qwik accepts `className`, but that combination isn't part of the tested surface.
- Extraction depends on Panda v2 enabling JSX extraction for any `jsxFramework` value. The CSS parity tests cover this
  for every Panda release the plugin supports.

## Compatibility

| Package         | Versions                       |
| --------------- | ------------------------------ |
| `@pandacss/dev` | `>=2.2.0 <3`                   |
| Qwik            | 1.20+, 2.0 (release candidate) |
| Node.js         | 22+                            |
| TypeScript      | 5.9+                           |

## License

[MIT](./LICENSE). The generated pattern components and `is-valid-prop` module follow the shape of Panda CSS's own
generated code (MIT, © Segun Adebayo).

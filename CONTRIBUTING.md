# Contributing

## Setup

```bash
nvm use
corepack enable
pnpm install
```

## Checks

`pnpm verify` runs everything CI runs: formatting, lint, type-check, tests, declaration type tests, and the package
export checks.

| Script               | What it does                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm test`          | Generates every fixture variant with `panda codegen`/`cssgen`, then runs the Vitest suite.     |
| `pnpm test:types`    | Type-checks `test/types/fixtures/usage.tsx` against the generated declarations (TS 5.9 + 6.0). |
| `pnpm check-exports` | Builds, then runs `publint` and `attw`, and loads the built plugin.                            |

## How the tests work

`test/fixture/panda.config.ts` is one config, parameterised by environment variables. `test/global-setup.ts`
generates a `styled-system` for each entry in `test/variants.ts` under `test/.generated/`: a React baseline and Qwik
variants for each output format and `jsxStyleProps` mode.

- `codegen.test.ts` compares generated CSS and the style-prop list against the React baseline.
- `runtime.test.ts` renders the same props through Qwik SSR and `react-dom/server` and compares the output.
- `vite.test.ts` builds through `@pandacss/vite`.

A change that alters generated CSS or rendered classes relative to the React target is a bug, unless Panda's React
output changed the same way.

## Releases

Add a changeset (`pnpm changeset`) to any PR that changes published behaviour. Merging the release PR that the
Changesets action opens publishes to npm with provenance.

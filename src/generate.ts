import type { CodegenPrepareArtifact, CodegenPrepareFile } from '@pandacss/types'

import {
  indexModule,
  isValidPropModule,
  jsxTypesModule,
  patternModule,
  renderPatternModule,
  type ModuleSource,
} from './templates'
import type { GenerateOptions, OutputFormat } from './types'

const PREFIX = '[panda-plugin-qwik]'

// Artifact slots Panda already emits (empty) when `jsxFramework` is not one it generates for.
const SLOT = {
  isValidProp: 'jsx-is-valid-prop',
  helper: 'jsx-helper',
  patterns: 'jsx-patterns',
  index: 'jsx-index',
  types: 'types',
} as const

const DEPS = {
  base: ['outExtension', 'forceImportExtension', 'jsxFramework'],
  isValidProp: ['conditions', 'utilities', 'jsxStyleProps'],
  patterns: ['patterns', 'jsxStyleProps'],
}

const findFile = (artifacts: CodegenPrepareArtifact[], predicate: (path: string) => boolean) => {
  for (const artifact of artifacts) {
    for (const file of artifact.files) if (predicate(file.path)) return file
  }
  return undefined
}

const isDeclaration = (path: string) => /\.d\.m?ts$/.test(path)

/** Reads `outExtension` / `forceImportExtension` back off the files Panda generated. */
export function detectFormat(artifacts: CodegenPrepareArtifact[]): OutputFormat {
  const patternFiles = artifacts.find((artifact) => artifact.id === 'patterns')?.files ?? []
  const isPatternModule = (path: string) => !/^patterns\/(runtime|index)\./.test(path)
  const runtime = patternFiles.find((file) => isPatternModule(file.path) && !isDeclaration(file.path))
  const declaration = patternFiles.find((file) => isPatternModule(file.path) && isDeclaration(file.path))
  if (!runtime) throw new Error(`${PREFIX} Panda generated no pattern files; nothing to build components from.`)

  const js = runtime.path.endsWith('.mjs') ? '.mjs' : runtime.path.endsWith('.ts') ? '.ts' : '.js'
  const dts = js === '.ts' ? null : declaration?.path.endsWith('.d.mts') ? '.d.mts' : '.d.ts'
  const importExt = /from ['"]\.\.\/helpers(\.[cm]?[jt]s)?['"]/.exec(runtime.code)?.[1] ?? ''
  const typeSource = js === '.ts' ? runtime.code : (declaration?.code ?? '')
  const dtsImportExt = /from ['"]\.\.\/types\/system(\.[cm]?[jt]s)?['"]/.exec(typeSource)?.[1] ?? importExt

  return { js, dts, importExt, dtsImportExt }
}

/**
 * Collects the style-prop names Panda's React `is-valid-prop` would contain: `css`,
 * every `SystemProperties` key and every `Conditions` key from the generated
 * `types/system` module. Reading Panda's own output keeps the list exact without
 * re-deriving utilities, shorthands or breakpoint/container conditions.
 */
export function collectCssPropertyNames(artifacts: CodegenPrepareArtifact[]): string[] {
  const system = findFile(artifacts, (path) => /^types\/system\.(d\.m?ts|ts)$/.test(path))
  if (!system) throw new Error(`${PREFIX} Panda generated no types/system module; cannot derive style props.`)

  const keysOf = (name: string) => {
    const start = system.code.indexOf(`export interface ${name} {`)
    if (start === -1) throw new Error(`${PREFIX} types/system has no \`${name}\` interface.`)
    const end = system.code.indexOf('\n}', start)
    return [...system.code.slice(start, end).matchAll(/^\s+"?([^"?:\s]+)"?\??:/gm)].flatMap((match) =>
      match[1] ? [match[1]] : [],
    )
  }

  return [...new Set(['css', ...keysOf('SystemProperties'), ...keysOf('Conditions')])].sort()
}

function emit(stem: string, source: ModuleSource, format: OutputFormat, dependencies: string[]): CodegenPrepareFile[] {
  const deps = [...DEPS.base, ...dependencies]
  if (format.dts === null) return [{ path: `${stem}${format.js}`, code: source.ts, dependencies: deps }]
  return [
    { path: `${stem}${format.js}`, code: source.js, dependencies: deps },
    { path: `${stem}${format.dts}`, code: source.dts, dependencies: deps },
  ]
}

export function generateQwikArtifacts(
  artifacts: CodegenPrepareArtifact[],
  options: GenerateOptions,
): CodegenPrepareArtifact[] {
  const format = detectFormat(artifacts)
  const ctx = { format, qwikModule: options.qwikModule }

  // Only patterns Panda actually emitted (a design-system overlay can own some).
  const emitted = new Set(
    (artifacts.find((artifact) => artifact.id === 'patterns')?.files ?? []).map((file) =>
      file.path.replace(/\.(d\.m?ts|m?js|ts)$/, ''),
    ),
  )
  const patterns = options.patterns.filter((pattern) => emitted.has(`patterns/${pattern.stem}`))

  // In `minimal`/`none` mode only `css` (plus `--vars` and selectors) count as style props.
  const cssPropertyNames = options.jsxStyleProps === 'all' ? collectCssPropertyNames(artifacts) : ['css']

  const replacements = new Map<string, CodegenPrepareFile[]>([
    [SLOT.isValidProp, emit('jsx/is-valid-prop', isValidPropModule(ctx, cssPropertyNames), format, DEPS.isValidProp)],
    [SLOT.helper, emit('jsx/render-pattern', renderPatternModule(ctx), format, DEPS.patterns)],
    [
      SLOT.patterns,
      patterns.flatMap((pattern) =>
        emit(`jsx/${pattern.stem}`, patternModule(ctx, pattern, options.jsxStyleProps), format, DEPS.patterns),
      ),
    ],
    [SLOT.index, emit('jsx/index', indexModule(ctx, patterns), format, DEPS.patterns)],
  ])

  const jsxTypesPath = `types/jsx${format.dts ?? format.js}`
  const typesIndexPattern = /^types\/index\.(d\.m?ts|ts)$/
  // `outExtension: 'ts'` re-exports type modules with `export type *`; follow suit.
  const typesExport = `export ${format.dts === null ? 'type ' : ''}* from './jsx${format.dtsImportExt}';`

  const next = artifacts.map((artifact): CodegenPrepareArtifact => {
    const replacement = replacements.get(artifact.id)
    if (replacement) {
      replacements.delete(artifact.id)
      return { id: artifact.id, files: replacement }
    }
    if (artifact.id !== SLOT.types) return artifact

    const files = artifact.files
      .filter((file) => file.path !== jsxTypesPath)
      .map((file) =>
        typesIndexPattern.test(file.path) && !file.code.includes(typesExport)
          ? { ...file, code: `${file.code.trimEnd()}\n${typesExport}\n` }
          : file,
      )
    files.push({ path: jsxTypesPath, code: jsxTypesModule(ctx), dependencies: [...DEPS.base] })
    return { id: artifact.id, files }
  })

  // Slots a future Panda release stops pre-declaring still get written.
  for (const [id, files] of replacements) next.push({ id, files })
  return next
}

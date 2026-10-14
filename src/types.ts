export type QwikModule = '@qwik.dev/core' | '@builder.io/qwik'

export type JsxStyleProps = 'all' | 'minimal' | 'none'

export interface PatternInfo {
  /** Pattern key in the config, e.g. `vstack` */
  name: string
  /** Generated file stem, e.g. `grid-item` */
  stem: string
  /** Component name, e.g. `VStack` */
  jsxName: string
  /** Pattern function export, e.g. `vstack` */
  fnName: string
  /** Pascal-cased pattern name used for type names, e.g. `Vstack` */
  upperName: string
  jsxElement: string
  blocklist: string[]
  description?: string | undefined
  deprecated?: boolean | string | undefined
}

export interface OutputFormat {
  /** Extension of generated runtime files: `.js`, `.mjs` or `.ts` */
  js: '.js' | '.mjs' | '.ts'
  /** Extension of declaration files, or `null` when `outExtension: 'ts'` inlines types */
  dts: '.d.ts' | '.d.mts' | null
  /** Suffix Panda appends to relative runtime import specifiers (`forceImportExtension`) */
  importExt: string
  /** Suffix Panda appends to relative specifiers inside declaration files */
  dtsImportExt: string
}

export interface GenerateOptions {
  patterns: PatternInfo[]
  jsxStyleProps: JsxStyleProps
  qwikModule: QwikModule
}

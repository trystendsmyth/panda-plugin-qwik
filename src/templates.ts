import type { JsxStyleProps, OutputFormat, PatternInfo, QwikModule } from './types'

export interface ModuleSource {
  /** Runtime JavaScript (`.js`/`.mjs`) */
  js: string
  /** Declarations (`.d.ts`) */
  dts: string
  /** Typed source for `outExtension: 'ts'` */
  ts: string
}

interface TemplateContext {
  format: OutputFormat
  qwikModule: QwikModule
}

const q = (value: string) => JSON.stringify(value)
// Panda emits single-quoted import specifiers; keep generated files consistent with it.
const spec = (value: string) => `'${value}'`

function importPaths({ format }: TemplateContext) {
  return {
    js: (path: string) => spec(`${path}${format.importExt}`),
    dts: (path: string) => spec(`${path}${format.dtsImportExt}`),
  }
}

// --- jsx/is-valid-prop -------------------------------------------------------
// Same contract as the module Panda generates for React/Preact/Solid/Vue.

export function isValidPropModule(ctx: TemplateContext, cssPropertyNames: string[]): ModuleSource {
  const p = importPaths(ctx)
  const set = JSON.stringify(cssPropertyNames)
  const body = (typed: boolean) => `const cssPropertySet = new Set${typed ? '<string>' : ''}(${set})
const cssPropertySelectorRe = /&|@/

${typed ? 'type CssPropKey = keyof JsxStyleProps\ntype OmittedCssProps<T> = DistributiveOmit<T, CssPropKey>\n\n' : ''}export function isCssProperty(value${typed ? ': string): boolean' : ')'} {
  return cssPropertySet.has(value) || value.startsWith("--") || cssPropertySelectorRe.test(value)
}

export function splitCssProps${typed ? '<T>(props: T): [JsxStyleProps, OmittedCssProps<T>]' : '(props)'} {
  return splitProps(${typed ? 'props as Record<string, unknown>, isCssProperty) as [JsxStyleProps, OmittedCssProps<T>]' : 'props, isCssProperty)'}
}
`

  return {
    js: `import { splitProps } from ${p.js('../helpers')};

${body(false)}`,
    dts: `import type { DistributiveOmit, JsxStyleProps } from ${p.dts('../types/system')};

type CssPropKey = keyof JsxStyleProps;
type OmittedCssProps<T> = DistributiveOmit<T, CssPropKey>;
export declare function isCssProperty(value: string): boolean;
export declare function splitCssProps<T>(props: T): [JsxStyleProps, OmittedCssProps<T>];
export {};
`,
    ts: `import { splitProps } from ${p.js('../helpers')};
import type { DistributiveOmit, JsxStyleProps } from ${p.dts('../types/system')};

${body(true)}`,
  }
}

// --- jsx/render-pattern --------------------------------------------------------
// The pattern-only slice of Panda's `styled` factory: split style props from
// element props, serialize them with `css()`, render the element. No recipe,
// cva, or forwardProps machinery — patterns never use it.

export function renderPatternModule(ctx: TemplateContext): ModuleSource {
  const p = importPaths(ctx)
  const body = (typed: boolean) => {
    const t = (annotation: string) => (typed ? annotation : '')
    return `// Panda maps these back to HTML attributes because they collide with style props.
const htmlPropsMap${t(': Record<string, string>')} = {
  htmlWidth: 'width',
  htmlHeight: 'height',
  htmlTranslate: 'translate',
  htmlContent: 'content',
}
const hasOwn = Object.prototype.hasOwnProperty

// Qwik accepts a signal for \`class\`; read it so it can join the merged class list.
const unwrapClass = (value${t(': any')}) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype
    ? value.value
    : value

export function renderPattern(element${t(': any')}, props${t(': Record<string, any>')})${t(': JSXOutput')} {
  let propStyles${t(': Record<string, any> | undefined')}
  let cssStyles${t(': any')}
  const elementProps${t(': Record<string, any>')} = {}
  const keys = Object.keys(props)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]${t('!')}
    const value = props[key]
    if (value === undefined || key === 'as' || key === 'class' || key === 'className') continue
    if (hasOwn.call(htmlPropsMap, key)) elementProps[htmlPropsMap[key]${t('!')}] = value
    else if (key === 'css') cssStyles = value
    else if (isCssProperty(key)) (propStyles ||= {})[key] = value
    else elementProps[key] = value
  }

  const className = propStyles
    ? cssStyles !== undefined
      ? css(propStyles, cssStyles)
      : css(propStyles)
    : cssStyles !== undefined
      ? css(cssStyles)
      : ''
  elementProps.class =
    props.class === undefined && props.className === undefined
      ? className
      : [className, unwrapClass(props.class), unwrapClass(props.className)]

  return jsx(props.as === undefined ? element : props.as, elementProps)
}
`
  }

  return {
    js: `import { jsx } from ${spec(ctx.qwikModule)};
import { css } from ${p.js('../css/index')};
import { isCssProperty } from ${p.js('./is-valid-prop')};

${body(false)}`,
    dts: `import type { JSXOutput } from ${spec(ctx.qwikModule)};

export declare function renderPattern(element: unknown, props: Record<string, unknown>): JSXOutput;
`,
    ts: `import { jsx } from ${spec(ctx.qwikModule)};
import type { JSXOutput } from ${spec(ctx.qwikModule)};
import { css } from ${p.js('../css/index')};
import { isCssProperty } from ${p.js('./is-valid-prop')};

${body(true)}`,
  }
}

// --- jsx/<pattern> ---------------------------------------------------------------

function jsDoc(pattern: PatternInfo): string {
  const lines: string[] = []
  if (pattern.description) lines.push(...pattern.description.split('\n'))
  if (pattern.deprecated) {
    lines.push(typeof pattern.deprecated === 'string' ? `@deprecated ${pattern.deprecated}` : '@deprecated')
  }
  if (lines.length === 0) return ''
  return `/**\n${lines.map((line) => ` * ${line}`.trimEnd()).join('\n')}\n */\n`
}

// Mirrors how Panda's React pattern components hand props to the factory, per `jsxStyleProps`.
function mergedPropsExpression(mode: JsxStyleProps): string {
  switch (mode) {
    case 'minimal':
      return '{ ...restProps, css: mergeCss(styleProps, props.css) }'
    case 'none':
      return '{ ...restProps, css: styleProps }'
    default:
      return '{ ...styleProps, ...restProps }'
  }
}

export function patternModule(ctx: TemplateContext, pattern: PatternInfo, mode: JsxStyleProps): ModuleSource {
  const p = importPaths(ctx)
  const { stem, fnName, jsxName, upperName, jsxElement, blocklist } = pattern
  const propertiesName = `${upperName}Properties`
  const propsName = `${upperName}Props`
  const omitted = blocklist.length > 0 ? blocklist.map(q).join(' | ') : ''
  const omitKeys = [`keyof ${propertiesName}`, ...blocklist.map(q)].join(' | ')
  const componentType = `PatternComponent<${propertiesName}, ${spec(jsxElement)}${omitted ? `, ${omitted}` : ''}>`
  const doc = jsDoc(pattern)

  const runtimeImports = [
    `import { ${fnName} } from ${p.js(`../patterns/${stem}`)};`,
    `import { splitProps } from ${p.js('../helpers')};`,
    `import { renderPattern } from ${p.js('./render-pattern')};`,
    ...(mode === 'minimal' ? [`import { mergeCss } from ${p.js('../css/css')};`] : []),
  ].join('\n')

  const typeImports = [
    `import type { ${propertiesName} } from ${p.dts(`../patterns/${stem}`)};`,
    `import type { HTMLStyledProps, PatternComponent } from ${p.dts('../types/jsx')};`,
    `import type { DistributiveOmit } from ${p.dts('../types/system')};`,
  ].join('\n')

  const propsInterface = `export interface ${propsName} extends ${propertiesName}, DistributiveOmit<HTMLStyledProps<${spec(jsxElement)}>, ${omitKeys}> {}`

  const fnBody = (typed: boolean) => `(props${typed ? ': any' : ''}) {
  const [patternProps, restProps] = splitProps(props, ${fnName}.propKeys)
  const styleProps = ${fnName}.raw(patternProps)
  return renderPattern(${q(jsxElement)}, ${mergedPropsExpression(mode)})
}`

  return {
    js: `${runtimeImports}

${doc}export function ${jsxName}${fnBody(false)}
`,
    dts: `${typeImports}

${propsInterface}

${doc}export declare const ${jsxName}: ${componentType};
`,
    ts: `${runtimeImports}
${typeImports}

${propsInterface}

${doc}export const ${jsxName} = function ${jsxName}${fnBody(true)} as ${componentType}
`,
  }
}

// --- jsx/index ---------------------------------------------------------------------

const PUBLIC_TYPES = [
  'AsProps',
  'ComponentProps',
  'DataAttrs',
  'ElementType',
  'HTMLStyledProps',
  'PatternComponent',
  'PatternProps',
]

export function indexModule(ctx: TemplateContext, patterns: PatternInfo[]): ModuleSource {
  const p = importPaths(ctx)
  const stars = (spec: (path: string) => string) =>
    ['./is-valid-prop', ...patterns.map((pattern) => `./${pattern.stem}`)]
      .map((path) => `export * from ${spec(path)};`)
      .join('\n')
  const typeExport = `export type { ${PUBLIC_TYPES.join(', ')} } from ${p.dts('../types/jsx')};`

  return {
    js: `${stars(p.js)}\n`,
    dts: `${stars(p.dts)}\n${typeExport}\n`,
    ts: `${stars(p.js)}\n${typeExport}\n`,
  }
}

// --- types/jsx -----------------------------------------------------------------------

export function jsxTypesModule(ctx: TemplateContext): string {
  const p = importPaths(ctx)
  return `import type { FunctionComponent, JSXOutput, QwikIntrinsicElements } from ${spec(ctx.qwikModule)};
import type { DistributiveOmit, JsxHTMLProps, JsxStyleProps } from ${p.dts('./system')};

export type ElementType = keyof QwikIntrinsicElements | FunctionComponent<any>

export type ComponentProps<T extends ElementType> = T extends keyof QwikIntrinsicElements
  ? QwikIntrinsicElements[T]
  : T extends FunctionComponent<infer Props>
    ? Props
    : {}

export type DataAttrs = Record<\`data-\${string}\`, unknown>

export interface AsProps<T extends ElementType = ElementType> {
  as?: T | undefined
}

export type HTMLStyledProps<T extends ElementType> = JsxHTMLProps<ComponentProps<T> & AsProps<T>, JsxStyleProps>

/** Props of a pattern component rendered as \`T\`: the pattern's own props, then style props, then \`T\`'s attributes. */
// \`AsProps<T>\` stays outside the omit so TypeScript can infer \`T\` from \`as\`.
export type PatternProps<P, T extends ElementType, Omitted extends PropertyKey = never> = P &
  AsProps<T> &
  DistributiveOmit<HTMLStyledProps<T>, keyof P | Omitted | 'as'>

/** A pattern component. \`as\` re-types the element attributes, e.g. \`<VStack as="ul">\` accepts \`<ul>\` attributes. */
export interface PatternComponent<P, D extends ElementType, Omitted extends PropertyKey = never> {
  <T extends ElementType = D>(
    props: PatternProps<P, T, Omitted>,
    key?: string | null,
    flags?: number,
    dev?: unknown,
  ): JSXOutput
}
`
}

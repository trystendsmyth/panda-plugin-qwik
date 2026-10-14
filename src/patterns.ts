import { fileStem, jsIdent, pascalCase } from './naming'
import type { PatternInfo } from './types'

interface PatternConfigLike {
  jsxName?: unknown
  jsxElement?: unknown
  blocklist?: unknown
  description?: unknown
  deprecated?: unknown
}

const DEFAULT_JSX_ELEMENT = 'div'

/** Reads the merged `patterns` map from a resolved config, folding in `patterns.extend`. */
export function collectPatterns(patterns: Record<string, unknown> | undefined): PatternInfo[] {
  const merged: Record<string, PatternConfigLike> = {}
  for (const [name, value] of Object.entries(patterns ?? {})) {
    if (name === 'extend') continue
    if (value && typeof value === 'object') merged[name] = value as PatternConfigLike
  }
  const extend = patterns?.extend
  if (extend && typeof extend === 'object') {
    for (const [name, value] of Object.entries(extend)) {
      if (value && typeof value === 'object') merged[name] = value as PatternConfigLike
    }
  }

  // Panda iterates patterns in key order (a BTreeMap); match it so `jsx/index` is stable.
  return Object.entries(merged)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, config]) => {
      return {
        name,
        stem: fileStem(name),
        jsxName: typeof config.jsxName === 'string' ? config.jsxName : pascalCase(name),
        fnName: jsIdent(name),
        upperName: pascalCase(name),
        jsxElement: typeof config.jsxElement === 'string' ? config.jsxElement : DEFAULT_JSX_ELEMENT,
        blocklist: Array.isArray(config.blocklist)
          ? config.blocklist.filter((key): key is string => typeof key === 'string')
          : [],
        description: typeof config.description === 'string' ? config.description : undefined,
        deprecated:
          typeof config.deprecated === 'boolean' || typeof config.deprecated === 'string'
            ? config.deprecated
            : undefined,
      }
    })
}

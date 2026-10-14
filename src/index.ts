import { dirname } from 'node:path'

import { definePlugin } from '@pandacss/dev'

import { generateQwikArtifacts } from './generate'
import { collectPatterns } from './patterns'
import { detectQwikModule } from './qwik-module'
import type { JsxStyleProps, PatternInfo, QwikModule } from './types'

export type { QwikModule } from './types'

export interface QwikPluginOptions {
  /**
   * Package the generated components import Qwik from. Detected from the project
   * when omitted, preferring Qwik 2 (`@qwik.dev/core`) over Qwik 1 (`@builder.io/qwik`).
   */
  qwik?: QwikModule
}

interface ResolvedState {
  patterns: PatternInfo[]
  jsxStyleProps: JsxStyleProps
  configDir: string
}

const NAME = 'panda-plugin-qwik'

/**
 * Generates Qwik pattern components (`Box`, `Stack`, `VStack`, `HStack`, …) into
 * `styled-system/jsx`, with the same style props Panda's React pattern components accept.
 *
 * Requires `jsxFramework: 'qwik'`, which keeps Panda v2's JSX style-prop extraction on.
 */
export function qwik(options: QwikPluginOptions = {}): ReturnType<typeof definePlugin> {
  let state: ResolvedState | undefined

  return definePlugin({
    name: NAME,
    hooks: {
      'config:resolved': ({ config, path }) => {
        const { jsxFramework } = config
        if (jsxFramework !== undefined && jsxFramework !== 'qwik') {
          throw new Error(
            `[${NAME}] jsxFramework is '${jsxFramework}'. This plugin generates the Qwik JSX layer; set jsxFramework: 'qwik'.`,
          )
        }
        state = {
          patterns: collectPatterns(config.patterns as Record<string, unknown> | undefined),
          jsxStyleProps: (config.jsxStyleProps as JsxStyleProps | undefined) ?? 'all',
          configDir: dirname(path),
        }
        return jsxFramework === 'qwik' ? undefined : { ...config, jsxFramework: 'qwik' }
      },
      'codegen:prepare': ({ artifacts, cwd }) => {
        if (!state) return undefined
        return generateQwikArtifacts(artifacts, {
          patterns: state.patterns,
          jsxStyleProps: state.jsxStyleProps,
          qwikModule: options.qwik ?? detectQwikModule(cwd ?? state.configDir),
        })
      },
    },
  })
}

export default qwik

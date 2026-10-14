import { join } from 'node:path'

import { outdir, type VariantId } from './variants'

type Props = Record<string, unknown>
type Attrs = Record<string, string>

export interface Rendered {
  tag: string
  attrs: Attrs
  classes: string[]
  html: string
}

const SUBJECT = 'subject'

/** Finds the element tagged `data-testid="subject"` and parses its attributes. */
export function parseSubject(html: string): Rendered {
  const tagRe = /<([a-z][a-z0-9-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*\/?>/gi
  for (const match of html.matchAll(tagRe)) {
    const attrs: Attrs = {}
    for (const attr of match[2]!.matchAll(/\s+([^\s=>/]+)(?:="([^"]*)")?/g)) attrs[attr[1]!] = attr[2] ?? ''
    if (attrs['data-testid'] !== SUBJECT) continue
    // Drop Qwik's container/serialization attributes (`q:key`, `:`, `on:click`, …), and an
    // empty `class`, which React writes and Qwik omits.
    const visible = Object.fromEntries(
      Object.entries(attrs).filter(([key, value]) => !key.includes(':') && !(key === 'class' && value === '')),
    )
    return {
      tag: match[1]!,
      attrs: visible,
      classes: (visible.class ?? '').split(/\s+/).filter(Boolean),
      html,
    }
  }
  throw new Error(`No subject element in:\n${html}`)
}

const load = async (id: VariantId) => import(join(outdir(id), 'jsx/index.js'))

export async function renderReact(id: VariantId, component: string, props: Props, children = 'content') {
  const [{ createElement }, { renderToStaticMarkup }, mod] = await Promise.all([
    import('react'),
    import('react-dom/server'),
    load(id),
  ])
  return parseSubject(
    renderToStaticMarkup(createElement(mod[component], { ...props, 'data-testid': SUBJECT }, children)),
  )
}

export async function renderQwik(id: VariantId, component: string, props: Props, children = 'content') {
  const qwikModule = id === 'qwik1' ? '@builder.io/qwik' : '@qwik.dev/core'
  const [{ jsx }, { renderToString }, mod] = await Promise.all([
    import(/* @vite-ignore */ qwikModule),
    import(/* @vite-ignore */ `${qwikModule}/server`),
    load(id),
  ])
  // Normally injected by the Qwik Vite plugin; inline components need no symbols.
  const globals = globalThis as { __QWIK_MANIFEST__?: unknown }
  globals.__QWIK_MANIFEST__ ??= { mapping: {} }
  const node = jsx(mod[component], { ...props, 'data-testid': SUBJECT, children })
  const { html } = await renderToString(node, {
    containerTagName: 'div',
    qwikLoader: { include: 'never' },
    manifest: { mapping: {} },
  })
  return parseSubject(html)
}

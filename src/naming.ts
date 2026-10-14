// Ports of Panda's `pandacss_shared::strings` helpers, so generated file and
// type names match what Panda emits for the React/Preact/Solid/Vue targets.

const isAlnum = (ch: string) => /[A-Za-z0-9]/.test(ch)
const isUpper = (ch: string) => /[A-Z]/.test(ch)

export function pascalCase(value: string): string {
  let out = ''
  let uppercase = true
  for (const ch of value) {
    if (isAlnum(ch)) {
      out += uppercase ? ch.toUpperCase() : ch
      uppercase = false
    } else {
      uppercase = true
    }
  }
  return out
}

export function jsIdent(value: string): string {
  let out = ''
  ;[...value].forEach((ch, index) => {
    if (isAlnum(ch) || ch === '_' || ch === '$') {
      if (index === 0 && /[0-9]/.test(ch)) out += '_'
      out += ch
    } else {
      out += '_'
    }
  })
  return out === '' ? '_' : out
}

export function fileStem(value: string): string {
  let out = ''
  let prevDash = false
  for (const ch of value) {
    if (isUpper(ch)) {
      if (out !== '' && !prevDash) out += '-'
      out += ch.toLowerCase()
      prevDash = false
    } else if (isAlnum(ch)) {
      out += ch
      prevDash = false
    } else if (!prevDash && out !== '') {
      out += '-'
      prevDash = true
    }
  }
  if (out.endsWith('-')) out = out.slice(0, -1)
  return out === '' ? '_' : out
}

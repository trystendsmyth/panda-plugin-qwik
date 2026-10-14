// Loads the built package the way a consumer's panda.config would.
import { qwik } from '../dist/index.js'

const plugin = qwik()
const hooks = Object.keys(plugin.hooks ?? {})
for (const hook of ['config:resolved', 'codegen:prepare']) {
  if (!hooks.includes(hook)) {
    console.error(`dist plugin is missing the ${hook} hook`)
    process.exit(1)
  }
}
console.log(`ok   dist exports ${plugin.name} with ${hooks.join(', ')}`)

---
'panda-plugin-qwik': patch
---

Support Panda CSS 2.3 and later. Panda 2.3 moved the style-prop and condition keys in the generated `types/system` module onto `LocalSystemProperties` / `LocalConditions`, which made `panda codegen` fail with "types/system has no `SystemProperties` interface". The plugin now reads either layout, so Panda 2.2 through 2.4 all work.

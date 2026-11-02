# panda-plugin-qwik

## 0.1.1

### Patch Changes

- [#4](https://github.com/trystendsmyth/panda-plugin-qwik/pull/4) [`6acf52c`](https://github.com/trystendsmyth/panda-plugin-qwik/commit/6acf52c11c7678e06791526315afbaa1e38c8cf2) Thanks [@trystendsmyth](https://github.com/trystendsmyth)! - Support Panda CSS 2.3 and later. Panda 2.3 moved the style-prop and condition keys in the generated `types/system` module onto `LocalSystemProperties` / `LocalConditions`, which made `panda codegen` fail with "types/system has no `SystemProperties` interface". The plugin now reads either layout, so Panda 2.2 through 2.4 all work.

## 0.1.0

### Minor Changes

- [`0bdc42d`](https://github.com/trystendsmyth/panda-plugin-qwik/commit/0bdc42d35f20293580d41f7f7619edf2ef97e022) Thanks [@trystendsmyth](https://github.com/trystendsmyth)! - Initial release: generates Qwik pattern components (`Box`, `Stack`, `VStack`, `HStack`, …) into `styled-system/jsx` for Panda CSS v2, with the same style props as Panda's React pattern components. Supports Qwik 1 and Qwik 2, every `outExtension`, `forceImportExtension` and `jsxStyleProps` mode.

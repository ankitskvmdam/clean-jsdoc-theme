# @clean-jsdoc-theme/aadesh

> **Stub — reserved for a future v5.x.** Not a usable CLI yet.

The reserved command-line surface for clean-jsdoc-theme — the eventual home of a
`clean-jsdoc` binary for workflows that live outside `jsdoc -c` (scaffolding,
config validation, and driving the i18n cycle in
[`@clean-jsdoc-theme/bhasha`](../bhasha)).

The supported way to build docs today is JSDoc's own template flag:

```sh
jsdoc -t clean-jsdoc-theme -c jsdoc.json
```

## Current contents

```ts
import { AADESH_PACKAGE_VERSION } from '@clean-jsdoc-theme/aadesh';
```

`src/cli.ts` is a placeholder entry that prints a stub banner. When the CLI
lands it will be a thin wrapper over the boundary packages — it won't
re-implement generation or rendering, so programmatic users can keep importing
[`setu`](../setu) / [`dwar`](../dwar) directly.

## License

MIT.

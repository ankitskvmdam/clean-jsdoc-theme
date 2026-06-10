# typedoc-basic

A tiny TypeScript library used to exercise the **clean-jsdoc-theme TypeDoc
plugin** (`@clean-jsdoc-theme/typedoc`) end-to-end.

It documents a class (`Circle`), an interface (`Shape`), an enum (`Direction`),
type aliases (`Point`, `PointVisitor`), free functions (`distance`, `step`), and
a namespace (`Factory`) — covering every kind the plugin's adapter maps.

## Build the docs

```sh
pnpm run docs
pnpm run serve   # http://localhost:3002
```

Or use the bundled dev script (typedoc + nodemon + serve, all concurrent):

```sh
pnpm run dev     # rebuilds the theme on change, re-runs typedoc, serves on :3002
```

This builds the theme packages, then runs TypeDoc with the plugin selected via
the `outputs` option in `typedoc.json`. The rendered site lands in `dist/`.

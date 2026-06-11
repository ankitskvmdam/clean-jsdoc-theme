---
title: TypeDoc Getting Started
group: Getting Started
order: 3
---

# Getting Started with TypeDoc

This guide walks through adding `clean-jsdoc-theme` to a **TypeDoc** project. The
theme ships a TypeDoc plugin (`@clean-jsdoc-theme/typedoc`) that feeds TypeDoc's
reflections through the same pipeline as the JSDoc bridge, so you get an
identical site from your TypeScript sources.

## Getting Started

<steps>

<step label="Install">

Install TypeDoc and the theme's TypeDoc plugin as dev dependencies:

```sh
npm install --save-dev typedoc @clean-jsdoc-theme/typedoc
```

```sh
# or with pnpm
pnpm add -D typedoc @clean-jsdoc-theme/typedoc
```

</step>

<step label="Configuration">

Add a `typedoc.json` to your project root. Unlike JSDoc, the theme is a TypeDoc
**plugin** selected as an **output** — and its options live under the
`cleanJsdocTheme` key:

```json5
{
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  readme: "README.md",

  // Load the plugin and select it as the output to render.
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],

  // Theme options go here (the TypeDoc counterpart of JSDoc's `opts`).
  cleanJsdocTheme: {
    siteName: "My Library",
  },
}
```

</step>

<step label="Build">

Build your docs by running TypeDoc:

```sh
npx typedoc
```

</step>

<step label="Dist">

The site is written to `dist/` (the `outputs[].path` above). Open
`dist/index.html` in a browser, or serve the folder during development:

```sh
npx serve dist
```

</step>

</steps>

## Configuring the theme

Every theme option works the same as it does for JSDoc — just nested under
`cleanJsdocTheme` instead of `opts`. See the full [Configuration](/configuration)
reference, which shows both forms side by side.

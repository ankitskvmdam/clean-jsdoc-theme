# Getting Started

This tutorial walks through generating documentation with
`clean-jsdoc-theme`. It is rendered from a plain Markdown file in the
`tutorials/` directory and flows through the exact same MDX pipeline as the
API reference pages.

## Install

Add JSDoc and the theme to your project:

```sh
npm install --save-dev jsdoc clean-jsdoc-theme
```

## Configure

Point JSDoc at the theme and tell it where your README and tutorials live:

```json
{
  "opts": {
    "template": "node_modules/clean-jsdoc-theme",
    "readme": "./README.md",
    "tutorials": "./tutorials",
    "destination": "dist"
  }
}
```

## Build

```sh
jsdoc -c jsdoc.json
```

> The generated site opens on your README, with every tutorial listed under
> **Tutorials** in the sidebar.

Next, see [Configuration](configuration) for the options you can tweak.

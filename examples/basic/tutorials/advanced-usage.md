# Advanced Usage

This page is a **child tutorial** of [Configuration](configuration) — JSDoc's
tutorial hierarchy is declared in `tutorials.json` and preserved in the
generated navigation.

## Linking between tutorials

Use a normal Markdown link with the tutorial's identifier (its filename
without the extension) as the target:

```md
See [Getting Started](getting-started) for the basics.
```

## Code samples

Fenced code blocks are syntax-highlighted at build time:

```js
/** @type {import('clean-jsdoc-theme').Options} */
const options = {
  siteName: 'My Library',
  fonts: { heading: 'Source Serif 4', body: 'Roboto' },
};
```

That's it — tutorials are just Markdown, rendered with the same chrome,
table-of-contents, and search indexing as the rest of the site.

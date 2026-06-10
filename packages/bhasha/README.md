# @clean-jsdoc-theme/bhasha

> **Stub — scoped to v5.1+.** Type surface only; no extraction or translation yet.

The reserved internationalization surface for clean-jsdoc-theme. The intended
shape is a `.po`-style locale file (`strings` + `orphaned` + `@meta`), an
extractor that walks doclets into locale files, and a build-time translator with
graceful fallback to the source language.

## Current contents

```ts
import { createEmptyLocale, type LocaleFile } from '@clean-jsdoc-theme/bhasha';

const locale = createEmptyLocale('fr'); // { '@meta': { version, locale, fallback }, strings: {}, orphaned: {} }
```

`LocaleFile` is the locale schema; `createEmptyLocale(locale, fallback = 'en')`
returns an empty one. Everything else (the doclet extractor, the translator, and
any optional machine-translation hooks) is future work and not implemented.

## License

MIT.

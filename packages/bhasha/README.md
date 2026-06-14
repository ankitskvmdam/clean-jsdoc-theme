# @clean-jsdoc-theme/bhasha

> **Phase 0 — i18n core.** The pure, browser-safe runtime for localization. The
> disk-bound extract/translate/build pipeline lives in `@clean-jsdoc-theme/aadesh`.

The internationalization core for clean-jsdoc-theme. bhasha is **isomorphic** —
zero `node:*` — because rang bundles it into the browser. It holds the
translatable chrome catalog, the `t` translator and its fallback chain, the
`LanguageProvider` static carrier, the API-slot key scheme, and the validation
primitives. (See `packages/aadesh-bhasha-plan.md` for the full localization
design.)

## What's here

### Chrome catalog

`EN_CHROME` is the canonical list of UI strings, authored as a nested object and
flattened to dotted `chrome.*` keys. The key union is **derived from the
catalog**, so every `t('chrome.…')` call is compile-checked.

```ts
import { EN_CHROME, EN_CHROME_FLAT, type ChromeKey } from '@clean-jsdoc-theme/bhasha';
```

### `t` + provider

`LanguageProvider` is a **static carrier** — an immutable per-render value, no
setter (locale is a build dimension, not a runtime toggle). With no provider, `t`
returns exact English (the byte-identical no-locale baseline).

```tsx
import { LanguageProvider, useTranslation, createI18n } from '@clean-jsdoc-theme/bhasha';

function ThemeButton() {
  const { t } = useTranslation();
  return <button title={t('chrome.theme.toggleTitle')}>{t('chrome.theme.switchTo', { mode: 'dark' })}</button>;
}

// Seed an island root (browser) or a page render (SSR):
const i18n = createI18n({ locale: 'fr', messages: { 'chrome.theme.toggleTitle': 'Basculer le thème' } });
<LanguageProvider value={i18n}>{/* … */}</LanguageProvider>;
```

Fallback chain: **active locale → default locale → the key** (chrome) or **the
source text** (`translateSlot`, API slots). An empty value counts as
untranslated and falls through.

Interpolation is simple named `{token}` substitution (`t(key, { count: 3 })`);
ICU plurals are deferred.

### API slot keys + staleness

```ts
import { apiSlotKey, sourceHash } from '@clean-jsdoc-theme/bhasha';

apiSlotKey('Foo#bar', ['params', '0', 'description']); // 'api.Foo#bar#params.0.description'
sourceHash('The Foo class.'); // '9d6177d6' — FNV-1a; changes when source text changes
```

### Validation primitives

Built on the theme's diagnostics spine (`DiagnosticBag` / `suggestKey` from
`@clean-jsdoc-theme/utils`). A *gap* warns; a *malformation* errors, reported
against the key.

```ts
import {
  validateCatalogShape, // missing → warn, unknown → error (+ "did you mean?")
  catalogCoverage, // { translated, total, ratio }
  lintSlotMarkdown, // unbalanced fence / {@link} / braces → error
  validateTokenParity, // dropped/added {token} → error
} from '@clean-jsdoc-theme/bhasha';
```

## License

MIT.

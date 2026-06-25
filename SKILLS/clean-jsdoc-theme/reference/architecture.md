# Architecture — for contributors / extenders

A pnpm + Turborepo monorepo. Most theme *users* never touch these, but each is
published to npm and reusable. Read this when working **on** the theme rather than
**with** it.

| Package | Role |
| --- | --- |
| `@clean-jsdoc-theme/utils` | Shared types, Zod schemas, the `SiteManifest` contract, slug rules, and **pure** opts-validation + build-report logic (network/zlib injected so it stays browser-safe). The setu↔dwar boundary lives here once. |
| `@clean-jsdoc-theme/setu` | JSDoc doclets → `SiteManifest`. Emits MDX/Markdown only, **no HTML, no I/O**. Owns page generation, nav assembly, link resolution. |
| `@clean-jsdoc-theme/rang` | Preact component library — SSR chrome, hydratable islands, the MDX element map, the island registry. **Owns every byte of page-shell HTML.** Tailwind utility classes over CSS variables. |
| `@clean-jsdoc-theme/dwar` | `SiteManifest` → HTML/CSS/JS. A **pure** renderer: SSR pages, esbuild island bundle, CSS, separate Pagefind step. Consumes only the manifest; never re-reads doclets. |
| `clean-jsdoc-theme` | The JSDoc theme entry — a thin CJS bridge (`publish()`) that does the file I/O and wires setu → dwar. |
| `@clean-jsdoc-theme/typedoc` | The TypeDoc plugin — adapts reflections → doclets → the same setu → dwar core. ESM. |
| `@clean-jsdoc-theme/aadesh` | The `clean-jsdoc` **localization CLI** — extract → translate → validate → build one site per locale (+ an interactive menu). Disk I/O + process orchestration. |
| `@clean-jsdoc-theme/bhasha` | The pure, browser-safe **i18n core** — UI catalog, `t` translator, `LanguageProvider`, and the API-slot key/hash scheme setu/aadesh/rang share. |

Boundary guarantees (don't violate when editing): **setu never imports dwar or
rang** (one-way), **dwar.render() is pure** (the only disk touch is Pagefind),
**dwar never re-reads doclets**, **slug rules and the boundary contract live once
in utils**, and **chrome markup lives once in rang** (dwar's `SsrLayout` only wraps
islands in `data-island` markers and fills rang's `Layout` slots).

The 15 islands: `sidebar`, `mobile-nav`, `toc`, `toc-mobile`, `cmdk`, `code-tabs`,
`copy-btn`, `copy-page`, `theme-toggle`, `settings`, `language-switcher`,
`code-viewer`, `embed`, `playground`, `tabs`. Each renders meaningful SSR HTML
first, then progressively enhances. (`language-switcher` mounts only in a
localized build; `playground` is the "Open Code in" dropdown in a code block's
header.)

**TypeDoc parity (v5.0.x).** Both bridges feed the same setu → dwar core, but
setu takes a `flavor: 'jsdoc' | 'typedoc'`. Under `'typedoc'` the *document model*
matches default TypeDoc: enums/top-level functions/variables become standalone
pages, type aliases are labelled "Type Aliases", class sections use TypeDoc labels
(Constructors / Properties / Accessors / Methods), module/namespace pages are a
kind-grouped index of links, and generics render a "Type Parameters" section.
Overloads stack one `<Signature>` per call signature; standalone pages lead with a
declaration block. **Signature rendering is cross-cutting (both flavors):** member
headings show the full TypeScript signature, shiki-highlighted inline. The TypeDoc
bridge also honors `basePath` for sub-directory deploys.

**Build commands:**

```sh
pnpm install
pnpm build        # tsup per package (dwar compiles its Tailwind CSS first)
pnpm build:docs   # generate every site (docs-site + examples)
pnpm test         # vitest across utils / setu / rang / dwar
pnpm typecheck
pnpm lint
```

`examples/*` and `docs-site` consume the theme's **built `dist`**, so their `docs`
script runs `build:theme` (turbo) first to rebuild the upstream graph. The
canonical architecture doc is [`docs/ARCHITECTURE.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs/ARCHITECTURE.md).

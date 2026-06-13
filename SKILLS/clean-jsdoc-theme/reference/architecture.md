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
| `aadesh` / `bhasha` | Reserved stubs (CLI / i18n), v5.1+. |

Boundary guarantees (don't violate when editing): **setu never imports dwar or
rang** (one-way), **dwar.render() is pure** (the only disk touch is Pagefind),
**dwar never re-reads doclets**, **slug rules and the boundary contract live once
in utils**, and **chrome markup lives once in rang** (dwar's `SsrLayout` only wraps
islands in `data-island` markers and fills rang's `Layout` slots).

The 13 islands: `sidebar`, `mobile-nav`, `toc`, `toc-mobile`, `cmdk`, `code-tabs`,
`copy-btn`, `copy-page`, `theme-toggle`, `settings`, `code-viewer`, `embed`,
`tabs`. Each renders meaningful SSR HTML first, then progressively enhances.

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

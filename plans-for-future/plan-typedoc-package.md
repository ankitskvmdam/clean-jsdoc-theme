# Plan: `@clean-jsdoc-theme/typedoc` — TypeDoc support (TODO #7)

## Goal

A new workspace package that lets **TypeDoc** projects render through the exact
same output as the JSDoc theme — SSR HTML + co-located `.md` + lazy islands +
fuzzy search + optional Pagefind — by feeding TypeDoc's data into the existing
`setu → dwar` pipeline.

The package is the **TypeDoc twin of the `clean-jsdoc-theme` bridge**
(`packages/clean-jsdoc-theme/src/publish.ts`). Same shape: get data → adapt →
`setu.generateSite` → `dwar.render` → write files → optional Pagefind. Simpler
than publish.ts, because TypeDoc is ESM so we can `import` setu/dwar directly
(no CJS dynamic-import dance).

### Confirmed decisions

1. **Integration:** a TypeDoc **plugin** (`load(app)`) that registers a **custom
   output** via `app.outputs.addOutput`. Usage:
   `typedoc --plugin @clean-jsdoc-theme/typedoc` (selecting our output).
2. **setu path:** convert reflections → `TDoclet[]` → wrap with
   `salty.taffy(...)` (`@jsdoc/salty`) → `setu.generateSite`. Maximum reuse: nav,
   search, MDX, source pages, `{@link}` resolution all come for free.
3. **v1 coverage:** core kinds + README; defer exotic-TS fidelity (see Scope).

### How the existing pipeline already accepts this (verified)

- setu's own tests build a collection with
  `salty.taffy(items) as TJSDocSaltyCollection<TDoclet>`
  (`packages/setu/src/__tests__/class-view.test.ts:18`). So **any** `TDoclet[]`
  drives setu — `@jsdoc/salty` is already a real dependency (`setu`'s `package.json`).
- `setu.generateSite(collection, opts)` consumes the salty collection; `opts`
  carries `pkg`, `readme` (HTML), `sources`, `docs`, `sectionOrder`, `menu`,
  etc. (see `publish.ts:788`).
- `dwar.render(manifest, { theme, destination })` returns `{ files, search,
  stats, errors }`; the bridge writes `files` and runs Pagefind
  (`publish.ts:807-835`).

---

## IMPORTANT — verify the TypeDoc API against the installed version first

The web docs are thin and version-skewed. Before coding, the implementing agent
**must** install `typedoc` and read its real type surface:

```sh
# in the new package dir
cat node_modules/typedoc/dist/index.d.ts        # or: node -e "console.log(require.resolve('typedoc'))"
```

Confirm, against the installed 0.28.x (pin the version in package.json):

- `Application` bootstrap + `app.convert(): Promise<ProjectReflection | undefined>`.
- The plugin entry: `export function load(app: Application): void` (may be async).
- `app.outputs.addOutput(name: string, output: (path: string, project:
  ProjectReflection) => Promise<void>): void` — and **how an output is
  selected/triggered** (the `outputs` option / `--out`/output-name option in
  0.28). If output-selection differs from expectation, fall back to listening for
  the renderer/end event (`Renderer.EVENT_*`) or to `app.renderer` hooks — the
  agent picks whichever the installed version actually supports. Document the
  chosen mechanism in the package README.
- The reflection model shapes used by the adapter (next section). Read the actual
  `.d.ts` for `DeclarationReflection`, `SignatureReflection`,
  `ParameterReflection`, `Comment`, `CommentDisplayPart`, `CommentTag`,
  `ReflectionKind`, `SourceReference`, and the `Type` hierarchy (`.toString()`).

Do **not** hand-mock these from memory — read the types.

---

## Package scaffold (mirror the existing packages)

Create `packages/typedoc/`. `pnpm-workspace.yaml` already globs `packages/*`, so
no workspace edit is needed. Mirror `packages/aadesh` conventions:

- `package.json`:
  ```jsonc
  {
    "name": "@clean-jsdoc-theme/typedoc",
    "version": "5.0.0-alpha.0",
    "description": "TypeDoc support for clean-jsdoc-theme (renders via setu → dwar)",
    "type": "module",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
    "files": ["dist", "README.md"],
    "keywords": ["typedoc-plugin", "typedoc-theme", "clean-jsdoc-theme"],
    "scripts": {
      "build": "tsup",
      "dev": "tsup --watch",
      "test": "vitest run",
      "lint": "eslint src",
      "typecheck": "tsc --noEmit",
      "clean": "node ../../scripts/clean.mjs dist .turbo",
      "clean-node-modules": "node ../../scripts/clean.mjs node_modules"
    },
    "dependencies": {
      "@clean-jsdoc-theme/utils": "workspace:^",
      "@clean-jsdoc-theme/setu": "workspace:^",
      "@clean-jsdoc-theme/dwar": "workspace:^",
      "@jsdoc/salty": "^0.2.12"
    },
    "peerDependencies": { "typedoc": "^0.28.0" },
    "devDependencies": { "typedoc": "^0.28.0", "tsup": "^8.0.0", "typescript": "^5.5.0", "vitest": "^2.0.0" },
    "publishConfig": { "access": "public" }
  }
  ```
  - `typedoc` is a **peer** (the user brings their TypeDoc) + a dev dep for build/tests.
  - The `typedoc-plugin` keyword makes it discoverable.
- `tsup.config.ts`: copy aadesh's (`entry: ['src/index.ts']`, `format: ['esm']`,
  `dts: true`, `clean: true`, `sourcemap: true`).
- `tsconfig.json`: copy aadesh's (`extends ../../tsconfig.base.json`,
  `outDir: dist`, `rootDir: src`, `include: ["src"]`).
- `turbo.json` needs no change (tasks are inferred per-package); confirm `build`
  picks up workspace-dep builds (utils/setu/dwar) as it does elsewhere.

---

## Module layout

```
packages/typedoc/src/
├── index.ts                  # export function load(app) — plugin entry;
│                             #   registers app.outputs.addOutput(name, writeSite)
├── write-site.ts             # the output callback: (outDir, project) →
│                             #   adapt → salty.taffy → setu.generateSite →
│                             #   dwar.render → write files → pagefind
│                             #   (the publish.ts analog; reuse its theme/siteName/
│                             #    pkg/readme handling — copy or extract shared bits)
├── reflection-to-doclets.ts  # THE adapter: ProjectReflection → TDoclet[]
├── comment.ts                # Comment/CommentDisplayPart[] → HTML (description/
│                             #   classdesc) + {@link} conversion; block tags →
│                             #   examples/params/returns/throws/see/deprecated
├── names.ts                  # synthesize longname/memberof/scope + #/./~ separators
│                             #   consistent with setu slug-rules & memberof queries
├── types.ts                  # TypeDoc Type → TDocletTypeProperty (names[]) via toString
└── write-output-files.ts     # mkdir -p + writeFile loop (copy from
                              #   packages/clean-jsdoc-theme/src/write-output-files.ts)
packages/typedoc/src/__tests__/
└── reflection-to-doclets.test.ts   # unit tests for the adapter (see Testing)
```

Note: `write-output-files.ts` is a tiny, self-contained helper duplicated from the
JSDoc bridge — copy it rather than introducing a cross-package import (those two
bridges are independent leaf packages). If it grows, consider hoisting to utils
later; not in this plan.

---

## The adapter: `ProjectReflection → TDoclet[]`

This is the core. Walk the reflection tree depth-first and emit one `TDoclet`
(see `packages/utils/src/doclet-schema.ts` for the exact shape) per documented
symbol. Produce a **flat** list (setu re-nests via `memberof`).

### Kind mapping (`ReflectionKind` → `TDoclet.kind`)

| TypeDoc `ReflectionKind`            | `TDoclet.kind` | Notes |
|-------------------------------------|----------------|-------|
| `Class`                             | `class`        | walk constructor signature → `params` (constructor section) |
| `Interface`                         | `interface`    | |
| `Function`                          | `function`     | top-level → `scope:'global'`; one doclet per call signature (or fold overloads — see below) |
| `Method`                            | `function`     | `scope` from `flags.isStatic` |
| `Constructor`                       | —              | **do not emit as a member.** Fold its signature `parameters` into the owning class doclet's `params` (mirrors how the JSDoc path surfaces constructor params; see TODO #4 plan re: the constructor-as-member trap) |
| `Property`, `Variable`, `Accessor`  | `member`       | `scope` from `flags.isStatic`; accessor get-signature type → `type` |
| `Enum`                              | `enum` (set `isEnum:true`) | |
| `EnumMember`                        | `member` (`scope:'static'`) | renders as a member section under the enum (matches setu's enum handling) |
| `TypeAlias`                         | `typedef`      | type → body; function-type aliases keep params/returns |
| `Module`, `Namespace`               | `module` / `namespace` | top-level container pages |
| `Reference` / re-exports            | — (defer)      | skip in v1 (log a count) |

`ReflectionKind` is a **bitflag enum** — match with `reflection.kindOf(...)` /
`reflection.kind & ReflectionKind.X`, not `===`, where appropriate. Verify the
exact numeric/name set in the installed `.d.ts`.

### Names (`names.ts`)

setu queries members with `collection({ memberof: longname })` and builds slugs
/anchors from longnames using `#` (instance), `.` (static), `~` (inner)
separators (see `utils/.../slug-rules.ts` and setu's `name-registry.ts`). The
adapter must synthesize longnames that match:

- Top-level class `Foo` → `longname:"Foo"`, `memberof` undefined,
  `scope:"global"`.
- Instance method `bar` of `Foo` → `longname:"Foo#bar"`, `memberof:"Foo"`,
  `scope:"instance"`.
- Static member `baz` of `Foo` → `longname:"Foo.baz"`, `memberof:"Foo"`,
  `scope:"static"`.
- Module `m`'s exported class `Foo` → decide module nesting: `longname:
  "module:m.Foo"` / `memberof:"module:m"` to mirror JSDoc module conventions, OR
  flatten if TypeDoc's "module" is really just a file. **Pick the convention that
  produces clean slugs** and document it; lean on TypeDoc's
  `reflection.getFriendlyFullName()` / `getFullName()` as the raw source, then
  normalize separators.
- **Critical guard:** never emit a doclet whose `longname === memberof` (the
  TODO #4 self-reference bug). The adapter is in full control here, so simply
  don't produce one — but the setu-side fix from the #4 plan also protects this.

### Comments (`comment.ts`)

setu's `descriptionBlocks` expects **HTML** in `classdesc`/`description` (it runs
`htmlToMdastBlocks`). TypeDoc comments are `CommentDisplayPart[]` (markdown-ish).

- `comment.summary` (parts) → join to a markdown string → render to **HTML** →
  set `description` (or `classdesc` for classes). Use a light markdown→HTML
  (setu already depends on `mdast-util-from-markdown` + `mdast-util-to-hast` +
  `hast-util-to-html`; the adapter package may add a tiny renderer or reuse
  `marked`/`markdown-it` — keep deps minimal, prefer what's already in the tree).
- `CommentDisplayPart` of kind `inline-tag` with `tag:'@link'` → convert to JSDoc
  `{@link Target|text}` syntax in the text, so setu's existing `{@link}`
  resolution turns it into a real cross-reference. (TypeDoc's `@link` targets are
  reflections/symbol ids — map the target to the symbol's longname the adapter
  assigned, so the registry resolves it.)
- Block tags (`comment.blockTags`, each `{ tag, content }`):
  - `@param name` → merge into the matching `params[]` entry's `description`
    (TypeDoc also exposes params on the signature with their own comments —
    prefer the signature's `ParameterReflection.comment`).
  - `@returns` → `returns[]`.
  - `@throws`/`@exception` → `exceptions[]`.
  - `@example` → `examples[]` (raw code string; setu's `examplesBlocks` handles
    `<caption>` / `{@lang}`).
  - `@deprecated` → `deprecated` (string reason or `true`).
  - `@see` → `see[]`.
  - `@defaultValue` → `defaultvalue`. `@since`/`@author`/etc. → matching fields.
  - `@category Foo/Bar` (TypeDoc's category tag, or `modifierTags`) → emit a
    `tags:[{title:'category', value:'Foo/Bar'}]` so setu's existing `@category`
    sidebar grouping works unchanged.
- `flags` → doclet flags: `isStatic→scope`, `isReadonly→readonly`,
  `isAbstract→virtual`, `isOptional→optional`, `isPrivate→access:'private'`,
  `isProtected→access:'protected'`. (setu's `filterDoclets` drops `private`.)

### Params, signatures, types

- Function/method: read `reflection.signatures[]`. v1: use the **first** signature
  (note dropped overloads via `log`); map `signature.parameters[]` →
  `params[]` (name, type→`type.names`, `flags.isOptional→optional`,
  `defaultValue→defaultvalue`, comment→description), `signature.type` →
  `returns[{ type }]`.
- Types (`types.ts`): `Type → TDocletTypeProperty` = `{ names: [type.toString()] }`.
  v1 keeps it a single readable string (matches how JSDoc types render today as
  inline code — see setu's `typeExpressionInline`). Defer structured
  union/array/conditional rendering.

### `meta` for source links

Set `doclet.meta = { filename, path, lineno }` from
`reflection.sources?.[0]` (`fileName`/`line`). This drives setu's
`Source: file:line` links + the source-viewer pages **for free**, exactly like
the JSDoc path. The bridge (write-site) collects the referenced source files
(mirror `collectSourceFiles` in publish.ts — it keys off `meta.path`/`filename`)
and passes them to setu as `sources`. Compute `meta.path`/`filename` so that
`resolve(path, filename)` equals the real on-disk path (publish.ts does the same).

---

## The output writer: `write-site.ts`

The `addOutput` callback `(outDir, project) => Promise<void>`:

```ts
import salty from '@jsdoc/salty';
import { generateSite } from '@clean-jsdoc-theme/setu';
import { render, runPagefindAgainstDir } from '@clean-jsdoc-theme/dwar';
import { reflectionsToDoclets } from './reflection-to-doclets';
import { writeOutputFiles } from './write-output-files';

export async function writeSite(outDir, project, app) {
  const doclets = reflectionsToDoclets(project);            // TDoclet[]
  const collection = salty.taffy(doclets);                  // TJSDocSaltyCollection
  const readmeHtml = renderReadme(project.readme);          // ProjectReflection.readme → HTML home page
  const sources = collectSourceFiles(doclets);              // mirror publish.ts
  const manifest = generateSite(collection, {
    pkg, readme: readmeHtml, sources,
    // sectionOrder/menu/clubSidebarItems/etc. read from typedoc options or our own option block
  });
  const theme = resolveTheme(/* options */);                // copy publish.ts defaultTheme + overrides
  const result = await render(manifest, { theme, destination: resolve(outDir) });
  await writeOutputFiles(resolve(outDir), result.files);
  try { await runPagefindAgainstDir(resolve(outDir)); } catch (e) { /* warn, non-fatal */ }
  // log result.stats.pageCount + result.errors (skipped pages), like publish.ts
}
```

- **Options:** read theme/siteName/fonts/sectionOrder/menu/etc. from a TypeDoc
  option the plugin **declares** via `app.options.addDeclaration(...)` (verify the
  API), namespaced e.g. `cleanJsdocTheme`. v1 can start with sensible defaults +
  `siteName`/`fonts` and grow. Reuse publish.ts's `defaultTheme`,
  `resolveTheme`, `prepareSiteName`, `normalizeSectionOrder`, `normalizeMenu`,
  `normalizeCopyPage` logic — copy the pure helpers (don't import from the JSDoc
  bridge package).
- **pkg:** read the project's `package.json` (TypeDoc knows the entry/package;
  or read from cwd) → `SiteManifest['pkg']`.

---

## Plugin entry: `index.ts`

```ts
import type { Application } from 'typedoc';
import { writeSite } from './write-site';

export function load(app: Application): void {
  // declare options (cleanJsdocTheme.*) here via app.options.addDeclaration
  app.outputs.addOutput('clean-jsdoc-theme', async (outDir, project) => {
    await writeSite(outDir, project, app);
  });
}
```

Document in the README how a user selects the output (the verified 0.28
mechanism), e.g. `typedoc.json`:
```jsonc
{ "plugin": ["@clean-jsdoc-theme/typedoc"], "out": "docs", /* select our output */ }
```

---

## Suggested phases (one subagent per phase, sequential — never parallelize)

1. **Scaffold + plugin skeleton.** Create the package, build config, an
   `index.ts` `load(app)` that registers a no-op output writing a single
   placeholder file. Verify `pnpm build` + `typedoc --plugin` picks it up and the
   output is selectable end-to-end on a tiny TS fixture. **Lock the API facts**
   (output selection, reflection types) into a short `NOTES.md` for later phases.
2. **Adapter core.** `reflection-to-doclets.ts` + `names.ts` + `types.ts` +
   `comment.ts` for classes/interfaces/functions/methods/properties + comments +
   params/returns. Unit-test against hand-built reflection fixtures and/or a real
   `app.convert()` of a fixture. Assert the emitted `TDoclet[]` shape (longnames,
   memberof, scope, description HTML).
3. **Wire to setu→dwar.** `write-site.ts` end-to-end: adapter →
   `salty.taffy` → `generateSite` → `render` → write. Produce a real site from a
   TS example. Verify pages, nav, search, member headings, source links.
4. **Round out kinds + prose + options.** enums/enum-members, type aliases,
   modules/namespaces, README home, source-file collection, the
   `cleanJsdocTheme` option block (theme/siteName/fonts/sectionOrder/menu). Add an
   `examples/typedoc-basic/` fixture (a small TS lib) that builds via the plugin,
   mirroring `examples/basic`.

Each phase ends green (`pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm lint`)
before the next starts.

---

## Testing

- **Unit:** `reflection-to-doclets.test.ts` — feed reflection fixtures (or a real
  `app.convert()` over an inline TS source string) and assert the `TDoclet[]`:
  kinds, longname/memberof/scope, separators, description-as-HTML, params,
  `meta` source coords, the no-self-reference guard, and `@category` → tag.
- **Integration:** an `examples/typedoc-basic/` project that runs
  `typedoc --plugin @clean-jsdoc-theme/typedoc --out dist` and produces a site;
  spot-check a class page's `dist/<slug>/index.md` (title once, Constructor
  section, instance/static members, source links) and that
  `_assets/search-index.*.json` + islands exist.

---

## Scope / non-goals (v1)

- **In:** classes, interfaces, functions/methods, properties/accessors, enums +
  members, type aliases, modules/namespaces, comments (summary + block tags),
  params/returns/throws/examples/deprecated/see/category, README home, source
  files + `Source:` links, theme/siteName/fonts/sidebar options.
- **Deferred (note via `log`, don't silently drop):** rich structured rendering
  of complex TS types (unions/conditionals/mapped/tuples beyond `toString()`),
  type parameters with constraints, function/method **overloads** (use first
  signature), re-exports/`Reference` reflections, inherited/overridden member
  resolution across `extends`/`implements` (setu already folds `augments` for
  the JSDoc path — wiring TypeDoc inheritance into that is a follow-up),
  tutorials/`docs` dir, `@iframe`/embeds.
- **Not** a CSS theme extending TypeDoc's `DefaultTheme` (that's what
  `typedoc-github-theme` does — explicitly the opposite of this approach).

## Risks / notes

- **TypeDoc API drift** is the main risk — 0.28 reworked outputs. Pin the version
  and verify the `.d.ts` (Phase 1). If `app.outputs.addOutput` selection proves
  awkward, fall back to a renderer-end event hook; document whichever ships.
- **Name/slug fidelity** is the second risk — getting longname separators wrong
  breaks nav/anchors/`{@link}`. Phase 2 tests must lock this down.
- **Comment→HTML**: keep the markdown renderer minimal; mismatches surface as
  odd prose. Inline `{@link}` mapping depends on resolving TypeDoc link targets
  to the longnames the adapter assigns — test it.
- Confirm `@jsdoc/salty`'s `taffy()` accepts a plain doclet array the same way
  setu's tests use it (it does: `salty.taffy(items)`).
```

# TypeDoc API notes — verified facts for the adapter

These facts were read directly from the **installed** TypeDoc `.d.ts`/`.js` (not
from memory or web docs) during phase 1, and lock the API surface for phases 2-4.

- **Installed version:** `typedoc@0.28.19` (peer range `^0.28.0`).
- **Resolved entry:** `node_modules/.pnpm/typedoc@0.28.19_typescript@5.9.3/node_modules/typedoc/dist/index.js`
  (`node -e "console.log(require.resolve('typedoc'))"`).
- All model classes (`DeclarationReflection`, `Comment`, types, …) are exported
  from the root import: `index.d.ts` does `export * from "./lib/models/index.js"`.
  They are **also** under the `Models` namespace, but the bare names are stable.

---

## 1. Plugin entry & bootstrap

`index.d.ts` exports `Application`. `application.d.ts`:

- Plugin entry: `export function load(app: Application): void` (may be async — the
  CLI awaits plugin functions). TypeDoc calls it once after loading the plugin
  module via `--plugin`/`plugin` option.
- Bootstrap: `Application.bootstrapWithPlugins(options?, readers?): Promise<Application>`
  (loads plugins) and `Application.bootstrap(options?, readers?): Promise<Application>`
  (no plugins). The constructor is **private** — you must use these statics.
- Convert: `app.convert(): Promise<ProjectReflection | undefined>`.
- Render selected outputs: `app.generateOutputs(project): Promise<void>` →
  delegates to `app.outputs.writeOutputs(project)`.
- CLI flow (verified in `dist/lib/cli.js`): `const project = await app.convert();`
  then `await app.generateOutputs(project);`. So our writer runs inside
  `generateOutputs`.
- `app.logger` (a `Logger`) for `.info/.warn/.error`; `app.options` is an
  `Options` instance.

## 2. Output registration AND selection (THE key fact — 0.28 reworked this)

`dist/lib/output/output.d.ts` / `.js` — the `Outputs` class (also exported from
root as `Outputs`):

```ts
class Outputs {
  addOutput(
    name: string,
    output: (path: string, project: ProjectReflection) => Promise<void>
  ): void;
  setDefaultOutputName(name: string): void; // defaults to "html"
  getOutputSpecs(): OutputSpecification[];
  writeOutputs(project: ProjectReflection): Promise<void>;
}
```

- **Register:** `app.outputs.addOutput('clean-jsdoc-theme', writer)`. Throws if the
  name is already registered. (This is exactly what the plan assumed.)
- The writer signature is `(path, project) => Promise<void>` — `path` is the
  resolved-by-TypeDoc out dir for this output spec, `project` is the
  `ProjectReflection`. Errors thrown by the writer are caught by
  `Outputs.writeOutput` and logged (not rethrown) — but we should still log our
  own stats.

- **Selection** — `Outputs.getOutputSpecs()` resolves which writers run, in this
  precedence (read from `output.js`):
  1. If `options.isSet('out')` → push `{ name: this.defaultOutput, path: out }`.
     `defaultOutput` is `"html"` unless changed via `setDefaultOutputName`.
  2. For each option declaration flagged `outputShortcut` (`--html`, `--json`)
     that is set → push `{ name: shortcut.outputShortcut, path: <value> }`.
  3. **If no shortcut/out matched**, use the dedicated `outputs` option:
     `outputs = options.getValue('outputs')` — an
     `Array<{ name: string; path: string; options?: TypeDocOptions }>`
     (`OutputSpecification`, declaration.d.ts:28).
  4. If still empty → default `{ name: defaultOutput, path: out }`.

  **Conclusion:** the robust, non-invasive way to select our output is the
  **`outputs` option**:

  ```jsonc
  {
    "plugin": ["@clean-jsdoc-theme/typedoc"],
    "outputs": [{ "name": "clean-jsdoc-theme", "path": "docs" }],
  }
  ```

  `OutputSpecification = { name: string; path: string; options?: TypeDocOptions }`.

  Note: `--out` alone routes to the **default** output (`html`), NOT to us, unless
  we `app.outputs.setDefaultOutputName('clean-jsdoc-theme')`. Doing so would hijack
  `--out` for every user of the plugin, so phase 1 does **not** — selection is via
  `outputs`. (A later phase may offer an opt-in to set the default.)

  No renderer-end event fallback was needed — `addOutput` works as the plan
  assumed for 0.28.19. (For reference, the event route would be
  `RendererEvent`/`PageEvent`, both exported from root.)

## 3. Declaring options (for phase 4 `cleanJsdocTheme` block)

`dist/lib/utils/options/options.d.ts`:

- `app.options.addDeclaration(declaration: Readonly<DeclarationOption>): void`
- `app.options.isSet(name): boolean`, `app.options.getValue(name): unknown`
- `DeclarationOption` / `ParameterType` / `OptionDefaults` exported from root.
  Declare in `load(app)` before convert.

## 4. Reflection model shapes the adapter will consume

### `ReflectionKind` — bitflag enum (`dist/lib/models/kind.d.ts`)

Powers of two, so match with `reflection.kindOf(kind)` or `kind & ReflectionKind.X`,
**never `===`** when a kind set is involved:

```
Project=1, Module=2, Namespace=4, Enum=8, EnumMember=16, Variable=32,
Function=64, Class=128, Interface=256, Constructor=512, Property=1024,
Method=2048, CallSignature=4096, IndexSignature=8192, ConstructorSignature=16384,
Parameter=32768, TypeLiteral=65536, TypeParameter=131072, Accessor=262144,
GetSignature=524288, SetSignature=1048576, TypeAlias=2097152, Reference=4194304,
Document=8388608
```

The `ReflectionKind` namespace also exposes internal aggregate masks
(`ClassOrInterface`, `FunctionOrMethod`, `SomeModule`, etc.) but they are marked
`@internal` — prefer matching the explicit kinds above.

### `Reflection` (base — `dist/lib/models/Reflection.d.ts`)

- `name: string`, `kind: ReflectionKind`, `flags: ReflectionFlags`,
  `parent?: Reflection`, `project: ProjectReflection`, `comment?: Comment`.
- `kindOf(kind | kind[]): boolean`.
- `getFullName(separator?: string): string` — defaults to `.`-joined ancestry;
  **pass a separator** if needed. `getFriendlyFullName(): string` (drops signature
  names) — the plan's suggested raw source for longnames; the adapter normalizes
  separators to `#`/`.`/`~` itself.
- Type guards: `isProject()`, `isDeclaration()`, `isSignature()`, `isParameter()`,
  `isReference()`, `isContainer()`, `isDocument()`, `isTypeParameter()`.
- `isDeprecated()`: true if this or any parent has `@deprecated`.
- `traverse(callback)` exists but the plan walks `children` directly.

#### `ReflectionFlags` (getters — map to doclet flags)

`isPrivate`, `isProtected`, `isPublic`, `isStatic`, `isExternal`, `isOptional`,
`isRest`, `isAbstract`, `isConst`, `isReadonly`, `isInherited`.
Underlying `ReflectionFlag` enum is also a bitflag (Private=1 … Inherited=1024).
Plan mapping: `isStatic→scope`, `isReadonly→readonly`, `isAbstract→virtual`,
`isOptional→optional`, `isPrivate→access:'private'`, `isProtected→access:'protected'`.

### `ContainerReflection` (`dist/lib/models/ContainerReflection.d.ts`)

- `children?: DeclarationReflection[]` — the tree to walk (depth-first).
- `documents?`, `childrenIncludingDocuments?`, `groups?`, `categories?`.
- `getChildrenByKind(kind): DeclarationReflection[]`.

### `ProjectReflection extends ContainerReflection` (`ProjectReflection.d.ts`)

- `variant = 'project'`, `packageName?`, `packageVersion?`,
  `readme?: CommentDisplayPart[]` (→ home page), `files: FileRegistry`,
  `reflections: { [id: number]: Reflection }`.
- `getReflectionsByKind(kind): Reflection[]`.

### `DeclarationReflection extends ContainerReflection` (`DeclarationReflection.d.ts`)

- `variant: 'declaration' | 'reference'`.
- `sources?: SourceReference[]` → use `sources[0]` for `meta` (filename/path/lineno).
- `type?: SomeType` — value type for variable/property; return type for a signature.
- `signatures?: SignatureReflection[]` — functions/methods (one per overload;
  the first drives the doclet, the rest become `overloads[]`).
- `getSignature?` / `setSignature?: SignatureReflection` — accessors.
- `indexSignatures?`, `typeParameters?: TypeParameterReflection[]`.
- `defaultValue?: string` (function params, variables, properties → `defaultvalue`).
- `overwrites?`, `inheritedFrom?`, `implementationOf?: ReferenceType`;
  `extendedTypes?`, `extendedBy?`, `implementedTypes?`, `implementedBy?` (inheritance — deferred).
- `readme?: CommentDisplayPart[]` (module readme), `packageVersion?`.
- Helpers: `getProperties()`, `getAllSignatures()`, `getNonIndexSignatures()`,
  `hasGetterOrSetter()`.

### `SignatureReflection extends Reflection` (`SignatureReflection.d.ts`)

- `variant = 'signature'`; `kind` is one of
  Set/Get/Index/Call/ConstructorSignature.
- `parameters?: ParameterReflection[]` → `params[]`.
- `type?: SomeType` → return type (`returns[]`).
- `typeParameters?`, `sources?`, `comment?` (inherited from `Reflection`).

### `ParameterReflection extends Reflection` (`ParameterReflection.d.ts`)

- `variant = 'param'`; `parent?: SignatureReflection`.
- `name`, `type?: SomeType`, `defaultValue?: string`, `comment?`,
  `flags.isOptional` / `flags.isRest`.

### `SourceReference` (`dist/lib/models/SourceReference.d.ts`)

- `fileName: string` (relative), `fullFileName: string` (absolute, `@internal`),
  `line: number` (1-based), `character: number`, `url?: string`.
- Maps to `doclet.meta = { filename, path, lineno: line }`. Compute
  `path`/`filename` so `resolve(path, filename)` is the real on-disk file (publish.ts
  does the same); `fullFileName` is the absolute path to derive from.

## 5. Comments (`dist/lib/models/Comment.d.ts`)

- `Comment.summary: CommentDisplayPart[]` (the description/classdesc source).
- `Comment.blockTags: CommentTag[]` — each `{ tag: TagString ('@param'…), name?,
typeAnnotation?, content: CommentDisplayPart[], skipRendering }`.
- `Comment.modifierTags: Set<TagString>` (e.g. `@alpha`/`@beta`); `label?`.
- Helpers: `getTag(name)`, `getTags(name)`, `hasModifier(name)`,
  `Comment.combineDisplayParts(parts)` (debug join — not for rendering).
- `CommentDisplayPart` is a union:
  - `{ kind: 'text'; text: string }` (markdown),
  - `{ kind: 'code'; text: string }`,
  - `InlineTagDisplayPart { kind: 'inline-tag'; tag: TagString; text: string;
target?: Reflection | string | ReflectionSymbolId; tsLinkText?: string }`
    — this is the `{@link}` carrier; `target` resolves to a reflection (map to the
    longname the adapter assigned),
  - `RelativeLinkDisplayPart { kind: 'relative-link'; text; target?: FileId;
targetAnchor? }`.

### 5a. `@inheritDoc` — verified by a real `app.convert()` (0.28.19), not docs

TypeDoc's converter runs an internal `InheritDocPlugin` pass **before** our
adapter ever sees the comment. Verified with three throwaway probes
(`app.convert()` on tiny fixtures, comment dumped via `JSON.stringify`):

- **Explicit target**, block form (`@inheritDoc Base.toJSON`, own line) AND
  inline form (`{@inheritDoc Base.toJSON}` inside prose) — TypeDoc **fully
  resolves it during conversion**: the member's own `comment.summary` is
  **replaced** with the target's summary, and the target's block tags
  (`@returns`, `@param`, …) are merged into the member's own `blockTags`. The
  `@inheritDoc` tag itself is gone by the time `commentFields`/`summaryToHtml`
  run — there is nothing left for the bridge to resolve. (TypeDoc logs a
  `warning`: "Content in the summary section will be overwritten by the
  @inheritDoc tag" — confirming it overwrites rather than merges the summary.)
- **Bare `@inheritDoc`** (no target — inherit from `overwrites`/`inheritedFrom`)
  — same outcome: fully resolved at conversion time, using the same
  relationship the adapter already reads in `applyMemberRelations`.
- **Unresolvable target** (`@inheritDoc DoesNotExist.toJSON`) — this is the
  ONE case that survives into the comment our adapter sees. TypeDoc logs a
  `warning` ("Failed to find … to inherit the comment from") and leaves a
  residual block tag: `{ tag: '@inheritDoc', name: 'DoesNotExist.toJSON',
  content: [] }`. `comment.summary` stays whatever the member itself wrote
  (empty, if the comment was ONLY the tag).

**Conclusion:** the bridge does not need a general-purpose `@inheritDoc`
resolver for the common (resolvable) case — TypeDoc already did it, and
`commentFields`/`summaryToHtml` pick up the merged result for free. The only
thing to add is: treat a **residual, unresolved** `@inheritDoc` block tag as a
no-op instead of falling into the generic "unknown tag" bucket (which would
otherwise emit a useless `{title: 'inheritdoc', text: ''}` doclet tag).

## 6. Type hierarchy (`dist/lib/models/types.d.ts`)

- `abstract class Type { abstract readonly type: keyof TypeKindMap;
toString(): string; ... }`.
- `SomeType = TypeKindMap[keyof TypeKindMap]`; `TypeKind = keyof TypeKindMap`.
- `TypeKindMap` keys: `array, conditional, indexedAccess, inferred, intersection,
intrinsic, literal, mapped, optional, predicate, query, reference, reflection,
rest, templateLiteral, tuple, namedTupleMember, typeOperator, union, unknown`.
- v1 adapter: `Type → { names: [type.toString()] }` (single readable string).
  Structured union/array/conditional rendering is deferred (use `type.visit(...)`
  with a `TypeVisitor` later if needed).

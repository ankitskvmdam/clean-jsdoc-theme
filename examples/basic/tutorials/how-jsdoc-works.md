# How JSDoc works

Background for anyone working on `@clean-jsdoc-theme/setu`. This is the data model setu consumes — not a JSDoc user guide.

## The shape of the data

JSDoc parses source files together with their `/** … */` comments and emits a **flat array of doclets** — one doclet per documentable thing (class, method, field, event, enum, namespace, mixin, typedef, module, …).

`@jsdoc/salty` (formerly `taffydb`) wraps that array in a tiny in-memory query API:

```js
collection({ memberof: 'SomeClass' }).get();
// → all doclets whose `memberof` is "SomeClass"
```

There is **no tree**. There are no object references between doclets. Every relationship — parent, child, inheritance, event source — is encoded as a **string** that names another doclet's `longname`.

## Identity: `longname`

`longname` is the canonical id of a doclet. It uses three sigils to encode scope:

| Sigil | Meaning           | Example                              |
| ----- | ----------------- | ------------------------------------ |
| `#`   | instance member   | `SomeClass#someMethod`               |
| `.`   | static member     | `SomeClass.staticHelper`             |
| `~`   | inner / private   | `module:foo~InternalHelper`          |

A few more conventions:

- Module doclets are prefixed: `module:my-module`.
- Events use a literal `event:` segment: `SomeClass#event:somethingHappened`.
- Packages use `package:`: `package:my-pkg`.

When you need to point at another doclet — in `memberof`, `augments`, `fires`, `overrides`, `inherits`, `@link {…}` text — you use its `longname`.

## Relationship fields

A doclet describes itself and points at its neighbours via string fields:

- **`memberof`** — the `longname` of the doclet this one belongs to. To list everything that lives on a class/namespace/module, query `{ memberof: <its longname> }`.
- **`kind`** — what this doclet is. One of `class`, `function`, `member`, `event`, `constant`, `enum`, `interface`, `mixin`, `module`, `namespace`, `typedef`, `external`, `file`, `package`, `param`. The renderer branches on `kind`.
- **`scope`** — `instance | static | inner | global`. Used to bucket members ("instance methods" vs "static methods").
- **`access`** — `public | private | protected | package`. Used to filter or badge.

Other fields describe content rather than position: `description`, `summary`, `classdesc`, `params`, `returns`, `yields`, `exceptions`, `examples`, `see`, `since`, `version`, `deprecated`, `todo`, `readonly`, `async`, `generator`, `override`, `tutorials`, `requires`, `type.names` (the type expression as authored, e.g. `"Array.<string>"`, `"Promise.<number>"`).

## Inheritance, composition, and overrides

All encoded as `longname` references on the child doclet:

- **`augments`** / **`extends`** — array of parent class longnames. Usually one entry, but repeated `@augments` tags are legal.
- **`implements`** — interfaces this class implements. **`implementations`** is the reverse, present on the interface side.
- **`mixes`** — mixins folded into the class. The mixin itself is a separate doclet with `kind: 'mixin'`.
- **`inherited: true`** + **`inherits: <longname>`** — marks a doclet that was copied down from a parent. JSDoc fabricates these so a subclass page can list inherited members.
- **`overrides: <longname>`** — set on a child method that overrides a parent's method of the same name.

Resolving "what does this class expose, including inherited members?" means walking the `augments` chain and collecting members at each level, then letting the child's own doclets shadow inherited ones with the same name.

## A class is rarely a single doclet

This is the most important quirk to know about, and the most common source of bugs.

For a class declared as `class Foo { constructor() {…} … }`, JSDoc typically emits **multiple doclets with the same `longname`**:

1. One from the class-level `@class` comment block. Often marked `undocumented: true` and missing `params`.
2. One from the constructor's `MethodDefinition`. Has `params` derived from the constructor signature but no class-level description.
3. A merged record that combines comment metadata with constructor params.

When picking "the canonical class doclet" for rendering, you can't just take the first match. The reasonable strategy is to take the merged one — the doclet for the class `longname` that has the richest combined payload (e.g. has both `description`/`classdesc` and `params`).

## Other quirks worth knowing

- **Enum value doclets escape their parent.** A `@enum` on a class field produces the enum doclet correctly (`kind: 'member'`, `isEnum: true`, with `memberof` pointing at the class), but the individual values inside it (`FOO: 0`, `BAR: 1`, …) often come out as `scope: 'global'` doclets with no `memberof`. They are AST-inferred, not commented. Whether to render them is a policy choice — typically you display them inline under the enum doclet using `properties` or the enum's own `type.names`.

- **`undocumented: true` doclets exist for AST-inferred things.** Assignments inside a constructor like `this.timeout = options.timeout ?? 5000` produce an `undocumented` member doclet. They have no human-written description. Setu's default policy is to skip them, but they're useful for sanity checks ("did anyone document this field?").

- **Events are named with an `event:` prefix.** A doclet with `kind: 'event'` named `somethingHappened` on `SomeClass` has `longname: 'SomeClass#event:somethingHappened'`. References to it from `@fires` look the same: `fires: ['SomeClass#event:somethingHappened']`. Don't strip the prefix when matching.

- **Object-destructured params are flat.** A function with `@param {Object} options` and `@param {number} [options.timeout=5000]` produces a `params` array of three entries with `name: "options"`, `name: "options.timeout"`, etc. The renderer is responsible for re-nesting them by dotted name.

- **Type expressions are authored strings.** `type.names` is an array like `["Array.<string>"]` or `["Promise.<number>"]` or `["string | number"]`. These are JSDoc-flavoured type expressions, not TypeScript. Anything beyond the simplest cases (a single bare name) typically wants a small parser before rendering, so `Array<Map<string, T>>` becomes a structured tree of links rather than a literal string.

- **`@link` text is opaque.** `{@link Foo}`, `{@linkcode Foo#bar}`, `{@linkplain Foo|alt text}` are left in description/summary/deprecated strings as-is. Resolving them to URLs is the renderer's job, not JSDoc's.

- **The `package` doclet is structurally different.** It has its own schema (`PackageDocletSchema` in `@clean-jsdoc-theme/utils`) and lacks most of the relational fields above. Always branch on `kind === 'package'` first.

## How this maps to setu

Setu's job is to take this flat doclet array and turn it into the data a renderer needs to produce one page per documentable unit. The relevant pieces today:

- **`validate.ts`** — narrows `unknown` to a salty collection of JSDoc-4 doclets, validated against `DocletListSchema`.
- **`helper.ts` / `name-registry.ts`** — turn `longname`s (which contain `#`, `.`, `:`, `<`, `>`, `|`, `~`) into filesystem-safe filenames, with collision handling.
- **`doclet.ts`** — query helpers built on the salty collection. `getAllMembersOfClass(collection, longname)` is the membership lookup described above.

Upcoming work (e.g. `getClassView`) layers on top: pick the canonical class doclet out of the duplicates, bucket members by `kind` + `scope`, resolve inheritance via `augments`, and hand a structured view to the MDX layer.

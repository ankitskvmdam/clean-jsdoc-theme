# Plan: Fix duplicate class heading under "Other" (TODO #4 — "user page issue")

## Symptom

On the `User` class page (`examples/basic/src/models/Users.js` → `dist/user/`)
the class name appears **twice**: once as the page title `# User`, and again as
a member heading `User` under an **"Other"** section that re-prints the
constructor's params + description.

Generated `dist/user/index.md` today (abridged) — note lines under `## Other`:

```md
# User
...
## Constructor
**Parameters**
- `id` (string) — Unique identifier
- `name` (string) — Full name
...
## Other
<MemberHeading id="user" depth="3" name="User" sig="User" />
<MemberMeta sourceHref="/source/models/users-js/#L5" .../>
Represents a system user.
**Parameters**
- `id` (string) — Unique identifier
- `name` (string) — Full name
```

## Root cause (confirmed via `jsdoc -X`)

JSDoc emits four `User` doclets for this file:

```
{name:User, longname:"User",      kind:class, scope:global,   undocumented:true, lineno:5}
{name:User, longname:"User",      kind:class, scope:global,   undocumented:true, lineno:5}   (dup)
{name:User, longname:"User#User", kind:class, scope:instance, undocumented:true, lineno:12, hasParams:true}
{name:User, longname:"User",      kind:class, scope:global,   memberof:"User",   lineno:5,  hasParams:true}  ← culprit
```

The 4th doclet is the **canonical class doclet itself**, but JSDoc set
`memberof: "User"` on it. This is the well-known JSDoc behavior when an ES6
class carries `@class` *and* its `constructor()` carries an explicit
`@constructor` tag — the two merge into a class doclet that is a member of
itself.

In our pipeline (`packages/setu/src/class-view.ts`):
- `getCanonicalDoclet('User','class')` correctly selects this doclet for the
  page (it's the only non-`undocumented` class doclet) → renders the `# User`
  title + `## Constructor`. ✓
- `getAllMembersOfClass('User')` = `collection({ memberof: 'User' }).get()`
  **also returns it** (it has `memberof: 'User'`). Its `kind` is `class`, which
  `bucketClassMembers` routes to the `other` bucket → a duplicate `User`
  member heading under `## Other`. ✗

A genuine member's longname is always `Container<sep>name`
(`User#getId`, `User#name`, …) — **never exactly the container longname**. The
container's own doclet has leaked into its own member list.

## Fix

Add one guard at the single chokepoint where members are gathered —
`getMembersOf` in `packages/setu/src/doclet.ts`:

```ts
/**
 * All doclets whose `memberof` is `longname` — the members of a container
 * (class, interface, mixin, module, namespace, …). Kind-agnostic: callers are
 * expected to check the canonical container doclet exists first.
 *
 * Excludes the container's own doclet: JSDoc can emit a container whose
 * `memberof` equals its own `longname` (an ES6 class with an explicit
 * `@constructor`/`@class` tag is the common trigger), which would otherwise
 * render as a duplicate member heading (the class name) under "Other". A real
 * member's longname is always `<container><sep><name>`, never the container
 * longname itself, so dropping `d.longname === longname` is always safe.
 */
export function getMembersOf(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string
): TDoclet[] {
  return collection({ memberof: longname })
    .get()
    .filter((d) => d.longname !== longname);
}
```

### Why this location

- It is the **single** source that both **own** members (`getOwnClassMembers`)
  and **inherited** members (`getInheritedMembers` → `getAllMembersOfClass`,
  which aliases `getMembersOf`) flow through. Fixing it here resolves the
  self-reference for every container kind (class / interface / module /
  namespace / mixin) and also prevents an *ancestor's* self-reference from
  leaking in as an inherited member.
- Provably safe: nothing that is legitimately "memberof X" has longname exactly
  "X".

Do **not** put the filter in `bucketClassMembers` or `containerViewToMdast` —
that would only patch the class path and miss inherited members.

## Scope / non-goals

- Fix **only** the `longname === memberof` self-reference. This is the reported
  bug.
- **Out of scope (note as future hardening, do not implement here):** the
  `User#User` constructor-as-member doclet (kind `class`, scope `instance`).
  Today it is excluded only because JSDoc marks it `undocumented: true` (so
  `filterDoclets` drops it). A richly-documented constructor comment could make
  a `Container#Container` doclet surface under "Other". If we later want to be
  robust to that, exclude members whose `name === container name` AND
  `kind` is `class`/the constructor — but that is a separate change with its own
  test; leave it out of this fix.

## Test (regression)

Add a unit test in `packages/setu/src/__tests__/`. The natural homes are
`doclet.test.ts` (for a focused `getMembersOf` self-reference test) and/or
`class-view.test.ts` (for the `getContainerView`-level assertion). Reuse the
salty/collection fixture helpers those files already use.

Add a case that builds a salty collection where the canonical container doclet
has `memberof === longname` (mirroring JSDoc's `@constructor`/`@class` output),
then asserts:

1. `getContainerView(collection, 'User', 'class').other` does **not** contain a
   doclet with `longname === 'User'` (ideally `other` is empty).
2. The real members (`getId`, `updateName`, instance fields) are still present
   in their correct buckets.
3. `constructorParams` is still populated (the Constructor section is unaffected).

Prefer reusing whatever salty/collection test helper the existing class-view
tests already use to construct fixtures, rather than hand-rolling a new one.

## Verify end-to-end

```sh
pnpm --filter @clean-jsdoc-theme/setu test     # new + existing setu tests pass
pnpm build
cd examples/basic && pnpm run docs
```

Then inspect `examples/basic/dist/user/index.md`:
- `# User` appears once (the title).
- `## Constructor` with the `id` / `name` params is present.
- `## Instance Methods` (`getId`, `updateName`) and `## Instance Fields`
  (`name`, `createdAt`) are present.
- There is **no** `## Other` section and **no** second `User` heading.

Sanity-check a few other class pages render unchanged (e.g. `dist/extendeduser/`
to confirm inherited members are intact and no real member disappeared).

## Files touched

- `packages/setu/src/doclet.ts` — add the `d.longname !== longname` filter in
  `getMembersOf`.
- `packages/setu/src/__tests__/doclet.test.ts` and/or `class-view.test.ts` —
  **new** regression test.

## Risks / notes

- Very low risk: the filter only removes a doclet whose longname equals the
  container it claims membership of — never a real member.
- Confirm no existing setu test *asserts* the leaked self-doclet is present
  (it shouldn't, but run the full setu suite). If `examples/basic` has snapshot
  fixtures of generated output checked in, regenerate/update them.

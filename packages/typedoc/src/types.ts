/**
 * TypeDoc `Type` → JSDoc `TDocletTypeProperty`.
 *
 * v1 keeps types as a single readable string (`type.toString()`), wrapped in the
 * `{ names: [...] }` shape JSDoc uses. This matches how the JSDoc path renders
 * types today (an inline code span via setu's `typeExpressionInline`). Structured
 * rendering of unions / arrays / conditionals / mapped types is deferred (a later
 * phase can walk the `Type` hierarchy with a `TypeVisitor`).
 *
 * `typeToDocletType` also drives {@link objectLiteralMembers}'s reference-name
 * verification: a `ReferenceType.toString()` yields the referenced symbol's bare
 * name (e.g. `Point`, `Foo.Bar` for a nested/namespaced symbol) — never a
 * decorated form (no `module:` prefix, no `import(...)` wrapper, no generic-arg
 * suffix beyond the source spelling) — which is exactly the shape `longnameOf`
 * (`names.ts`) assigns and setu's `linkifyTypeExpression` tokenizes on
 * (`[\w$./~#:]+`). So no bridge change is needed to keep reference types
 * linkable; this module only needs to preserve that `toString()` passthrough.
 */
import type { TDocletParam, TDocletTypeProperty } from '@clean-jsdoc-theme/utils';
import type { DeclarationReflection, ReflectionType, SomeType } from 'typedoc';
import { summaryToHtml, type LinkResolver } from './comment';

/**
 * Convert a TypeDoc type to a doclet type property, or `undefined` when there is
 * no type (so callers can spread it conditionally).
 *
 * `type.toString()` yields the readable TS source (e.g. `string`, `Foo<T>`,
 * `"a" | "b"`); we never emit an empty `names` entry because the schema requires
 * at least one.
 */
export function typeToDocletType(type: SomeType | undefined): TDocletTypeProperty | undefined {
  if (!type) return undefined;
  const name = type.toString();
  if (!name) return undefined;
  return { names: [name] };
}

/**
 * Map an object literal's member reflections to `TDocletParam[]` — the single
 * sink shared by every object-literal recovery path (a param/return's inline
 * type via {@link objectLiteralMembers}, and a type-alias / `const … as const`
 * value via `reflection-to-doclets.ts`'s `objectLiteralProperties`, which reads
 * `children` off a different place depending on how TypeDoc modelled the
 * reflection). Each child → a `name`/`type`/`optional`/`description` entry, the
 * same shape JSDoc's `@property` list uses.
 */
export function objectLiteralMembersFromChildren(
  children: readonly DeclarationReflection[],
  resolveLink: LinkResolver
): TDocletParam[] {
  return children.map((child) => {
    const prop: TDocletParam = { name: child.name };
    const propType = typeToDocletType(child.getSignature?.type ?? child.type);
    if (propType) prop.type = propType;
    if (child.flags?.isOptional) prop.optional = true;
    const description = summaryToHtml(child.comment, resolveLink);
    if (description) prop.description = description;
    return prop;
  });
}

/**
 * Recover the members of an inline object-literal type (`{ a: T; b?: U }`) as
 * `TDocletParam[]`, or `undefined` when `type` isn't an object literal (a
 * `ReflectionType` whose declaration carries member `children` — a function-type
 * reflection has `signatures` instead and is left to the callable path).
 *
 * This is the SAME recovery `reflection-to-doclets.ts`'s `objectLiteralProperties`
 * already does for a type-alias (`type Point = {...}`) and a `const … as const`
 * object literal — both ultimately read a `ReflectionType`'s
 * `declaration.children` through {@link objectLiteralMembersFromChildren}. This
 * function covers the case where the object literal lives on a bare `SomeType`
 * (not a reflection's own `.type`) — i.e. an inline object-literal type on a
 * **parameter** or a **return type** (`param.type` / `signature.type`).
 */
export function objectLiteralMembers(
  type: SomeType | undefined,
  resolveLink: LinkResolver
): TDocletParam[] | undefined {
  if (!type || type.type !== 'reflection') return undefined;
  const declaration = (type as ReflectionType).declaration;
  // A function-type reflection (signatures, no member children) is NOT an object
  // literal — leave it to the callable path.
  if (declaration?.signatures?.length) return undefined;
  const children = declaration?.children;
  if (!children || children.length === 0) return undefined;
  return objectLiteralMembersFromChildren(children, resolveLink);
}

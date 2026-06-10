/**
 * TypeDoc `Type` → JSDoc `TDocletTypeProperty`.
 *
 * v1 keeps types as a single readable string (`type.toString()`), wrapped in the
 * `{ names: [...] }` shape JSDoc uses. This matches how the JSDoc path renders
 * types today (an inline code span via setu's `typeExpressionInline`). Structured
 * rendering of unions / arrays / conditionals / mapped types is deferred (a later
 * phase can walk the `Type` hierarchy with a `TypeVisitor`).
 */
import type { TDocletTypeProperty } from '@clean-jsdoc-theme/utils';
import type { SomeType } from 'typedoc';

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

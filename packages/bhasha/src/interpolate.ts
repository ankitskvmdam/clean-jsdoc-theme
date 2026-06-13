/**
 * Named `{token}` interpolation — the one substitution grammar shared by the
 * runtime `t` and the token-parity validator, so what `t` substitutes and what
 * validation checks can never drift apart.
 *
 * A token is `{identifier}` where identifier is a JS-style name
 * (`[A-Za-z_][A-Za-z0-9_]*`). This deliberately excludes:
 *   - `{@link Foo}` — starts with `@`, not an identifier;
 *   - `{ some.code }` — contains spaces/dots;
 * so JSDoc inline tags and code spans in a slot pass through untouched.
 *
 * ICU plurals/selects are out of scope (deferred per the plan).
 *
 * Pure + browser-safe.
 */

/** Variables for substitution. Numbers are stringified with `String()`. */
export type InterpolationVars = Record<string, string | number>;

/** Matches a single `{identifier}` token. Recreated per use (stateful `g` flag). */
const TOKEN = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/**
 * Substitute `{name}` tokens in `template` from `vars`. A token with no matching
 * var is left **verbatim** (so a missing variable degrades to visible `{name}`
 * rather than an empty hole, and non-token braces survive). With no `vars`, the
 * template is returned unchanged.
 */
export function interpolate(template: string, vars?: InterpolationVars): string {
  if (!vars) return template;
  return template.replace(TOKEN, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
}

/**
 * The unique set of interpolation token names in `template`, in first-seen
 * order. Used by token-parity validation to compare a translation against its
 * source string.
 */
export function interpolationTokens(template: string): string[] {
  const seen = new Set<string>();
  for (const match of template.matchAll(TOKEN)) {
    seen.add(match[1]);
  }
  return [...seen];
}

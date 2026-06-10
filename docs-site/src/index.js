/**
 * A tiny documented module so the API side of the docs-site still renders
 * alongside the prose pages. The docs-site is prose-first — this exists only to
 * prove the docs pipeline coexists with ordinary JSDoc output.
 *
 * @module docs-site
 */

/**
 * Greet someone by name.
 *
 * @param {string} name - The name to greet.
 * @returns {string} A greeting line.
 * @example
 * greet('world'); // => "Hello, world!"
 */
export function greet(name) {
  return `Hello, ${name}!`;
}

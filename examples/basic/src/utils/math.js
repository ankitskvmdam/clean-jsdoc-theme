/**
 * Math utilities
 * @file math.js
 * @namespace MathUtils
 * @category Utilities/Math
 */

/**
 * Add two numbers
 * @memberof MathUtils
 * @static
 * @param {number} a
 * @param {number} b
 * @returns {number}
 * @example
 * add(2, 3); // 5
 * @since 1.0.0
 */
export function add(a, b) {
  return a + b;
}

/**
 * @deprecated Use add instead
 */
export function sum(a, b) {
  return add(a, b);
}

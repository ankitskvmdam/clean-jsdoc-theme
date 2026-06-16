/**
 * Contracts & helpers — the interfaces, mixin, and namespace that the concrete
 * classes build on.
 *
 * @module forge/contracts
 */

/**
 * A minimal key/value store contract. {@link Cache} implements it.
 *
 * @interface Store
 * @category Contracts
 */

/**
 * Read a value by key.
 *
 * @function
 * @name Store#get
 * @param {string} key - Key to read.
 * @returns {*} The stored value, or `undefined`.
 */

/**
 * Write a value by key.
 *
 * @function
 * @name Store#set
 * @param {string} key - Key to write.
 * @param {*} value - Value to store.
 * @returns {Store} The store, for chaining.
 */

/**
 * Anything that can be turned into a JSON-safe snapshot.
 *
 * @interface Serializable
 * @category Contracts
 */

/**
 * Produce a JSON-serializable representation.
 *
 * @function
 * @name Serializable#toJSON
 * @returns {Object} A plain, serializable object.
 */

/**
 * Adds created/updated timestamps to whatever it is mixed into.
 *
 * @mixin
 * @category Contracts
 * @example
 * Object.assign(MyClass.prototype, Timestamped);
 */
export const Timestamped = {
  /**
   * When the host object was created.
   *
   * @memberof module:forge/contracts.Timestamped
   * @type {number}
   */
  createdAt: 0,

  /**
   * Stamp the host object as updated **now**.
   *
   * @memberof module:forge/contracts.Timestamped
   * @this {Object}
   * @returns {void}
   */
  touch() {
    this.updatedAt = Date.now();
  },
};

/**
 * A timestamped record — demonstrates `@mixes`.
 *
 * @class
 * @category Contracts
 * @mixes Timestamped
 */
export class Record {
  /** @param {Object} data - Arbitrary record fields. */
  constructor(data) {
    /** @type {Object} */
    this.data = data;
  }
}

/**
 * String helpers used across Forge.
 *
 * @summary A grab-bag of pure string utilities.
 * @namespace text
 * @category Helpers
 * @borrows module:forge/cache.createCache as seedCache
 */
export const text = {
  /**
   * Convert a string to a URL-friendly slug.
   *
   * @param {string} input - The string to slugify.
   * @returns {string} A lowercase, hyphenated slug.
   * @example
   * text.slugify('Hello World'); // => 'hello-world'
   */
  slugify(input) {
    return input.toLowerCase().replace(/\s+/g, '-');
  },

  /**
   * Truncate a string to `max` characters, appending an ellipsis.
   *
   * @param {string} input - The string to shorten.
   * @param {number} [max=80] - Maximum length before truncation.
   * @returns {string} The truncated string.
   */
  truncate(input, max = 80) {
    return input.length > max ? `${input.slice(0, max)}…` : input;
  },
};

/**
 * Shorthand alias for {@link text.slugify}.
 *
 * @function slug
 * @alias slug
 * @param {string} input - The string to slugify.
 * @returns {string} A lowercase, hyphenated slug.
 */
export const slug = text.slugify;

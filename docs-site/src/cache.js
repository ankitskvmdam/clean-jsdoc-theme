/**
 * Storage primitives — the {@link Cache} class and its helpers.
 *
 * @module forge/cache
 */

/**
 * Options accepted by the {@link Cache} constructor.
 *
 * @typedef {Object} CacheOptions
 * @property {number} [maxSize=100] - Maximum number of entries to keep before
 *   the least-recently-used entry is evicted.
 * @property {number} [ttl=0] - Time-to-live for an entry, in milliseconds. `0`
 *   disables expiry.
 * @property {boolean} [freeze=false] - Freeze values on insert so callers can't
 *   mutate cached objects.
 */

/**
 * A tiny in-memory, least-recently-used (LRU) cache.
 *
 * This class is the showcase's centerpiece: its members exercise nearly every
 * member-level tag the theme renders — parameters, returns, examples, events,
 * deprecation, modifiers, and cross-references.
 *
 * > [!IMPORTANT]
 * > A `Cache` is **not** thread-safe across workers. Wrap shared access in a
 * > {@link Queue} if you need ordered writes.
 *
 * Eviction follows a strict recency order:
 *
 * | Operation | Effect on recency |
 * | --- | --- |
 * | `set(k, v)` | marks `k` most-recently-used |
 * | `get(k)` | marks `k` most-recently-used |
 * | `has(k)` | no change |
 *
 * @category Core/Storage order=1
 * @implements {Store}
 * @implements {Serializable}
 * @example <caption>Basic usage</caption>
 * const cache = new Cache({ maxSize: 2 });
 * cache.set('a', 1).set('b', 2);
 * cache.get('a'); // => 1, and 'a' is now most-recently-used
 * @playground
 *
 * @see {@link CacheOptions}
 * @see {@link createCache} for a one-shot factory
 * @since 1.0.0
 * @version 1.2.0
 * @author The clean-jsdoc-theme team
 */
export class Cache {
  /**
   * Create a new cache.
   *
   * @param {CacheOptions} [options={}] - Configuration for the cache.
   * @param {number} [options.maxSize=100] - Max entries before eviction.
   * @param {number} [options.ttl=0] - Per-entry time-to-live in ms.
   * @throws {RangeError} If `maxSize` is not a positive integer.
   */
  constructor(options = {}) {
    if (options.maxSize !== undefined && options.maxSize <= 0) {
      throw new RangeError('maxSize must be a positive integer');
    }

    /**
     * The maximum number of entries this cache will hold.
     *
     * @type {number}
     */
    this.maxSize = options.maxSize ?? 100;

    /**
     * Time-to-live per entry, in milliseconds. `0` means entries never expire.
     *
     * @type {number}
     */
    this.ttl = options.ttl ?? 0;

    /**
     * Backing store. Not part of the public API.
     *
     * @private
     * @type {Map<string, *>}
     */
    this._store = new Map();
  }

  /**
   * The number of entries currently stored.
   *
   * @readonly
   * @type {number}
   */
  get size() {
    return this._store.size;
  }

  /**
   * Store a value under a key. If the cache is full, the least-recently-used
   * entry is evicted first and a {@link Cache#event:evict|evict event} fires.
   *
   * @param {string} key - The key to store the value under.
   * @param {*} value - The value to cache.
   * @returns {Cache} The cache instance, for chaining.
   * @fires Cache#event:evict
   *
   * @example <caption>Calls chain</caption>
   * cache.set('user:1', { name: 'Ada' }).set('user:2', { name: 'Linus' });
   * @playground codepen jsfiddle filename=set.js highlight=1
   */
  set(key, value) {
    if (this._store.size >= this.maxSize && !this._store.has(key)) {
      const oldest = this._store.keys().next().value;
      this._store.delete(oldest);
    }
    this._store.set(key, value);
    return this;
  }

  /**
   * Look up a value by key, marking it as recently used.
   *
   * @param {string} key - The key to look up.
   * @returns {*} The cached value, or `undefined` if the key is not present.
   */
  get(key) {
    if (!this._store.has(key)) return undefined;
    const value = this._store.get(key);
    this._store.delete(key);
    this._store.set(key, value);
    return value;
  }

  /**
   * Check whether a key is present **without** affecting its recency.
   *
   * @param {string} key - The key to test.
   * @returns {boolean} `true` if the key is cached.
   */
  has(key) {
    return this._store.has(key);
  }

  /**
   * Remove a single entry.
   *
   * @deprecated Since 1.2.0 — prefer {@link Cache#clear} or let entries expire
   *   via `ttl`. This method will be removed in 2.0.
   * @param {string} key - The key to remove.
   * @returns {boolean} `true` if an entry was removed.
   */
  remove(key) {
    return this._store.delete(key);
  }

  /**
   * Remove every entry from the cache.
   *
   * @returns {void}
   */
  clear() {
    this._store.clear();
  }

  /**
   * Serialize the cache to a plain object — satisfies {@link Serializable}.
   *
   * @returns {Object<string, *>} A snapshot of every entry.
   */
  toJSON() {
    return Object.fromEntries(this._store);
  }
}

/**
 * Fired when an entry is evicted to make room for a new one.
 *
 * @event Cache#event:evict
 * @type {Object}
 * @property {string} key - The key that was evicted.
 * @property {*} value - The value that was evicted.
 */

/**
 * Create a {@link Cache} pre-populated from an object of key/value pairs.
 *
 * This is a **global** function (no `@memberof`), so it appears on the
 * aggregated **Globals** page rather than owning its own page.
 *
 * @param {Object<string, *>} entries - Initial entries to seed the cache with.
 * @param {CacheOptions} [options] - Options forwarded to the {@link Cache}
 *   constructor.
 * @returns {Cache} A new, seeded cache.
 *
 * @example
 * const cache = createCache({ a: 1, b: 2 }, { maxSize: 10 });
 * cache.get('b'); // => 2
 *
 * @iframe https://ankdev.me/clean-jsdoc-theme/api-docs/ title="createCache demo" height=360 clickToLoad=true
 * @since 1.0.0
 */
export function createCache(entries, options) {
  const cache = new Cache(options);
  for (const [key, value] of Object.entries(entries)) {
    cache.set(key, value);
  }
  return cache;
}

/**
 * Relative priority for cached writes — a numeric {@link https://jsdoc.app/tags-enum|enum}
 * rendered as a member table on the Globals page.
 *
 * @enum {number}
 * @readonly
 */
export const Priority = {
  /** Lowest priority; processed last. */
  LOW: 0,
  /** Default priority. */
  NORMAL: 1,
  /** Highest priority; jumps the queue. */
  HIGH: 2,
};

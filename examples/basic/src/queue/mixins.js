/**
 * @file Reusable behavior mixins composed into {@link Queue}.
 * @module queue/mixins
 */

/**
 * Adds simple, level-tagged logging to whatever object mixes it in.
 *
 * @mixin Loggable
 * @since 1.1.0
 */
export const Loggable = {
  /**
   * Emit a namespaced log line.
   *
   * @param {string} level - One of `"debug"`, `"info"`, `"warn"`, `"error"`.
   * @param {...*} args - Values to log.
   * @returns {void}
   */
  log(level, ...args) {
    console[level === 'debug' ? 'log' : level](`[queue]`, ...args);
  },
};

/**
 * Adds millisecond timing helpers.
 *
 * @mixin Timed
 * @borrows Timed.now as clock
 */
export const Timed = {
  /**
   * Current high-resolution timestamp in milliseconds.
   *
   * @returns {number} Milliseconds since an arbitrary epoch.
   */
  now() {
    return Date.now();
  },

  /**
   * Measure how long a function takes to run.
   *
   * @param {Function} fn - The function to time.
   * @returns {number} Elapsed milliseconds.
   */
  measure(fn) {
    const start = this.now();
    fn();
    return this.now() - start;
  },
};

/**
 * Register the default observers on a queue. The object literal below documents
 * its members as though they lived on `Queue.prototype`.
 *
 * @param {Object} target - The queue instance to augment.
 * @returns {void}
 */
export function installDefaults(target) {
  Object.assign(
    target,
    /** @lends Queue.prototype */ {
      /**
       * Default no-op observer; replace via {@link Queue#observe}.
       *
       * @param {JobDescriptor} job - The job that transitioned.
       * @returns {void}
       */
      onTransition(job) {},
    }
  );
}

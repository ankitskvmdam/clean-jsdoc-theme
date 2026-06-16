/**
 * This file has **no imports or exports**, so JSDoc treats it as a script and
 * its symbols as *global*. Every global-scope symbol that doesn't own its own
 * page is collected onto a single aggregated **Globals** page — one section per
 * symbol. That's what this file demonstrates: a free function, a constant, and
 * an enum, all living together on `Globals`.
 */

/* eslint-disable no-unused-vars */

/**
 * Severity levels for Forge's logger — a global numeric enum, rendered as a
 * member table in the Globals page section.
 *
 * @global
 * @enum {number}
 * @readonly
 */
const LogLevel = {
  /** Diagnostic detail. */
  DEBUG: 10,
  /** Normal operation. */
  INFO: 20,
  /** Something looks off. */
  WARN: 30,
  /** A failure occurred. */
  ERROR: 40,
};

/**
 * Default options applied to every {@link Queue} when none are supplied.
 *
 * @global
 * @constant {Object}
 * @property {number} concurrency - Default parallelism.
 * @property {boolean} autoStart - Whether to drain on push.
 */
const DEFAULT_OPTIONS = {
  concurrency: 1,
  autoStart: true,
};

/**
 * Define a {@link Task} without writing the object literal by hand.
 *
 * A convenience global that mirrors the {@link createCache} factory — handy for
 * one-liners.
 *
 * @global
 * @param {string} id - Stable task identifier.
 * @param {TaskHandler} run - The work to perform.
 * @param {Priority} [priority=Priority.NORMAL] - Scheduling weight.
 * @returns {Task} The assembled task.
 *
 * @example <caption>Define and enqueue a task</caption>
 * const task = defineTask('reindex', async () => rebuildIndex());
 * queue.push(task);
 * @see {@link Queue#push}
 */
function defineTask(id, run, priority) {
  return { id, run, priority };
}

/**
 * @file The abstract base every concrete job extends.
 * @module queue/AbstractJob
 */

/**
 * @classdesc Base class for all jobs. It tracks identity, retry budget and the
 *   current {@link JobState}, leaving the actual work to subclasses via the
 *   {@link AbstractJob#execute} hook. You never instantiate this directly.
 *
 * @class AbstractJob
 * @abstract
 * @implements {Serializable}
 * @param {string} id - Unique identifier for this job.
 * @param {number} [maxRetries=0] - Allowed retry attempts on failure.
 * @since 1.0.0
 * @author Ankit Kumar <ankit@example.com>
 */
export class AbstractJob {
  constructor(id, maxRetries = 0) {
    /**
     * The stable job identifier.
     * @type {string}
     * @readonly
     * @instance
     */
    this.id = id;

    /**
     * Remaining retry budget.
     * @member {number}
     * @protected
     */
    this.retriesLeft = maxRetries;

    /**
     * Internal attempt counter, not part of the public API.
     * @type {number}
     * @access package
     */
    this.attempts = 0;
  }

  /**
   * The concrete work this job performs. Subclasses **must** override it.
   *
   * @abstract
   * @async
   * @param {Object} [context] - Ambient data supplied by the running queue.
   * @returns {Promise<*>} The job's result.
   * @throws {Error} Always, unless overridden — the base implementation refuses
   *   to run.
   */
  async execute(context) {
    throw new Error('AbstractJob#execute must be implemented by a subclass');
  }

  /**
   * Whether this job may be retried after a failure.
   *
   * @returns {boolean} `true` while retry budget remains.
   * @this AbstractJob
   */
  canRetry() {
    return this.retriesLeft > 0;
  }

  /**
   * Build a fresh job id namespaced to a queue.
   *
   * @static
   * @param {string} queueName - The owning queue's name.
   * @param {number} seq - A monotonically increasing sequence number.
   * @returns {string} A namespaced id like `"emails:42"`.
   */
  static makeId(queueName, seq) {
    return `${queueName}:${seq}`;
  }

  /**
   * @override
   * @returns {Object} A JSON-safe snapshot, per the {@link Serializable} contract.
   */
  toJSON() {
    return { id: this.id, retriesLeft: this.retriesLeft };
  }
}

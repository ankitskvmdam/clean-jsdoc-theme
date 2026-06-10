/**
 * @file The priority job queue engine.
 * @module queue/Queue
 * @order 1
 * @requires module:queue/types
 * @requires module:queue/mixins
 */

import { Priority, JobState } from './types.js';
import { Loggable, Timed } from './mixins.js';

/**
 * @classdesc An in-memory, priority-ordered job queue with bounded concurrency,
 *   retries and a rich event stream. It extends Node's
 *   {@link external:EventEmitter}, satisfies the {@link Drainable} contract and
 *   mixes in {@link Loggable} and {@link Timed} behavior.
 * @summary Priority job queue with retries and events.
 *
 * @class Queue
 * @augments external:EventEmitter
 * @implements {Drainable}
 * @mixes Loggable
 * @mixes Timed
 * @since 1.0.0
 * @version 3.1.0
 * @author Ankit Kumar <ankit@example.com>
 * @see AbstractJob
 * @see {@link Priority}
 * @tutorial getting-started
 *
 * @example <caption>Draining a couple of jobs</caption>
 * const q = new Queue('emails', { concurrency: 2 });
 * q.enqueue({ id: 'welcome', run: () => sendWelcome() });
 * q.on('drained', (report) => console.log(report.completed));
 * await q.drain();
 */
export class Queue {
  /**
   * The queue's human-readable name.
   * @type {string}
   * @readonly
   * @instance
   */
  name;

  /**
   * Live job records keyed by id.
   * @type {Map<string, JobDescriptor>}
   * @private
   */
  #jobs = new Map();

  /**
   * Max jobs allowed to run concurrently.
   * @type {number}
   * @protected
   */
  _concurrency;

  /**
   * Build a new queue.
   *
   * @param {string} name - A unique, human-readable queue name.
   * @param {Object} [options] - Tuning knobs.
   * @param {number} [options.concurrency=4] - Max simultaneous jobs.
   * @param {number} [options.backoffMs=250] - Base retry back-off.
   * @listens Queue#event:jobFailed
   */
  constructor(name, options = {}) {
    this.name = name;
    this._concurrency = options.concurrency ?? 4;
    this.#backoff = options.backoffMs ?? 250;
  }

  /**
   * Base retry back-off in milliseconds.
   * @type {number}
   * @private
   */
  #backoff = 250;

  /**
   * Number of jobs still pending, fulfilling {@link Drainable#size}.
   *
   * @member {number}
   * @readonly
   * @public
   */
  get size() {
    return this.#jobs.size;
  }

  /**
   * Add a job to the queue.
   *
   * @param {JobDescriptor} job - The job to schedule.
   * @param {number} [priority={@link Priority.NORMAL}] - Override the priority.
   * @returns {string} The enqueued job's id.
   * @fires Queue#jobAdded
   * @throws {TypeError} If `job.id` is missing or already enqueued.
   * @example
   * q.enqueue({ id: 'resize', run: resize }, Priority.HIGH);
   */
  enqueue(job, priority = Priority.NORMAL) {
    if (!job || !job.id) throw new TypeError('job.id is required');
    if (this.#jobs.has(job.id)) throw new TypeError(`duplicate id: ${job.id}`);
    this.#jobs.set(job.id, { priority, ...job });

    /**
     * Fired immediately after a job is accepted into the queue.
     *
     * @event Queue#jobAdded
     * @type {object}
     * @property {string} id - The id of the job that was added.
     * @property {number} priority - The priority it was scheduled at.
     */
    this.emit('jobAdded', { id: job.id, priority });
    return job.id;
  }

  /**
   * Run every pending job, honoring priority and concurrency, then resolve.
   *
   * @async
   * @override
   * @param {Object} [context] - Ambient data passed to each job's `run`.
   * @returns {Promise<DrainReport>} A summary of the drain.
   * @fires Queue#emits drained
   * @example
   * const report = await q.drain({ user });
   */
  async drain(context) {
    const started = this.now();
    let completed = 0;
    let failed = 0;
    // ...scheduling elided for brevity...
    this.#jobs.clear();

    /**
     * Fired once the queue has no pending jobs left.
     *
     * @event Queue#drained
     * @type {DrainReport}
     */
    this.emit('drained', { completed, failed, durationMs: this.now() - started });
    return { completed, failed, durationMs: this.now() - started };
  }

  /**
   * Iterate over pending jobs in priority order without removing them.
   *
   * @generator
   * @yields {JobDescriptor} The next job, highest priority first.
   */
  *peek() {
    const ordered = [...this.#jobs.values()].sort((a, b) => b.priority - a.priority);
    for (const job of ordered) yield job;
  }

  /**
   * Register an observer for every job state transition.
   *
   * @param {JobObserver} fn - Called on each transition.
   * @returns {this} The queue, for chaining.
   * @public
   */
  observe(fn) {
    this.on('transition', fn);
    return this;
  }

  /**
   * Remove a job by id.
   *
   * @method remove
   * @param {string} id - The id of the job to drop.
   * @returns {boolean} `true` if a job was removed.
   */
  remove(id) {
    return this.#jobs.delete(id);
  }

  /**
   * Remove a job, returning the removed descriptor instead of a boolean.
   *
   * @function remove
   * @variation 2
   * @alias Queue#take
   * @param {string} id - The id of the job to drop.
   * @returns {?JobDescriptor} The removed job, or `null` if absent.
   */
  take(id) {
    const job = this.#jobs.get(id) ?? null;
    this.#jobs.delete(id);
    return job;
  }

  /**
   * Drop every pending job.
   *
   * @returns {void}
   * @deprecated Since 3.0.0 — prefer {@link Queue#drain} so observers still
   *   receive a {@link Queue#event:drained} report. Slated for removal in 4.0.
   * @todo Emit a `cleared` event before the 4.0 removal so callers can migrate.
   */
  clear() {
    this.#jobs.clear();
  }

  /**
   * Spin up a queue and immediately drain a batch of jobs.
   *
   * @static
   * @async
   * @param {string} name - Name for the throwaway queue.
   * @param {JobDescriptor[]} jobs - Jobs to run.
   * @return {Promise<DrainReport>} The drain summary.
   */
  static async runBatch(name, jobs) {
    const q = new Queue(name);
    for (const job of jobs) q.enqueue(job);
    return q.drain();
  }
}

Object.assign(Queue.prototype, Loggable, Timed);

/**
 * @classdesc Read-only metrics snapshot for a {@link Queue}. Instances are
 *   produced internally by the queue and never constructed directly.
 *
 * @class QueueMetrics
 * @kind class
 * @hideconstructor
 * @package
 */
export class QueueMetrics {
  constructor(snapshot) {
    /**
     * Jobs processed since the queue was created.
     * @type {number}
     * @readonly
     */
    this.processed = snapshot.processed;
  }

  /**
   * Pull the latest metrics for a queue.
   *
   * @summary Snapshot a queue's counters.
   * @desc Synonym of `@description`, demonstrated here on a static factory.
   * @static
   * @param {Queue} queue - The queue to inspect.
   * @returns {QueueMetrics} A frozen snapshot.
   * @inheritdoc
   */
  static of(queue) {
    return new QueueMetrics({ processed: queue.size });
  }
}

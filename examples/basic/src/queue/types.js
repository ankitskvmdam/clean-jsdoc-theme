/**
 * @file Shared type definitions, enums and the {@link Queue~config} namespace.
 * @module queue/types
 * @author Ankit Kumar <ankit@example.com>
 * @since 1.0.0
 */

/**
 * Priority levels a job can be scheduled at. Higher numbers run first.
 *
 * @enum {number}
 * @readonly
 * @since 1.0.0
 */
export const Priority = {
  /** Background work; runs only when the queue is otherwise idle. */
  LOW: 0,
  /** The default priority for newly enqueued jobs.
   * @default */
  NORMAL: 5,
  /** Time-sensitive work that jumps ahead of normal jobs. */
  HIGH: 10,
};

/**
 * The lifecycle states a job moves through.
 *
 * @enum {string}
 * @readonly
 */
export const JobState = {
  PENDING: 'pending',
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
};

/**
 * A single unit of work accepted by {@link Queue#enqueue}.
 *
 * @typedef {Object} JobDescriptor
 * @property {string} id - Stable, unique identifier for the job.
 * @property {Function} run - The work to perform; may return a `Promise`.
 * @property {number} [priority={@link Priority.NORMAL}] - Scheduling weight.
 * @property {number} [maxRetries=0] - How many times to retry on failure.
 * @property {Object.<string, *>} [meta] - Arbitrary user metadata.
 */

/**
 * The summary object resolved once the queue drains.
 *
 * @typedef {Object} DrainReport
 * @property {number} completed - Count of jobs that finished successfully.
 * @property {number} failed - Count of jobs that exhausted their retries.
 * @property {number} durationMs - Wall-clock time spent draining.
 */

/**
 * Callback invoked for every state transition of a job.
 *
 * @callback JobObserver
 * @param {JobDescriptor} job - The job whose state changed.
 * @param {string} from - The previous {@link JobState}.
 * @param {string} to - The new {@link JobState}.
 * @returns {void}
 */

/**
 * Default, tunable configuration knobs for a {@link Queue}.
 *
 * @namespace config
 * @memberof module:queue/types
 */
export const config = {
  /**
   * Maximum number of jobs allowed to run at once.
   *
   * @name concurrency
   * @memberof module:queue/types.config
   * @type {number}
   * @default 4
   */
  concurrency: 4,

  /**
   * Base back-off delay (ms) between retries; doubles each attempt.
   *
   * @member {number}
   * @default 250
   */
  backoffMs: 250,
};

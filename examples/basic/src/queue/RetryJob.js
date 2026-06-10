/**
 * @file A concrete job with exponential back-off — uses the synonym spellings
 *   of the common tags (`@extends`, `@emits`, `@arg`, `@prop`, …) on purpose.
 * @module queue/RetryJob
 * @order 3
 * @requires module:queue/AbstractJob
 */

import { AbstractJob } from './AbstractJob.js';

/**
 * @classdesc A job that retries its work with exponential back-off, emitting an
 *   event on each attempt. Inherits identity and retry budget from
 *   {@linkcode AbstractJob}; see also {@linkplain Queue} for scheduling.
 *
 * @constructor RetryJob
 * @extends AbstractJob
 * @since 2.0.0
 */
export class RetryJob extends AbstractJob {
  /**
   * @param {string} id - Unique job id.
   * @arg {Function} work - The async function to run.
   * @argument {number} [maxRetries=3] - How many times to retry.
   */
  constructor(id, work, maxRetries = 3) {
    super(id, maxRetries);

    /**
     * The wrapped unit of work.
     * @var {Function}
     */
    this.work = work;

    /**
     * Per-attempt timing data.
     * @prop {number[]} timings - Elapsed ms recorded for each attempt.
     */
    this.timings = [];
  }

  /**
   * Run the wrapped work, retrying with back-off until it succeeds or the
   * retry budget is exhausted.
   *
   * @method run
   * @async
   * @arg {Object} [context] - Ambient data forwarded to the work function.
   * @return {Promise<*>} Whatever the work function resolves to.
   * @emits RetryJob#attempt
   * @exception {Error} Re-thrown from the final failed attempt.
   */
  async run(context) {
    /**
     * Fired before each attempt (including the first).
     * @event RetryJob#attempt
     * @type {object}
     * @prop {number} attempt - 1-based attempt number.
     */
    return this.work(context);
  }

  /**
   * Lazily yield the back-off delay (ms) for each successive attempt.
   *
   * @generator
   * @func backoffSchedule
   * @yield {number} The delay before the next attempt.
   */
  *backoffSchedule() {
    let delay = BASE_DELAY;
    while (this.canRetry()) {
      yield delay;
      delay *= 2;
    }
  }
}

/**
 * The base back-off delay, in milliseconds, before the first retry.
 *
 * @const {number}
 * @defaultvalue 100
 */
const BASE_DELAY = 100;

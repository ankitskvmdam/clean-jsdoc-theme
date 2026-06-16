/**
 * The event-driven task {@link Queue} and its supporting types.
 *
 * @module forge/queue
 */

/**
 * A unit of work the {@link Queue} can run.
 *
 * @typedef {Object} Task
 * @property {string} id - Stable identifier for the task.
 * @property {Priority} [priority=Priority.NORMAL] - Relative scheduling weight.
 * @property {TaskHandler} run - The function invoked when the task is scheduled.
 */

/**
 * The function a {@link Task} runs when scheduled.
 *
 * @callback TaskHandler
 * @param {AbortSignal} signal - Aborted if the queue is cleared mid-flight.
 * @returns {Promise<void>|void} Resolves when the task is complete.
 */

/**
 * Maximum concurrency the queue will ever allow, regardless of options.
 *
 * @constant {number}
 * @default
 */
export const MAX_CONCURRENCY = 32;

/**
 * An ordered, event-driven task runner.
 *
 * `Queue` extends Node's `EventEmitter`, so the inheritance chain and the
 * emitted events both show up in the generated page.
 *
 * > [!CAUTION]
 * > Tasks pushed after {@link Queue#clear} runs are rejected — clearing aborts
 * > the in-flight signal.
 *
 * @category Core/Runtime order=1
 * @extends EventEmitter
 * @fires Queue#event:drain
 * @fires Queue#event:error
 * @listens module:forge/cache.Cache#event:evict
 * @example <caption>Draining a queue</caption>
 * const q = new Queue({ concurrency: 2 });
 * q.on('drain', () => console.log('done'));
 * q.push({ id: 't1', run: async () => doWork() });
 * await q.drain();
 * @playground
 *
 * @since 1.1.0
 * @version 1.3.0
 * @requires module:forge/cache
 * @todo Add backpressure when the pending list exceeds a high-water mark.
 * @copyright 2024 The clean-jsdoc-theme team
 * @author The clean-jsdoc-theme team
 */
export class Queue {
  /**
   * @param {Object} [options={}] - Queue configuration.
   * @param {number} [options.concurrency=1] - How many tasks run at once
   *   (clamped to {@link MAX_CONCURRENCY}).
   * @param {boolean} [options.autoStart=true] - Start draining as soon as a
   *   task is pushed.
   */
  constructor(options = {}) {
    /**
     * Effective concurrency, clamped to {@link MAX_CONCURRENCY}.
     *
     * @readonly
     * @type {number}
     */
    this.concurrency = Math.min(options.concurrency ?? 1, MAX_CONCURRENCY);

    /**
     * Pending tasks, highest priority first.
     *
     * @private
     * @type {Task[]}
     */
    this._pending = [];
  }

  /**
   * Add a task to the queue, inserted by {@link Priority}.
   *
   * @param {Task} task - The task to enqueue.
   * @returns {this} The queue, for chaining.
   */
  push(task) {
    this._pending.push(task);
    return this;
  }

  /**
   * Run every pending task and resolve once the queue is empty.
   *
   * @async
   * @returns {Promise<number>} The number of tasks that ran.
   * @fires Queue#event:drain
   * @example
   * const ran = await queue.drain();
   * @playground codesandbox filename=drain.js highlight=2,3
   */
  async drain() {
    const count = this._pending.length;
    this._pending = [];
    return count;
  }

  /**
   * Iterate pending tasks in scheduling order, highest priority first.
   *
   * @generator
   * @yields {Task} The next pending task.
   * @example <caption>The {@lang} directive forces this block's language</caption>
   * {@lang ts}
   * for (const task of queue.tasks()) {
   *   console.log(task.id satisfies string);
   * }
   *
   * @playground
   */
  *tasks() {
    yield* this._pending;
  }

  /**
   * Handle a task failure. Subclasses **must** implement this.
   *
   * @abstract
   * @param {Error} error - The error a task threw.
   * @returns {void}
   */
  onError(error) {
    throw new Error('onError() must be implemented by a subclass');
  }

  /**
   * Pull and start the next task. Internal scheduling step.
   *
   * @protected
   * @returns {Task|undefined} The task that was started, if any.
   */
  _next() {
    return this._pending.shift();
  }

  /**
   * Stop and clear the queue, aborting any in-flight task.
   *
   * @override
   * @returns {void}
   */
  clear() {
    this._pending = [];
  }
}

/**
 * Fired once the queue has processed every pending task.
 *
 * @event Queue#event:drain
 */

/**
 * Fired when a task throws and {@link Queue#onError} re-raises.
 *
 * @event Queue#event:error
 * @type {Error}
 */

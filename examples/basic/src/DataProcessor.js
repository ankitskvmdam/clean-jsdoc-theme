/**
 * @requires module:CoreSchema
 * @summary Advanced data processing suite.
 * @description This class extends the {@link BaseEntity} to provide
 * async processing and event-driven updates.
 * @tutorial processing-guide
 * @author Ankit Kumar <mailto:ankit@example.com>
 */
class DataProcessor extends BaseEntity {
  /**
   * @private
   * @type {number}
   * @default 0
   */
  #processCount = 0;

  /**
   * Current processing state.
   * @enum {number}
   */
  static States = {
    IDLE: 0,
    BUSY: 1,
    ERROR: 2,
  };

  /**
   * @param {string} id - The processor ID.
   * @param {Object} [options] - Configuration.
   * @param {number} [options.timeout=5000] - Timeout in ms.
   */
  constructor(id, options = {}) {
    super(id);
    this.timeout = options.timeout ?? 5000;
  }

  /**
   * Processes a data stream asynchronously.
   * @async
   * @param {string[]} data - Array of strings to process.
   * @returns {Promise<number>} The total count of processed items.
   * @fires DataProcessor#dataProcessed
   * @since 1.2.0
   * @version 2.0.1
   * @deprecated Use the internal {@linkcode DataProcessor#streamEngine} instead.
   * @example const proc = new DataProcessor('main');
   * await proc.process(['a', 'b']);
   */
  async process(data) {
    // Implementation logic
    this.#processCount += data.length;
    /**
     * Event fired when data is successfully processed.
     * @event DataProcessor#dataProcessed
     * @type {object}
     * @property {number} count - Total items processed.
     */
    return this.#processCount;
  }

  /**
   * Generates a sequence of IDs.
   * @generator
   * @yields {string} The next formatted ID in the sequence.
   */
  *idGenerator() {
    while (true) {
      yield `ID-${Math.random()}`;
    }
  }

  /**
   * @override
   * @returns {string}
   */
  serialize() {
    return JSON.stringify({ id: this._id, count: this.#processCount });
  }

  /**
   * Utility to check if a value is a valid ID.
   * @static
   * @param {*} val - The value to test.
   * @returns {boolean}
   * @todo Add regex validation for stricter ID checks.
   */
  static isValidId(val) {
    return typeof val === 'string' && val.length > 0;
  }
}

/**
 * A mixin to add logging capabilities.
 * @mixin LoggerMixin
 */
const LoggerMixin = {
  /**
   * Log a message to the console.
   * @param {string} msg
   */
  log(msg) {
    console.log(msg);
  },
};

/**
 * @namespace Utils
 * @description Helper utilities for the global scope.
 */
const Utils = {
  /**
   * @constant
   * @type {string}
   * @default 'v1'
   */
  API_VERSION: 'v1',
};

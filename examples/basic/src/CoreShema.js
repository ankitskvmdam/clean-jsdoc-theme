/**
 * @file Project core schema definitions for the analytics engine.
 * @module CoreSchema
 * @category Core/Schema order=2
 * @author Jane Doe <j.doe@example.com>
 * @copyright 2026 TechCorp
 * @license MIT
 */

/**
 * A simple coordinate type used across the module.
 *
 * This is just a test comment to see what we get in the data.json.
 * <a href="Adding something interesting">Adding something interesting</a>
 * @typedef {Object} Point
 * @property {number} x - The horizontal component.
 * @property {number} y - The vertical component.
 */

/**
 * Callback for handling data stream chunks.
 * @callback DataHandler
 * @param {string} chunk - The raw data chunk.
 * @param {number} index - The sequence index.
 * @returns {boolean} Whether to continue processing.
 */

/**
 * Interface for any object that can be serialized.
 * @interface ISerializable
 */
class ISerializable {
  /**
   * Convert the object to a JSON string.
   * @abstract
   * @returns {string}
   */
  serialize() {
    throw new Error("Method 'serialize()' must be implemented.");
  }
}

/**
 * Abstract base class for data entities.
 * @class
 * @abstract
 * @hideconstructor
 * @implements {ISerializable}
 * @see {@link https://en.wikipedia.org/wiki/Data_model|Data Modeling}
 */
class BaseEntity {
  /**
   * @protected
   * @type {string}
   */
  _id;

  /**
   * Create an entity.
   * @param {string} id - Unique identifier.
   * @throws {TypeError} If ID is not a string.
   */
  constructor(id) {
    if (typeof id !== 'string') throw new TypeError('Invalid ID');
    this._id = id;
  }

  /**
   * The unique identifier for this entity.
   * @type {string}
   * @readonly
   * @public
   */
  get id() {
    return this._id;
  }
}

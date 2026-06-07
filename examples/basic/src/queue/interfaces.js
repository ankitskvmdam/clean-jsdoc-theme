/**
 * @file Structural interfaces implemented across the queue library.
 * @module queue/interfaces
 */

/**
 * Anything whose outstanding work can be flushed to completion.
 *
 * @interface Drainable
 * @since 1.0.0
 */

/**
 * Run every pending unit of work and resolve once none remain.
 *
 * @function
 * @name Drainable#drain
 * @abstract
 * @async
 * @returns {Promise<void>} Resolves when the implementor is empty.
 */

/**
 * The number of items still awaiting processing.
 *
 * @member {number} Drainable#size
 * @readonly
 * @abstract
 */

/**
 * Anything that can describe itself as a plain, serializable object.
 *
 * @interface Serializable
 */

/**
 * Produce a JSON-safe snapshot of this object.
 *
 * @method Serializable#toJSON
 * @virtual
 * @returns {Object} A structurally-cloneable representation.
 */

/**
 * @file External symbols and process-wide globals the queue relies on.
 * @module queue/externals
 */

/**
 * Node's built-in event emitter, which {@link Queue} extends.
 *
 * @external EventEmitter
 * @see {@link https://nodejs.org/api/events.html#class-eventemitter}
 */

/**
 * The standard built-in `Promise` object.
 *
 * @external Promise
 * @host
 * @see {@link https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise}
 */

/**
 * A process-wide registry of every live queue, keyed by name.
 *
 * @global
 * @constant {Map<string, Queue>}
 * @default
 */
const QUEUE_REGISTRY = new Map();

/**
 * Internal counter used to mint default queue names. Hidden from the docs.
 *
 * @inner
 * @ignore
 */
let _anonSeq = 0;

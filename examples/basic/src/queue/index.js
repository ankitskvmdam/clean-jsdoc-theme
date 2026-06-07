/**
 * @file Entry point for the Job Queue library — re-exports the public surface.
 * @fileoverview A tiny in-memory job queue with priorities, retries and events.
 * @overview (synonym of `@file`/`@fileoverview`) kept here to demonstrate the
 *   file-overview tag family resolving to a single file description.
 *
 * @module queue
 * @summary The one-stop import for the queue library.
 * @description Pulls together the {@link Queue} engine, the {@link AbstractJob}
 *   base class and the shared {@link module:queue/types|type definitions} into a
 *   single ergonomic entry point. Start with the
 *   {@tutorial getting-started} guide.
 *
 * @author Ankit Kumar <ankit@example.com>
 * @copyright 2026 Ankit Kumar. All rights reserved.
 * @license MIT
 * @version 3.1.0
 * @since 1.0.0
 *
 * @requires module:queue/types
 * @requires module:queue/mixins
 * @see {@link Queue} for the main engine.
 * @see {@link https://en.wikipedia.org/wiki/Job_queue|Job queue (Wikipedia)}
 * @tutorial getting-started
 */

export { Queue } from './Queue.js';
export { AbstractJob } from './AbstractJob.js';

/**
 * The semantic version of the queue library, exported from this module.
 *
 * @exports queue/VERSION
 * @constant {string}
 * @default
 * @since 1.0.0
 */
export const VERSION = '3.1.0';

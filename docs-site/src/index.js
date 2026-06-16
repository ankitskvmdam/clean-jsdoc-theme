/**
 * **Forge** is a tiny, fictional toolkit for building event-driven data
 * pipelines. It does not do anything real — it exists to show, on a single
 * generated site, **every** JSDoc construct and **every** authoring component
 * that `clean-jsdoc-theme` understands.
 *
 * Use it as a living checklist: classes, interfaces, mixins, namespaces,
 * typedefs, enums, events, constants, and globals are all here, and each pulls
 * in a different slice of the theme's feature set.
 *
 * > [!NOTE]
 * > Everything you're reading — this callout, the stepper below, the tabs, the
 * > table, and the embedded demo — is authored **inline in a doc comment**. The
 * > markers `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, and `[!CAUTION]`
 * > each render as a differently-styled callout.
 *
 * > [!TIP]
 * > Reach for {@link Cache} when you need fast key/value storage, and
 * > {@link Queue} when you need ordered, event-driven task processing.
 *
 * ## Quick start
 *
 * <steps>
 *
 * <step label="Create a cache">
 *
 * Build a {@link Cache}, optionally capping how many entries it holds:
 *
 * ```js
 * import { Cache } from 'forge';
 * const cache = new Cache({ maxSize: 2 });
 * ```
 *
 * </step>
 *
 * <step label="Queue some work">
 *
 * A {@link Queue} runs tasks in priority order and emits events as it drains:
 *
 * ```js
 * import { Queue } from 'forge';
 * const q = new Queue({ concurrency: 2 });
 * q.on('drain', () => console.log('all done'));
 * ```
 *
 * </step>
 *
 * <step label="Wire them together">
 *
 * Read-through a cache from inside a queued task and you have a tiny pipeline.
 *
 * </step>
 *
 * </steps>
 *
 * ## Install
 *
 * <tabs>
 *
 * <tab label="npm">
 *
 * ```sh
 * npm install --save-dev jsdoc clean-jsdoc-theme
 * ```
 *
 * </tab>
 *
 * <tab label="pnpm">
 *
 * ```sh
 * pnpm add -D jsdoc clean-jsdoc-theme
 * ```
 *
 * </tab>
 *
 * <tab label="yarn">
 *
 * ```sh
 * yarn add -D jsdoc clean-jsdoc-theme
 * ```
 *
 * </tab>
 *
 * </tabs>
 *
 * ## What's in the box
 *
 * | Symbol | Kind | Highlights it demonstrates |
 * | --- | --- | --- |
 * | {@link Cache} | class | constructor, getters, `@deprecated`, `@fires`, `@playground` |
 * | {@link Queue} | class | `@extends`, events, `@async`, `@generator`, `@abstract` |
 * | {@link Store} | interface | `@interface` + `@implements` |
 * | {@link Timestamped} | mixin | `@mixin` + `@mixes` |
 * | {@link text} | namespace | `@namespace` + `@borrows` |
 * | {@link Priority} | enum | `@enum` rendered as a member table |
 *
 * ## Roadmap
 *
 * - [x] Caching primitives
 * - [x] Event-driven queue
 * - [ ] Persistent backends
 * - [ ] Streaming transforms
 *
 * ## Live demo
 *
 * The embed below is authored with the `@iframe` block tag (see the module's
 * source) — it points at this very site and re-themes itself when you flip
 * light/dark. In **prose** (README, tutorials, the `docs` folder) you can author
 * the same thing with a ` ```iframe ` fenced code block instead.
 *
 * @module forge
 * @iframe https://ankdev.me/clean-jsdoc-theme/api-docs/ title="Forge API reference" height=420
 * @see {@link Cache}
 * @see {@link Queue}
 * @author The clean-jsdoc-theme team
 * @license MIT
 * @since 1.0.0
 */

/**
 * The current Forge version. A module-level {@linkcode constant} rendered with a
 * **Type** and **Default** row.
 *
 * @constant {string}
 * @default
 */
export const VERSION = '1.0.0';

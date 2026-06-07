queue/ — JSDoc tag-coverage fixture
===================================

WHY THIS DIRECTORY EXISTS
-------------------------
This is a hand-written fixture for the clean-jsdoc-theme v5 pipeline. Its one
job is to exercise (almost) every JSDoc *block tag* — and every inline tag — in
a single coherent, realistic codebase, so the theme can be tested against the
full surface of JSDoc syntax rather than the handful of tags the other example
files happen to use.

It is a FIXTURE, not real shipping code. The bodies are stubs; only the JSDoc
comments matter. None of it is imported by the rest of examples/basic.

It deliberately does NOT touch any pre-existing files in examples/basic — every
file here is new and self-contained under this one directory.


THE DOMAIN (so the tags read naturally)
---------------------------------------
A tiny in-memory "job queue" library: you enqueue jobs, the queue runs them with
bounded concurrency / priorities / retries and emits events as they progress.
The domain was chosen because it naturally motivates classes, inheritance,
interfaces, mixins, events, async, generators, enums and typedefs — i.e. it
gives every tag a believable home.


FILE MAP — what each file is for and which tags it anchors
----------------------------------------------------------
index.js
    Module entry / public re-exports.
    @file @fileoverview @overview @module @author @copyright @license @version
    @since @requires @exports @see @tutorial @summary @description
    @constant/@const @default

types.js
    Enums, typedefs, a callback and a config namespace.
    @enum @typedef @callback @property @namespace @member/@var @name @memberof
    @type @readonly

interfaces.js
    Structural interfaces (Drainable, Serializable).
    @interface @abstract/@virtual @function/@method @async

AbstractJob.js
    The abstract base class concrete jobs extend.
    @class @classdesc @abstract @constructs @implements @access @protected
    @package @override @static @instance @this @throws @readonly

Queue.js
    The main engine: Queue (extends EventEmitter, implements Drainable, mixes in
    Loggable + Timed) plus an internal QueueMetrics class.
    @augments @implements @mixes @fires/@emits @event @async @generator @yields
    @deprecated @todo @override @inheritdoc @listens @variation @alias
    @hideconstructor @kind @public @private @protected @readonly @desc

mixins.js
    Reusable behavior objects composed into Queue.
    @mixin @borrows @lends

externals.js
    External symbols (EventEmitter, Promise) and process-wide globals.
    @external/@host @global @inner @ignore @constant

RetryJob.js
    A concrete job. This file exists specifically to cover the SYNONYM spellings
    of the common tags, so the primary files can stay clean:
    @constructor @extends @emits @func @var @arg @argument @prop @exception
    @yield @const @defaultvalue  + inline @linkcode / @linkplain

Inline tags ({@link}, {@linkcode}, {@linkplain}, {@tutorial}) appear in prose
throughout — see index.js, Queue.js and RetryJob.js.


HOW TO USE IT
-------------
jsdoc.json already includes "./src" recursively, so this directory is picked up
automatically. From examples/basic:

    pnpm run docs            # build:theme (turbo) -> jsdoc -> dist/
    pnpm dlx serve dist      # view the output

Then look at the generated pages for Queue / QueueMetrics / AbstractJob /
RetryJob to see how the theme renders each construct.

NOTE on current theme coverage: setu (the JSDoc -> SiteManifest stage) renders
`kind: 'class'` doclets into pages today. So the four classes above produce API
pages; the module / namespace / interface / typedef / mixin / external doclets
are still emitted into the doclet collection (and are useful for testing as that
coverage lands), but won't each get their own page yet. See ARCHITECTURE.md at
the repo root ("API coverage today: kind: 'class' only").


MAINTENANCE
-----------
- All files are valid JS (`node --check`) so JSDoc can parse them as real source.
- If you add a tag here, prefer giving it a believable home in the existing
  domain rather than inventing a new throwaway symbol.

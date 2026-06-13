/**
 * `@clean-jsdoc-theme/aadesh` — the localization CLI + its building blocks.
 *
 * Phase 3 (in progress): the pure locale-artifact core — template building from
 * a built site's slots, locale-file (de)serialization, and the extract/merge
 * (new/stale/obsolete classification + soft-delete + prune). Disk I/O, the jsdoc
 * pipeline, and the interactive CLI build on top of this.
 */

export const AADESH_PACKAGE_VERSION = '5.0.0-alpha.0';

export * from './locale';

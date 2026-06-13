/**
 * `@clean-jsdoc-theme/aadesh` — the localization CLI + its building blocks.
 *
 * Phase 3 (in progress): the locale-artifact core (template + extract/merge),
 * the config reader, the disk + pipeline layers, and the `extract` / `validate` /
 * `prompt` commands. The heavy per-locale `build` (stamp → render → /<locale>/
 * sites + cross-locale index) lands in a later chunk.
 */

export const AADESH_PACKAGE_VERSION = '5.0.0-alpha.0';

export * from './locale';
export * from './artifacts';
export * from './build-plan';
export * from './config';
export * from './extract-manifest';
export * from './prompt';
export * from './report';
export * from './commands';

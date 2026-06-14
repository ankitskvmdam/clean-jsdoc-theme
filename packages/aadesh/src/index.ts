/**
 * `@clean-jsdoc-theme/aadesh` — the localization CLI + its building blocks: the
 * locale-artifact core (template + extract/merge), the config reader, the disk +
 * pipeline layers, and the `extract` / `prompt` / `validate` / `build` commands.
 */

/**
 * Injected from package.json at build time (see tsup.config.ts `define`). The
 * `typeof` guard keeps it safe under vitest, which doesn't apply the define.
 */
declare const __PKG_VERSION__: string | undefined;
export const AADESH_PACKAGE_VERSION =
  typeof __PKG_VERSION__ === 'string' ? __PKG_VERSION__ : '0.0.0-dev';

export * from './locale';
export * from './artifacts';
export * from './build-plan';
export * from './config';
export * from './extract-manifest';
export * from './prompt';
export * from './report';
export * from './commands';

/**
 * `@clean-jsdoc-theme/utils` config surface — opts validation diagnostics +
 * formatting primitives. Phase 1: the reporting spine (diagnostics), the zod
 * option schemas, near-miss key suggestions, and shared formatting helpers.
 * Phase 2: siteName/fonts validators, the injectable Google Fonts resolver, and
 * the `validateThemeOpts` orchestrator. Phase 3: the Next.js-style build report.
 */

export * from './diagnostics';
export * from './opts-schema';
export * from './suggest';
export * from './format';
export * from './site-name';
export * from './fonts';
export * from './locales';
export * from './google-fonts';
export * from './validate-opts';
export * from './report';
export * from './scrollbar';

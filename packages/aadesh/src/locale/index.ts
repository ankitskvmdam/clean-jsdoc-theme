/**
 * aadesh's pure localization core — the artifact model + catalog merge that
 * `aadesh extract`/`build` are built on. No disk I/O lives here (that's the CLI's
 * job); these are deterministic, unit-testable transforms over the template and
 * locale files.
 */

export {
  LOCALE_FILE_VERSION,
  type ChromeTree,
  type FlatEntry,
  type LocaleFile,
  type ObsoleteEntry,
  type Template,
  type TemplateEntry,
} from './types';

export { buildTemplate } from './template';

export {
  emptyLocaleFile,
  flattenLocaleFile,
  localeMessages,
  obsoleteEntries,
  parseLocaleFile,
  serializeLocaleFile,
  toLocaleFile,
} from './file';

export {
  coverageRatio,
  mergeLocale,
  type MergeOptions,
  type MergeReport,
  type MergeResult,
} from './merge';

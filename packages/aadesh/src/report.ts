/**
 * Plain-text formatting for the extract/validate output. The merge report
 * classifies (not just counts) per the plan §4: new / stale / obsolete + a
 * per-locale coverage %. Validation findings reuse utils' `formatDiagnostics`.
 */

import { coverageRatio, type MergeReport } from './locale';

/** Format one locale's merge report as a single line. */
export function formatMergeReport(report: MergeReport): string {
  const pct = Math.round(coverageRatio(report) * 100);
  const parts = [`${report.locale}: ${pct}% (${report.translated}/${report.total})`];
  if (report.added.length) parts.push(`+${report.added.length} new`);
  if (report.stale.length) parts.push(`${report.stale.length} stale`);
  if (report.obsolete.length) parts.push(`${report.obsolete.length} obsolete`);
  if (report.pruned.length) parts.push(`${report.pruned.length} pruned`);
  return parts.join('  ·  ');
}

/** Format the whole extract run: a header + one line per locale. */
export function formatExtractReport(reports: readonly MergeReport[]): string {
  if (reports.length === 0) return 'aadesh: no locales configured — nothing to extract.';
  return [
    'Extracted translation catalogs:',
    ...reports.map((r) => `  ${formatMergeReport(r)}`),
  ].join('\n');
}

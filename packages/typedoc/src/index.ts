import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Application, ProjectReflection } from 'typedoc';

/**
 * The name under which this output is registered. Users select it by listing it
 * in the `outputs` option of their `typedoc.json`:
 *
 * ```jsonc
 * {
 *   "plugin": ["@clean-jsdoc-theme/typedoc"],
 *   "outputs": [{ "name": "clean-jsdoc-theme", "path": "docs" }]
 * }
 * ```
 *
 * (Phase 1 placeholder — phases 2-4 replace the writer with the real
 * reflection → setu → dwar pipeline.)
 */
export const OUTPUT_NAME = 'clean-jsdoc-theme';

/** Marker written to the placeholder file so the e2e proof can assert on it. */
export const PLACEHOLDER_MARKER =
  '<!-- clean-jsdoc-theme typedoc output placeholder (phase 1) -->';

/**
 * TypeDoc plugin entry point. TypeDoc calls this once after the plugin module is
 * loaded (`typedoc --plugin @clean-jsdoc-theme/typedoc`).
 *
 * Verified against typedoc 0.28.19: an output is registered via
 * `app.outputs.addOutput(name, writer)` where the writer is
 * `(path: string, project: ProjectReflection) => Promise<void>`. The writer is
 * invoked by `app.generateOutputs(project)` for every output selected through
 * the `outputs` option (or `--out` when this output is made the default).
 */
export function load(app: Application): void {
  app.outputs.addOutput(OUTPUT_NAME, async (outDir: string, project: ProjectReflection) => {
    await writePlaceholderSite(outDir, project, app);
  });
}

/**
 * Phase 1 no-op writer: proves the plugin loads and the output is selectable by
 * writing a single placeholder `index.html` into the out dir.
 */
async function writePlaceholderSite(
  outDir: string,
  project: ProjectReflection,
  app: Application,
): Promise<void> {
  const dir = resolve(outDir);
  await mkdir(dir, { recursive: true });

  const projectName = project.name || project.packageName || 'project';
  const html = [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><title>' + projectName + '</title></head>',
    '<body>',
    PLACEHOLDER_MARKER,
    '<h1>' + projectName + '</h1>',
    '<p>Rendered by @clean-jsdoc-theme/typedoc (phase 1 placeholder).</p>',
    '</body>',
    '</html>',
    '',
  ].join('\n');

  await writeFile(resolve(dir, 'index.html'), html, 'utf8');
  app.logger.info(`[clean-jsdoc-theme] wrote placeholder output to ${dir}`);
}

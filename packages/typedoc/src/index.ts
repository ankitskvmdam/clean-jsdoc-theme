import type { Application, ProjectReflection } from 'typedoc';
import { writeSite } from './write-site';

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
 */
export const OUTPUT_NAME = 'clean-jsdoc-theme';

/**
 * TypeDoc plugin entry point. TypeDoc calls this once after the plugin module is
 * loaded (`typedoc --plugin @clean-jsdoc-theme/typedoc`).
 *
 * Verified against typedoc 0.28.19: an output is registered via
 * `app.outputs.addOutput(name, writer)` where the writer is
 * `(path: string, project: ProjectReflection) => Promise<void>`. The writer is
 * invoked by `app.generateOutputs(project)` for every output selected through
 * the `outputs` option (or `--out` when this output is made the default).
 *
 * The writer ({@link writeSite}) runs the full reflection → setu → dwar
 * pipeline, producing a real clean-jsdoc-theme site in `path`.
 */
export function load(app: Application): void {
  app.outputs.addOutput(OUTPUT_NAME, async (outDir: string, project: ProjectReflection) => {
    await writeSite(outDir, project, app);
  });
}

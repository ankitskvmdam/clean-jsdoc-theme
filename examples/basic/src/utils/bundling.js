/**
 * import these helpers into your own build pipeline to bundle and ship a
 * documentation site. Every sentence on this page deliberately starts with a
 * lowercase `import` or `export` (issue #347): MDX reads a flow line that opens
 * with either keyword as an ES module statement, which used to make the whole
 * page fail to render. The theme now renders them as plain prose.
 *
 * @module utils/bundling
 * @category Utilities/Bundling
 */

/**
 * export the site to a directory, writing one file per page.
 *
 * import side effects are none: the function only touches the target
 * directory you pass in.
 *
 * @summary export a built site to disk.
 * @param {string} outDir Where to write the files.
 * @param {Object<string, string>} files Path → contents.
 * @returns {number} How many files were written.
 *
 * @example <caption>import, then export</caption>
 * import { exportSite } from './utils/bundling.js';
 * export const written = exportSite('dist', { 'index.html': '<h1>Hi</h1>' });
 */
export function exportSite(outDir, files) {
  return Object.keys(files).length;
}

/**
 * import a previously exported site back into memory.
 *
 * @summary import an exported site.
 * @param {string} dir The directory `exportSite` wrote to.
 * @returns {Object<string, string>} Path → contents.
 * @deprecated import the files yourself with `fs.readdir`; this helper will be
 * removed in the next major.
 */
export function importSite(dir) {
  return { [dir]: '' };
}

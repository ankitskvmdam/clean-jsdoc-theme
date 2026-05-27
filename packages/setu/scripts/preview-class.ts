/**
 * Preview script: generate the MDX for a class doclet from the test fixture
 * and (a) write it to `preview/<longname>.mdx` and (b) echo it to stdout.
 *
 * Usage:
 *   pnpm preview                                  # defaults to DataProcessor
 *   pnpm preview "module:CoreSchema~BaseEntity"   # any class longname
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getClassView } from '../src/class-view';
import { getJSDocTaffyData } from '../src/__tests__/factory';
import { classViewToMdx } from '../src/mdx';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');

const longname = process.argv[2] ?? 'DataProcessor';

const view = getClassView(getJSDocTaffyData(), longname);
if (!view) {
  console.error(`No class doclet found for longname "${longname}".`);
  process.exit(1);
}

const mdx = classViewToMdx(view);

const outDir = resolve(pkgRoot, 'preview');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, `${longname.replace(/[^a-zA-Z0-9_.-]/g, '_')}.mdx`);
writeFileSync(outPath, mdx, 'utf8');

console.log(mdx);
console.error(`\n[preview-class] wrote ${outPath}`);

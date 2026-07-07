#!/usr/bin/env node
/**
 * Doc-consistency guard — fails the build when the hand-written docs drift from
 * the code, the recurring source of stale READMEs. Pure Node, no deps. Prints
 * every problem it finds, then exits non-zero if there were any.
 *
 * Invariants checked:
 *   A. Package coverage — every workspace package under `packages/*` is linked
 *      in the root README table AND has a section in `docs/ARCHITECTURE.md`.
 *      (Catches: a new package never added to the docs, e.g. the missing
 *      `@clean-jsdoc-theme/typedoc` row.)
 *   B. Repository-layout paths — every file/dir named in the root README's
 *      "Repository layout" tree actually exists at the path the tree implies.
 *      (Catches: a dangling/wrong-path reference, e.g. a root-level
 *      `BREAKING_CHANGES.md` that actually lives under `docs/`.) The section is
 *      optional prose — if the README omits it, this check is skipped, not failed.
 *   C. Island coverage — every key in rang's `ISLAND_REGISTRY` is documented
 *      (as a `` `code` `` token) in both `docs/ARCHITECTURE.md` and
 *      `packages/rang/README.md`. (Catches: an island added/renamed in code but
 *      not in the docs — which is what lets island lists/counts go stale.)
 *
 * The guiding rule behind these: facts that change with the code should be
 * asserted against the code, not hand-copied into prose and hoped to stay true.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Normalize CRLF → LF so the line/comment regexes behave the same on Windows
// checkouts (where the files carry `\r\n`) as in CI.
const read = (rel) => readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n');

const errors = [];
const fail = (msg) => errors.push(msg);

const readme = read('README.md');
const arch = read('docs/ARCHITECTURE.md');

// ── A. package coverage ──────────────────────────────────────────────────────
function packageDirs() {
  const dir = join(root, 'packages');
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'package.json')))
    .map((d) => d.name)
    .sort();
}

for (const dir of packageDirs()) {
  const { name } = JSON.parse(read(`packages/${dir}/package.json`));
  if (!readme.includes(`](./packages/${dir})`)) {
    fail(`README.md: package table is missing a link to ./packages/${dir} (\`${name}\`).`);
  }
  if (!arch.includes(name)) {
    fail(`docs/ARCHITECTURE.md: package \`${name}\` has no section/mention.`);
  }
}

// ── B. repository-layout paths exist ─────────────────────────────────────────
function repositoryLayoutBlock(md) {
  const m = md.match(/## Repository layout\s*```[^\n]*\n([\s\S]*?)```/);
  return m ? m[1] : '';
}

if (repositoryLayoutBlock(readme)) {
  const block = repositoryLayoutBlock(readme);
  // The "Repository layout" tree is optional: when the README includes it we
  // validate every path it names, but when the section has been removed we skip
  // this check rather than demand it back.
  // Resolve the ASCII tree by depth: each level is one 4-char indent unit
  // (`│   ` or four spaces) before the `├──`/`└──` connector.
  const stack = []; // directory segments, indexed by depth
  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\s+#.*$/, ''); // drop trailing "# comment"
    const m = line.match(/^([│\s]*)(?:├──|└──)\s+(.+?)\s*$/);
    if (!m) continue; // the root line + blanks have no connector
    const depth = Math.floor(m[1].length / 4);
    const token = m[2];
    if (/[<>*…]/.test(token)) continue; // illustrative placeholder, not a real path
    const isDir = token.endsWith('/');
    const clean = isDir ? token.slice(0, -1) : token;
    stack.length = depth; // truncate to the current depth
    const rel = [...stack, clean].join('/');
    const abs = join(root, rel);
    if (!existsSync(abs)) {
      fail(`README.md repository layout: "${rel}" does not exist.`);
    } else if (isDir && !statSync(abs).isDirectory()) {
      fail(`README.md repository layout: "${rel}" is shown as a directory but is a file.`);
    }
    if (isDir) stack[depth] = clean;
  }
}

// ── C. island coverage ───────────────────────────────────────────────────────
function islandRegistryKeys() {
  const src = read('packages/rang/src/islands.ts');
  const body = src.match(/ISLAND_REGISTRY[^{]*\{([\s\S]*?)\n\};/);
  if (!body) return [];
  const keys = [];
  for (const m of body[1].matchAll(/^\s*'?([a-z][a-z-]*)'?\s*:/gm)) keys.push(m[1]);
  return keys;
}

{
  const keys = islandRegistryKeys();
  if (keys.length === 0) {
    fail('could not parse ISLAND_REGISTRY keys from packages/rang/src/islands.ts.');
  }
  const targets = [
    ['docs/ARCHITECTURE.md', arch],
    ['packages/rang/README.md', read('packages/rang/README.md')],
  ];
  for (const [label, content] of targets) {
    for (const key of keys) {
      if (!content.includes('`' + key + '`')) {
        fail(`${label}: island \`${key}\` is in ISLAND_REGISTRY but not documented.`);
      }
    }
  }
}

// ── report ───────────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error(`✖ check-docs: ${errors.length} doc-consistency problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nUpdate the docs (or the code) so they agree, then re-run `pnpm check:docs`.');
  process.exit(1);
}
console.log('✓ check-docs: package coverage, repository layout, and island docs are in sync.');

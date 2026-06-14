/**
 * Browser-safety guard for bhasha.
 *
 * bhasha is bundled into the browser by rang, so it must stay isomorphic: zero
 * `node:*` builtins and no Node-only globals. This grep-style check fails the
 * `lint` task the moment such an import (or `process`/`Buffer`/`__dirname` use)
 * sneaks in — a backstop beside the eslint `no-restricted-imports` rule, so the
 * guard holds even if someone edits the eslint config.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src');

/** Patterns that betray a Node-only dependency. */
const FORBIDDEN = [
  { re: /\bfrom\s+['"]node:[^'"]+['"]/, label: "import from 'node:*'" },
  { re: /\brequire\(\s*['"]node:[^'"]+['"]\s*\)/, label: "require('node:*')" },
  {
    re: /\bfrom\s+['"](fs|path|os|crypto|zlib|child_process|url|util|stream)['"]/,
    label: 'import from a Node builtin',
  },
  { re: /\b(process|__dirname|__filename|Buffer)\b/, label: 'Node-only global' },
];

/** Recursively collect every .ts/.tsx file under `dir` (skipping tests). */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      out.push(...walk(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];
for (const file of walk(SRC)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Comments may name these for documentation; only flag real code.
    const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
    for (const { re, label } of FORBIDDEN) {
      if (re.test(code)) {
        violations.push(`${file}:${i + 1}  ${label}\n    ${line.trim()}`);
      }
    }
  });
}

if (violations.length > 0) {
  console.error('bhasha must stay browser-safe — forbidden Node usage found:\n');
  console.error(violations.join('\n'));
  console.error('\nbhasha is bundled into the browser by rang; keep it isomorphic.');
  process.exit(1);
}

console.log('bhasha browser-safety check passed (no node:* / Node globals).');

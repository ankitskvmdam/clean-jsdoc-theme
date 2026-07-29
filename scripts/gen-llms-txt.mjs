#!/usr/bin/env node
/**
 * gen-llms-txt.mjs
 *
 * Generates `llms.txt` (a machine-readable index for LLMs, per llmstxt.org) and
 * `llms-full.txt` (every doc concatenated into one file) from the English
 * docs-site markdown (`docs-site/docs/**\/*.md`).
 *
 * The site URL is read from `docs-site/jsdoc.json` (`opts.siteUrl`), so links
 * point at the deployed docs and their companion `.md` files.
 *
 * Usage:
 *   node scripts/gen-llms-txt.mjs [outputDir]
 *
 * `outputDir` defaults to `docs-site/dist/clean-jsdoc-theme` (the built site, so
 * the two files ship with the next deploy). Pass a path to write elsewhere, e.g.
 * straight into a deploy checkout:
 *   node scripts/gen-llms-txt.mjs ../ankdev/public/clean-jsdoc-theme
 *
 * Re-run whenever the docs change (or wire it into your build/deploy step).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs-site', 'docs');
const JSDOC_CONFIG = path.join(REPO_ROOT, 'docs-site', 'jsdoc.json');

// One-line summary shown at the top of both files.
const SUMMARY =
  'A clean, customizable documentation theme for JSDoc and TypeDoc. It renders SSR HTML plus a companion Markdown file per page (for LLMs), a fuzzy search index, and optional Pagefind full-text search.';

// Sidebar-style group order; any other groups are appended alphabetically.
const GROUP_ORDER = ['Using the Theme', 'Guides', 'Components', 'Packages'];

/** Live docs base URL (no trailing slash), from docs-site/jsdoc.json opts.siteUrl. */
function readBaseUrl() {
  try {
    const opts = JSON.parse(fs.readFileSync(JSDOC_CONFIG, 'utf8')).opts || {};
    if (opts.siteUrl) return String(opts.siteUrl).replace(/\/+$/, '');
  } catch {
    /* fall through to default */
  }
  return 'https://ankdev.me/clean-jsdoc-theme';
}

function walk(dir, base = dir, out = []) {
  for (const e of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, base, out);
    else if (e.name.endsWith('.md'))
      out.push({ abs: full, slug: path.relative(base, full).split(path.sep).join('/').replace(/\.md$/, '') });
  }
  return out;
}

function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { meta: {}, body: raw };
  let end = -1;
  for (let i = 1; i < lines.length; i++)
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  if (end === -1) return { meta: {}, body: raw };
  const meta = {};
  for (let i = 1; i < end; i++) {
    const idx = lines[i].indexOf(':');
    if (idx === -1) continue;
    meta[lines[i].slice(0, idx).trim()] = lines[i]
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return { meta, body: lines.slice(end + 1).join('\n').replace(/^\n+/, '') };
}

/** First clean prose line → a one-line description (skips headings/badges/html/lists/tables/fences). */
function describe(body) {
  for (const raw of body.split('\n')) {
    const l = raw.trim();
    if (!l) continue;
    if (/^(#|!\[|<|>|\||```|-\s|\*\s|\d+\.\s|\[!)/.test(l)) continue;
    let t = l.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '');
    if (t.length > 150) t = t.slice(0, 147).replace(/\s+\S*$/, '') + '…';
    return t;
  }
  return '';
}

function main() {
  const outDir = path.resolve(process.argv[2] || path.join(REPO_ROOT, 'docs-site', 'dist', 'clean-jsdoc-theme'));
  const BASE = readBaseUrl();

  const pages = walk(DOCS_DIR).map((p) => {
    const { meta, body } = parseFrontmatter(fs.readFileSync(p.abs, 'utf8'));
    const isHome = p.slug === 'index';
    const url = isHome ? `${BASE}/` : `${BASE}/${p.slug}/`;
    const mdUrl = isHome ? `${BASE}/index.md` : `${BASE}/${p.slug}/index.md`;
    const rawGroup = meta.group || '';
    const group = rawGroup.startsWith('Packages/') ? 'Packages' : rawGroup;
    const title = meta.title || p.slug;
    // In Packages, prefix the ambiguous "Overview"/"Examples" titles with the
    // package name from the subgroup (e.g. "utils — Overview").
    const displayTitle = rawGroup.startsWith('Packages/')
      ? `${rawGroup.slice('Packages/'.length)} — ${title}`
      : title;
    return {
      slug: p.slug,
      isHome,
      title,
      displayTitle,
      group,
      subgroup: rawGroup,
      order: meta.order ? Number(meta.order) : Infinity,
      url,
      mdUrl,
      desc: describe(body),
      body,
    };
  });

  const home = pages.find((p) => p.isHome);
  const content = pages.filter((p) => !p.isHome);

  const groupsInOrder = () => {
    const present = [...new Set(content.map((p) => p.group).filter(Boolean))];
    return [...GROUP_ORDER.filter((g) => present.includes(g)), ...present.filter((g) => !GROUP_ORDER.includes(g)).sort()];
  };
  const inGroup = (g) =>
    content
      .filter((p) => p.group === g)
      .sort(
        (a, b) => a.order - b.order || a.subgroup.localeCompare(b.subgroup) || a.title.localeCompare(b.title),
      );

  // ---- llms.txt ----
  let llms = `# clean-jsdoc-theme\n\n> ${SUMMARY}\n\n`;
  llms += `The live documentation is at ${BASE}/ . Each page below links to its clean Markdown (\`.md\`) version. The full docs as a single file: ${BASE}/llms-full.txt\n\n`;
  for (const g of groupsInOrder()) {
    llms += `## ${g}\n`;
    for (const p of inGroup(g)) llms += `- [${p.displayTitle}](${p.mdUrl})${p.desc ? `: ${p.desc}` : ''}\n`;
    llms += '\n';
  }
  llms += `## Optional\n`;
  llms += `- [Full documentation, single file](${BASE}/llms-full.txt): every page concatenated for one-shot ingestion\n`;
  llms += `- [JSDoc API reference example](${BASE}/api-docs/): a generated JSDoc API site built with the theme\n`;
  llms += `- [TypeDoc API reference example](${BASE}/typedoc-api-docs/): a generated TypeDoc API site built with the theme\n`;

  // ---- llms-full.txt ----
  const stripH1 = (b) => b.replace(/^#\s+[^\n]*\n+/, '').trim();
  const section = (p) => `---\n\n# ${p.displayTitle}\nSource: ${p.url}\n\n${stripH1(p.body)}\n\n`;
  let full = `# clean-jsdoc-theme — full documentation\n\n> ${SUMMARY}\n\n`;
  full += `Generated from ${BASE}/ . This file concatenates every documentation page.\n\n`;
  if (home) full += section(home);
  for (const g of groupsInOrder()) for (const p of inGroup(g)) full += section(p);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'llms.txt'), llms.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', 'utf8');
  fs.writeFileSync(path.join(outDir, 'llms-full.txt'), full.trimEnd() + '\n', 'utf8');

  console.log(`Base URL: ${BASE}`);
  console.log(`llms.txt: ${pages.length} pages indexed`);
  console.log(`llms-full.txt: ${(full.length / 1024).toFixed(1)} KB`);
  console.log(`Written to: ${outDir}`);
}

main();

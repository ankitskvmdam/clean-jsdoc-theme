#!/usr/bin/env node
/**
 * sync-wiki.mjs
 *
 * Regenerates a GitHub wiki checkout from the English docs-site markdown
 * (docs-site/docs/**\/*.md). The wiki is a deterministic transform of that
 * source — this script is the only thing that should ever write to it.
 *
 * Usage:
 *   node scripts/sync-wiki.mjs <targetWikiDir>
 *
 * <targetWikiDir> is expected to be a checkout of the repo's `.wiki.git`
 * (or any scratch directory for a dry run). Existing *.md files in it are
 * cleared and regenerated; a `.git` directory (if present) and any non-.md
 * files are left untouched.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs-site', 'docs');

const LIVE_DOCS_BASE = 'https://ankdev.me/clean-jsdoc-theme';

// Fixed group-heading order for the sidebar; any other groups (besides the
// "Packages/*" family, which is merged into a single "Packages" heading) are
// appended alphabetically after these.
const FIXED_GROUP_ORDER = ['Using the Theme', 'Guides', 'Components'];
const PACKAGES_HEADING = 'Packages';
const PACKAGES_GROUP_PREFIX = 'Packages/';

function main() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error('Usage: node scripts/sync-wiki.mjs <targetWikiDir>');
    process.exit(1);
  }
  const wikiDir = path.resolve(targetDir);

  const files = collectMarkdownFiles(DOCS_DIR, DOCS_DIR);
  const records = files.map(readRecord);

  // Pass 1: slug -> pageName map, so link rewriting can resolve forward
  // references regardless of file order.
  const slugToPage = new Map(records.map((r) => [r.slug, r.pageName]));

  // Pass 2: rewrite each record's body and compute final wiki page content.
  // The docs bodies already open with their own `# H1`; only synthesize a title
  // heading when a body doesn't start with one, so pages never get a double H1.
  for (const record of records) {
    const rewrittenBody = rewriteBody(record.body, slugToPage, LIVE_DOCS_BASE);
    const bodyStartsWithH1 = /^#\s/.test(rewrittenBody.trimStart());
    record.content = bodyStartsWithH1 ? rewrittenBody : `# ${record.title}\n\n${rewrittenBody}`;
    if (!record.content.endsWith('\n')) record.content += '\n';
  }

  const sidebar = buildSidebar(records);
  const footer = buildFooter();

  fs.mkdirSync(wikiDir, { recursive: true });
  clearMarkdownFiles(wikiDir);

  for (const record of records) {
    const outPath = path.join(wikiDir, `${record.pageName}.md`);
    fs.writeFileSync(outPath, record.content, 'utf8');
  }
  fs.writeFileSync(path.join(wikiDir, '_Sidebar.md'), sidebar, 'utf8');
  fs.writeFileSync(path.join(wikiDir, '_Footer.md'), footer, 'utf8');

  printSummary(records, wikiDir);
}

/** Recursively collect *.md files under `dir`, relative to `baseDir`. */
function collectMarkdownFiles(dir, baseDir, out = []) {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(full, baseDir, out);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const rel = path.relative(baseDir, full).split(path.sep).join('/');
      out.push({ absPath: full, relPath: rel });
    }
  }
  return out;
}

/** Read + parse a single docs-site markdown file into a wiki-page record. */
function readRecord({ absPath, relPath }) {
  const raw = fs.readFileSync(absPath, 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  const slug = relPath.replace(/\.md$/, '');
  const pageName = slug === 'index' ? 'Home' : slug.replace(/\//g, '-');
  return {
    slug,
    pageName,
    title: meta.title || pageName,
    group: meta.group || null,
    order: meta.order !== undefined && meta.order !== '' ? Number(meta.order) : null,
    body,
  };
}

/** Parse a leading `---\n...\n---` frontmatter block. Returns { meta, body }. */
function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return { meta: {}, body: content };
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) {
    return { meta: {}, body: content };
  }
  const meta = {};
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^["']|["']$/g, '');
    meta[key] = value;
  }
  const body = lines
    .slice(end + 1)
    .join('\n')
    .replace(/^\n+/, '');
  return { meta, body };
}

/**
 * Rewrite `](/…)` link/image targets in `body`, skipping any content inside
 * fenced code blocks (``` or ```` fences, matched by backtick-run length).
 */
function rewriteBody(body, slugToPage, baseUrl) {
  const lines = body.split('\n');
  let fenceMarker = null;
  const out = lines.map((line) => {
    if (!fenceMarker) {
      const openMatch = /^\s*(`{3,})/.exec(line);
      if (openMatch) {
        fenceMarker = openMatch[1];
        return line; // opening fence line — left untouched
      }
      return rewriteLinksInLine(line, slugToPage, baseUrl);
    }
    // Inside a fence: leave the line untouched, and check whether it closes
    // the fence (a line of backticks at least as long as the opener).
    const closeMatch = /^\s*(`{3,})\s*$/.exec(line);
    if (closeMatch && closeMatch[1].length >= fenceMarker.length) {
      fenceMarker = null;
    }
    return line;
  });
  return out.join('\n');
}

/** Rewrite every `](/…)` target on a single (non-code) line. */
function rewriteLinksInLine(line, slugToPage, baseUrl) {
  return line.replace(/\]\((\/[^)\s]+)(\s+"[^"]*")?\)/g, (match, target, title) => {
    const hashIdx = target.indexOf('#');
    const pathPart = hashIdx === -1 ? target : target.slice(0, hashIdx);
    const anchor = hashIdx === -1 ? '' : target.slice(hashIdx);

    let resolved;
    if (pathPart === '' || pathPart === '/') {
      resolved = `Home${anchor}`;
    } else {
      const withoutSlash = pathPart.slice(1);
      const key = withoutSlash.replace(/\/$/, '');
      if (slugToPage.has(key)) {
        resolved = `${slugToPage.get(key)}${anchor}`;
      } else {
        resolved = `${baseUrl}${pathPart}${anchor}`;
      }
    }
    return `](${resolved}${title || ''})`;
  });
}

/** Clear existing *.md files from the target dir (never touches .git or other files). */
function clearMarkdownFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      fs.unlinkSync(path.join(dir, entry.name));
    }
  }
}

/** Build the _Sidebar.md content: Home link + grouped nav. */
function buildSidebar(records) {
  const byGroup = new Map();
  for (const record of records) {
    if (!record.group) continue; // index.md has no group
    const heading = record.group.startsWith(PACKAGES_GROUP_PREFIX)
      ? PACKAGES_HEADING
      : record.group;
    if (!byGroup.has(heading)) byGroup.set(heading, []);
    byGroup.get(heading).push(record);
  }

  for (const list of byGroup.values()) {
    list.sort((a, b) => {
      const orderA = a.order === null ? Infinity : a.order;
      const orderB = b.order === null ? Infinity : b.order;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    });
  }

  const presentGroups = new Set(byGroup.keys());
  const headingOrder = [...FIXED_GROUP_ORDER.filter((g) => presentGroups.has(g))];
  const otherGroups = [...presentGroups]
    .filter((g) => !FIXED_GROUP_ORDER.includes(g) && g !== PACKAGES_HEADING)
    .sort((a, b) => a.localeCompare(b));
  headingOrder.push(...otherGroups);
  if (presentGroups.has(PACKAGES_HEADING)) headingOrder.push(PACKAGES_HEADING);

  const lines = ['* [Home](Home)', ''];
  for (const heading of headingOrder) {
    lines.push(`## ${heading}`);
    for (const record of byGroup.get(heading)) {
      lines.push(`* [${record.title}](${record.pageName})`);
    }
    lines.push('');
  }
  return lines.join('\n').replace(/\n+$/, '\n');
}

function buildFooter() {
  return (
    '_This wiki is auto-generated from ' +
    '[docs-site/docs](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/docs-site/docs). ' +
    'Edit there — changes sync automatically. ' +
    `Full docs: ${LIVE_DOCS_BASE}/_\n`
  );
}

function printSummary(records, wikiDir) {
  const groups = new Set(
    records
      .map((r) => (r.group && r.group.startsWith(PACKAGES_GROUP_PREFIX) ? PACKAGES_HEADING : r.group))
      .filter(Boolean),
  );
  console.log(`Wiki sync: wrote ${records.length} page(s) to ${wikiDir}`);
  console.log(`Sidebar groups (${groups.size}): ${[...groups].join(', ')}`);
  console.log('Wrote _Sidebar.md and _Footer.md');
}

main();

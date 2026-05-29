import type { Root } from 'mdast';
import { toMarkdown } from 'mdast-util-to-markdown';
import { ClassView } from './class-view';
import { classViewToMdast, ClassViewToMdastOptions } from './mdast/class-view';

export interface ToMdxOptions {
  /** Optional YAML frontmatter object. Serialized at the top of the document. */
  frontmatter?: Record<string, unknown>;
}

/** Serialize an mdast Root tree to an MDX-compatible markdown string. */
export function toMdx(tree: Root, options: ToMdxOptions = {}): string {
  const body = toMarkdown(tree, {
    bullet: '-',
    fence: '`',
    fences: true,
    incrementListMarker: false,
    rule: '-',
    strong: '*',
    emphasis: '_',
  });
  const fm = options.frontmatter ? renderFrontmatter(options.frontmatter) : '';
  return fm + body;
}

/** Compose a class page MDX string from a ClassView. */
export function classViewToMdx(
  view: ClassView,
  options: ClassViewToMdastOptions & ToMdxOptions = {}
): string {
  const tree = classViewToMdast(view, options);
  const frontmatter = options.frontmatter ?? defaultClassFrontmatter(view);
  return toMdx(tree, { frontmatter });
}

function defaultClassFrontmatter(view: ClassView): Record<string, unknown> {
  return {
    title: view.doclet.name ?? view.doclet.longname,
    kind: 'class',
    longname: view.doclet.longname,
  };
}

/**
 * Minimal YAML frontmatter serializer. Strings are quoted, scalars are
 * emitted bare. Arrays render as `[a, b]`. Nested objects are not supported
 * — we'd reach for `yaml` proper if we needed that.
 */
function renderFrontmatter(data: Record<string, unknown>): string {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${formatYamlScalar(v)}`);
  if (lines.length === 0) return '';
  return ['---', ...lines, '---', '', ''].join('\n');
}

function formatYamlScalar(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => formatYamlScalar(x)).join(', ')}]`;
  if (typeof v === 'string') return needsYamlQuote(v) ? JSON.stringify(v) : v;
  return String(v);
}

function needsYamlQuote(s: string): boolean {
  if (s.length === 0) return true;
  // Leading char that would be interpreted by YAML as a structure indicator.
  if (/^[\s\-?:,[\]{}#&*!|>'"%@`]/.test(s)) return true;
  // `: ` mid-string would split into key/value.
  if (/:\s/.test(s)) return true;
  // Multiline scalars need quoting.
  if (/[\n\r]/.test(s)) return true;
  return false;
}

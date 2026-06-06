import type { Root, RootContent } from 'mdast';
import { ClassMember, ClassView, MemberBuckets } from '../class-view';
import { h, hr, inlineCode, p, root, strong, text } from './builders';
import { docletBlocks, DocletBlocksOptions, paramsList, sourceLinkBlock } from './doclet';

export interface ClassViewToMdastOptions extends DocletBlocksOptions {
  /** Heading level for the class title. Default: 1. */
  pageHeadingLevel?: 1 | 2;
  /** Drop empty member sections from output. Default: true. */
  hideEmptySections?: boolean;
}

interface SectionSpec {
  title: string;
  members: ClassMember[];
}

/**
 * Default section order. A renderer that wants a different layout can build
 * its own SectionSpec[] and pass it to {@link memberSections}.
 */
export function defaultSections(buckets: MemberBuckets): SectionSpec[] {
  return [
    { title: 'Instance Methods', members: buckets.instanceMethods },
    { title: 'Static Methods', members: buckets.staticMethods },
    { title: 'Instance Fields', members: buckets.instanceFields },
    { title: 'Static Fields', members: buckets.staticFields },
    { title: 'Enums', members: buckets.enums },
    { title: 'Events', members: buckets.events },
    { title: 'Other', members: buckets.other },
  ];
}

/**
 * Render one member as: heading with the member name (inline-coded) followed
 * by the doclet's body via {@link docletBlocks}. Reusable for any kind that
 * has named, headed members (modules, mixins, namespaces, …).
 */
export function memberBlocks(
  member: ClassMember,
  options: DocletBlocksOptions = {},
  headingLevel: 2 | 3 | 4 = 3
): RootContent[] {
  const out: RootContent[] = [h(headingLevel, inlineCode(member.name ?? '(anonymous)'))];
  const src = sourceLinkBlock(member, options);
  if (src) out.push(src);
  out.push(...docletBlocks(member, options));
  return out;
}

/**
 * Render N sections, each: H2 + per-member H3 blocks. Empty sections are
 * dropped unless `hideEmptySections` is false.
 */
export function memberSections(
  sections: readonly SectionSpec[],
  options: ClassViewToMdastOptions = {}
): RootContent[] {
  const hideEmpty = options.hideEmptySections ?? true;
  const out: RootContent[] = [];
  for (const section of sections) {
    if (hideEmpty && section.members.length === 0) continue;
    out.push(h(2, text(section.title)));
    for (const member of section.members) {
      out.push(...memberBlocks(member, options));
    }
  }
  return out;
}

/**
 * "Extends" / "Implements" / "Mixes" lines for a class. Returns the blocks
 * that apply; empty if none.
 */
export function classRelationsBlocks(doclet: ClassView['doclet']): RootContent[] {
  const lines: { label: string; refs: readonly string[] | undefined }[] = [
    { label: 'Extends', refs: doclet.augments },
    { label: 'Implements', refs: doclet.implements },
    { label: 'Mixes', refs: doclet.mixes },
  ];

  return lines
    .filter(({ refs }) => refs && refs.length > 0)
    .map(({ label, refs }) => {
      const children: ReturnType<typeof inlineCode | typeof text | typeof strong>[] = [
        strong(text(`${label}: `)),
      ];
      refs!.forEach((r, i) => {
        if (i > 0) children.push(text(', '));
        children.push(inlineCode(r));
      });
      return p(...children);
    });
}

/**
 * Top-level: turn a ClassView into a complete mdast Root tree. Frontmatter is
 * NOT added here — that's the MDX serialization layer's job.
 */
export function classViewToMdast(
  view: ClassView,
  options: ClassViewToMdastOptions = {}
): Root {
  const pageLevel = options.pageHeadingLevel ?? 1;
  const blocks: RootContent[] = [];

  // Title
  blocks.push(h(pageLevel, text(view.doclet.name ?? view.doclet.longname ?? 'Class')));

  // Extends/Implements/Mixes
  blocks.push(...classRelationsBlocks(view.doclet));

  // Source link for the class declaration itself, when it resolves.
  const classSource = sourceLinkBlock(view.doclet, options);
  if (classSource) blocks.push(classSource);

  // Class-level body: description, deprecation, examples, metadata. Params /
  // returns / throws are surfaced in the Constructor section below — skip
  // them here to avoid duplication.
  blocks.push(
    ...docletBlocks(view.doclet, {
      ...options,
      skip: [...(options.skip ?? []), 'params', 'returns', 'yields', 'throws'],
    })
  );

  // Constructor: if the class doclet carries params, surface them in their
  // own section so the class description and constructor signature don't run
  // together visually.
  const ctorParams = paramsList(view.constructorParams);
  if (ctorParams) {
    blocks.push(hr(), h(2, text('Constructor')), p(strong(text('Parameters'))), ctorParams);
  }

  // Members, bucketed.
  const sections = defaultSections(view);
  if (sections.some((s) => s.members.length > 0)) blocks.push(hr());
  blocks.push(...memberSections(sections, options));

  return root(...blocks);
}

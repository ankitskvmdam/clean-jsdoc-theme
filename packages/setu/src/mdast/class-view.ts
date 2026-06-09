import type { Root, RootContent } from 'mdast';
import { ClassMember, ClassView, ContainerView, MemberBuckets } from '../class-view';
import { h, hr, inlineCode, memberMeta, p, root, strong, text } from './builders';
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
 * Modifier / kind badges for a member, in display order. Mirrors
 * {@link modifiersBlock} but adds the scope (`static`) and `deprecated` flags,
 * and drops the redundant `public` access (the default). Replaces the old
 * "Modifiers:" paragraph — `memberBlocks` skips that section.
 */
export function memberBadges(member: ClassMember): string[] {
  const badges: string[] = [];
  if (member.scope === 'static') badges.push('static');
  if (member.async) badges.push('async');
  if (member.generator) badges.push('generator');
  if (member.virtual) badges.push('abstract');
  if (member.readonly) badges.push('readonly');
  if (member.kind === 'event') badges.push('event');
  if (member.isEnum) badges.push('enum');
  if (member.access && member.access !== 'public') badges.push(member.access);
  if (member.deprecated) badges.push('deprecated');
  return badges;
}

/**
 * Render one member as: an ATX heading with the member name (inline-coded), a
 * `<MemberMeta>` row (modifier/kind chips on the left, the `filename:line`
 * source link pinned right), then the doclet's body via {@link docletBlocks}.
 * The heading stays a real `###` so its anchor / TOC / search entry survive.
 * The `modifiers` section is skipped — the chips replace that paragraph; the
 * source is in the meta row, not a separate caption. Reusable for any kind with
 * named, headed members (modules, mixins, namespaces, …).
 */
export function memberBlocks(
  member: ClassMember,
  options: DocletBlocksOptions = {},
  headingLevel: 2 | 3 | 4 = 3
): RootContent[] {
  const out: RootContent[] = [h(headingLevel, inlineCode(member.name ?? '(anonymous)'))];

  const badges = memberBadges(member);
  const resolved = options.sourceLink?.(member) ?? undefined;
  if (badges.length > 0 || resolved) {
    out.push(memberMeta({ badges, sourceHref: resolved?.href, sourceLabel: resolved?.label }));
  }

  out.push(...docletBlocks(member, { ...options, skip: [...(options.skip ?? []), 'modifiers'] }));
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
 * Top-level: turn a ContainerView into a complete mdast Root tree. Frontmatter
 * is NOT added here — that's the MDX serialization layer's job. Kind-parametric:
 * the Constructor section only appears for classes (other kinds carry no
 * `constructorParams`), and empty relations/member sections drop out via
 * `hideEmptySections`.
 */
export function containerViewToMdast(
  view: ContainerView,
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

  // Class-level body: description, deprecation, examples, metadata. Relations
  // (extends/implements/mixes) are already rendered above via
  // classRelationsBlocks — skip them for every kind. Params/returns/yields/
  // throws are skipped *only for classes*, where they're surfaced in the
  // Constructor section below to avoid duplication. Other kinds (typedef,
  // module, namespace, interface, mixin) have no Constructor section, so a
  // function-signature typedef's params/returns (and any container doclet's
  // own params/returns) must render here in the body.
  const skip: DocletBlocksOptions['skip'] =
    view.kind === 'class'
      ? [...(options.skip ?? []), 'params', 'returns', 'yields', 'throws', 'relations']
      : [...(options.skip ?? []), 'relations'];
  blocks.push(...docletBlocks(view.doclet, { ...options, skip }));

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

/**
 * Turn a ClassView into a complete mdast Root tree. Thin alias over
 * {@link containerViewToMdast} — a ClassView is a `ContainerView` with
 * `kind: 'class'`.
 */
export function classViewToMdast(
  view: ClassView,
  options: ClassViewToMdastOptions = {}
): Root {
  return containerViewToMdast(view as ContainerView, options);
}

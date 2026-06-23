import type { PhrasingContent, Root, RootContent } from 'mdast';
import { ClassMember, ClassView, ContainerView, MemberBuckets } from '../class-view';
import { slugifyHeading, TDocletParam } from '@clean-jsdoc-theme/utils';
import { h, hr, inlineCode, link, memberHeading, memberMeta, p, root, strong, text } from './builders';
import {
  docletBlocks,
  DocletBlocksOptions,
  paramsList,
  sourceLinkBlock,
  typeExpressionString,
} from './doclet';
import { htmlToMdastBlocks } from './from-html';
import { resolveSlotText } from '../slots';

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
 * Inline signature suffix shown after a method/function name in its heading,
 * e.g. `(data) -> Promise.<number>`. Top-level params only (nested
 * `options.timeout` entries live in the Parameters table), names only — no param
 * types — matching the requested heading style; the return type follows ` -> `.
 * Returns `undefined` for non-functions, so fields/constants keep a bare name.
 */
export function memberSignatureSuffix(member: ClassMember): string | undefined {
  if (member.kind !== 'function') return undefined;
  const params = (member.params ?? [])
    .filter((param) => param.name && !param.name.includes('.'))
    .map((param) => param.name)
    .join(', ');
  const ret = typeExpressionString(member.returns?.[0]?.type);
  return `(${params})${ret ? ` -> ${ret}` : ''}`;
}

/**
 * Constructor call-signature for a class, e.g. `new Widget(id, [opts])`. Top-level
 * params only (nested `options.timeout` entries live in the Parameters table),
 * names only — no param types — mirroring {@link memberSignatureSuffix}. Optional
 * params are wrapped `[name]` and rest params prefixed `...name`, the look the
 * default JSDoc template gives a constructor. `name` is the class name.
 */
export function constructorSignature(name: string, params: readonly TDocletParam[]): string {
  const list = params
    .filter((param) => param.name && !param.name.includes('.'))
    .map((param) => {
      const pname = param.variable ? `...${param.name}` : (param.name as string);
      return param.optional ? `[${pname}]` : pname;
    })
    .join(', ');
  return `new ${name}(${list})`;
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
 * Render one member as: a `<MemberHeading>` (an `h{depth}` whose content is one
 * `<code>` showing the full signature — `process(data) -> Promise.<number>` for
 * methods/functions, the bare name for fields — with an explicit id so the
 * anchor stays `slugifyHeading(name)`); a `<MemberMeta>` row (modifier/kind
 * chips on the left, the `filename:line` source link pinned right); then the
 * doclet's body via {@link docletBlocks}. TOC / search / `{@link}` resolve to
 * `#name` because the signature never feeds the slug (see {@link memberHeading}).
 * The `modifiers` section is skipped — the chips replace that paragraph.
 * Reusable for any kind with named, headed members.
 */
export function memberBlocks(
  member: ClassMember,
  options: DocletBlocksOptions = {},
  headingLevel: 2 | 3 | 4 = 3
): RootContent[] {
  const name = member.name ?? '(anonymous)';
  const suffix = memberSignatureSuffix(member);
  const out: RootContent[] = [
    memberHeading({
      id: slugifyHeading(name),
      depth: headingLevel,
      name,
      sig: suffix ? `${name}${suffix}` : name,
    }),
  ];

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
 * that apply; empty if none. Each referenced symbol hyperlinks to its page when
 * `resolveLink` is supplied and the name resolves — otherwise it stays inert
 * code, byte-identical to before.
 */
export function classRelationsBlocks(
  doclet: ClassView['doclet'],
  resolveLink?: DocletBlocksOptions['resolveLink']
): RootContent[] {
  const lines: { label: string; refs: readonly string[] | undefined }[] = [
    { label: 'Extends', refs: doclet.augments },
    { label: 'Implements', refs: doclet.implements },
    { label: 'Mixes', refs: doclet.mixes },
  ];

  return lines
    .filter(({ refs }) => refs && refs.length > 0)
    .map(({ label, refs }) => {
      const children: PhrasingContent[] = [strong(text(`${label}: `))];
      refs!.forEach((r, i) => {
        if (i > 0) children.push(text(', '));
        const resolved = resolveLink?.(r) ?? null;
        children.push(resolved && !resolved.external ? link(resolved.href, inlineCode(r)) : inlineCode(r));
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
  blocks.push(...classRelationsBlocks(view.doclet, options.resolveLink));

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

  // Constructor: every class page gets a Constructor section so the call
  // signature (e.g. `new Widget(id, [opts])`) always shows — conveying argument
  // order at a glance, which the vertical Parameters list doesn't, and matching
  // the default JSDoc/TypeDoc templates. A parameter-less class still shows a
  // bare `new ClassName()`. `@hideconstructor` opts out entirely (the author's
  // signal that the constructor isn't part of the public API).
  //
  // The constructor's own `description` (distinct from the class-level
  // `classdesc` rendered in the body above) is shown here ONLY when both fields
  // are present — the two-block case where a class and its `constructor` carry
  // separate doc comments. When a class has a single comment it lives in
  // `classdesc` (already shown), and a constructor-only comment is shown via the
  // body's `classdesc ?? description` fallback — so this never duplicates.
  if (view.kind === 'class' && !view.doclet.hideconstructor) {
    // Constructor params belong to the class symbol; key them under
    // `constructor.params.*` so their descriptions translate distinctly from any
    // member-level params on the same longname.
    const ctorParams = paramsList(
      view.constructorParams,
      { slots: options.slots, longname: view.doclet.longname, resolveLink: options.resolveLink },
      'constructor.params'
    );
    // The separately-documented constructor description (only when a class has
    // BOTH a classdesc and a constructor description). Translatable like any
    // description, keyed `…#constructor.description`.
    const ctorDescription =
      view.doclet.classdesc && view.doclet.description
        ? htmlToMdastBlocks(
            resolveSlotText(
              options.slots,
              view.doclet.longname,
              ['constructor', 'description'],
              view.doclet.description
            )
          )
        : [];
    const ctorName = view.doclet.name ?? view.doclet.longname ?? 'constructor';
    // Documented params carry optional/rest info (`new Cache([options])`); an
    // undocumented constructor falls back to bare names from the code metadata
    // (`new Base(options)`). The Parameters table below stays documented-only.
    const ctorSigParams: TDocletParam[] = view.constructorParams.length
      ? view.constructorParams
      : view.constructorParamNames.map((name) => ({ name }));
    blocks.push(hr(), h(2, text('Constructor')));
    blocks.push(p(inlineCode(constructorSignature(ctorName, ctorSigParams))));
    blocks.push(...ctorDescription);
    if (ctorParams) blocks.push(p(strong(text('Parameters'))), ctorParams);
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
export function classViewToMdast(view: ClassView, options: ClassViewToMdastOptions = {}): Root {
  return containerViewToMdast(view as ContainerView, options);
}

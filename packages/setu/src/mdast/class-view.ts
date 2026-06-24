import type { PhrasingContent, Root, RootContent } from 'mdast';
import { ClassMember, ClassView, ContainerView, MemberBuckets } from '../class-view';
import { slugifyHeading, TDoclet, TDocletOverload, TDocletParam, TDocletTypeParam } from '@clean-jsdoc-theme/utils';
import { code, h, hr, inlineCode, li, link, memberHeading, memberMeta, p, root, strong, text, ul } from './builders';
import {
  docletBlocks,
  DocletBlocksOptions,
  type DocletSection,
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
  /**
   * Document-model flavor. `'typedoc'` switches a class's member sections to
   * TypeDoc labels (Constructors/Properties/Methods/Accessors), renders enum
   * pages with an "Enumeration Members" section, and turns a module/namespace
   * page into a kind-grouped index of links to its exports. `'jsdoc'` (default)
   * keeps the original sections — byte-identical output.
   */
  flavor?: 'jsdoc' | 'typedoc';
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
 * TypeDoc-flavored member sections for a class/interface/mixin — TypeDoc's
 * labels (Properties / Accessors / Methods, plus static variants + Events). The
 * Constructor(s) section is emitted separately by {@link containerViewToMdast}.
 * Empty sections drop out via {@link memberSections}' `hideEmptySections`.
 */
export function typedocClassSections(buckets: MemberBuckets): SectionSpec[] {
  return [
    { title: 'Properties', members: buckets.instanceFields },
    { title: 'Accessors', members: buckets.accessors },
    { title: 'Methods', members: buckets.instanceMethods },
    { title: 'Static Properties', members: buckets.staticFields },
    { title: 'Static Methods', members: buckets.staticMethods },
    { title: 'Events', members: buckets.events },
    { title: 'Other', members: buckets.other },
  ];
}

/** Enum page: every member collapsed under one "Enumeration Members" section. */
export function enumMemberSections(buckets: MemberBuckets): SectionSpec[] {
  return [
    {
      title: 'Enumeration Members',
      members: [
        ...buckets.staticFields,
        ...buckets.instanceFields,
        ...buckets.enums,
        ...buckets.other,
      ],
    },
  ];
}

/**
 * Child-symbol → index section label, in TypeDoc display order. A member is
 * placed under the FIRST group it matches (so an `isEnum` symbol lands in
 * Enumerations, never Variables).
 */
const TYPEDOC_INDEX_GROUPS: { label: string; match: (m: ClassMember) => boolean }[] = [
  { label: 'Enumerations', match: (m) => m.isEnum === true || m.kind === 'enum' },
  { label: 'Classes', match: (m) => m.kind === 'class' },
  { label: 'Interfaces', match: (m) => m.kind === 'interface' },
  { label: 'Type Aliases', match: (m) => m.kind === 'typedef' },
  { label: 'Functions', match: (m) => m.kind === 'function' },
  { label: 'Variables', match: (m) => m.kind === 'variable' || m.kind === 'member' },
  { label: 'Namespaces', match: (m) => m.kind === 'namespace' },
  { label: 'Mixins', match: (m) => m.kind === 'mixin' },
];

/**
 * A module/namespace page under the typedoc flavor: a kind-grouped index of
 * LINKS to the exports that each own a standalone page, instead of inlining
 * their member bodies (matching default TypeDoc's module page). An export whose
 * longname doesn't resolve falls back to inert code.
 */
export function moduleIndexBlocks(
  view: ContainerView,
  options: ClassViewToMdastOptions
): RootContent[] {
  const members: ClassMember[] = [
    ...view.instanceMethods,
    ...view.staticMethods,
    ...view.instanceFields,
    ...view.staticFields,
    ...view.accessors,
    ...view.enums,
    ...view.events,
    ...view.other,
  ];
  if (members.length === 0) return [];

  // Assign each member to the first matching group, preserving member order.
  const grouped = new Map<string, ClassMember[]>();
  for (const m of members) {
    const group = TYPEDOC_INDEX_GROUPS.find((g) => g.match(m));
    if (!group) continue;
    const arr = grouped.get(group.label);
    if (arr) arr.push(m);
    else grouped.set(group.label, [m]);
  }
  if (grouped.size === 0) return [];

  const resolve = options.resolveLink;
  const blocks: RootContent[] = [hr()];
  for (const { label } of TYPEDOC_INDEX_GROUPS) {
    const items = grouped.get(label);
    if (!items || items.length === 0) continue;
    blocks.push(h(2, text(label)));
    blocks.push(
      ul(
        items.map((m) => {
          const name = m.name ?? m.longname ?? '(anonymous)';
          const resolved = m.longname ? (resolve?.(m.longname) ?? null) : null;
          const child: PhrasingContent =
            resolved && !resolved.external ? link(resolved.href, inlineCode(name)) : inlineCode(name);
          return li(p(child));
        })
      )
    );
  }
  return blocks;
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

// ── TypeScript signature rendering (typedoc flavor) ──────────────────────────
//
// Build the full TS signature default TypeDoc shows — `new Component<P extends
// ComponentProps = ComponentProps, S extends object = object>(props: P):
// Component<P, S>`, `addChild(child: Component): void`, `get state():
// ComponentState`, `_props: P`. JSDoc never reaches this path (gated on the
// typedoc flavor), so its `memberSignatureSuffix`/`constructorSignature`
// rendering is untouched.

/** Wrap a single-line signature onto multiple lines past this width. */
const SIG_WRAP_WIDTH = 64;

/** A type expression → its readable string (the `type.names`, `|`-joined). */
function tsType(type: { names?: readonly string[] } | undefined): string {
  return type?.names && type.names.length > 0 ? type.names.join(' | ') : '';
}

/** `<T extends C = D, …>` parts (one string per type parameter), or `[]`. */
function tsTypeParamParts(typeParams: readonly TDocletTypeParam[] | undefined): string[] {
  if (!typeParams || typeParams.length === 0) return [];
  return typeParams.map((tp) => {
    let s = tp.name;
    if (tp.constraint) s += ` extends ${tp.constraint}`;
    if (tp.default !== undefined && tp.default !== '') s += ` = ${tp.default}`;
    return s;
  });
}

/** `name: Type`, with `?` for optional and `...` for rest; top-level params only. */
function tsParamParts(params: readonly TDocletParam[] | undefined): string[] {
  if (!params) return [];
  return params
    .filter((pm) => pm.name && !pm.name.includes('.'))
    .map((pm) => {
      const base = pm.variable ? `...${pm.name}` : (pm.name as string);
      const t = tsType(pm.type);
      return `${base}${pm.optional ? '?' : ''}${t ? `: ${t}` : ''}`;
    });
}

/**
 * Assemble a callable signature, wrapping onto multiple lines (one type param /
 * param per indented line) once the single-line form is long — matching how
 * default TypeDoc lays out wide constructor/method signatures.
 */
function formatCallable(
  prefix: string,
  typeParamParts: readonly string[],
  paramParts: readonly string[],
  ret: string
): string {
  const tp = typeParamParts.length > 0 ? `<${typeParamParts.join(', ')}>` : '';
  const single = `${prefix}${tp}(${paramParts.join(', ')})${ret}`;
  if (single.length <= SIG_WRAP_WIDTH) return single;

  const lines: string[] = [];
  if (typeParamParts.length > 0) {
    lines.push(`${prefix}<`);
    for (const t of typeParamParts) lines.push(`    ${t},`);
    lines.push('>(');
  } else {
    lines.push(`${prefix}(`);
  }
  for (const pm of paramParts) lines.push(`    ${pm},`);
  lines.push(`)${ret}`);
  return lines.join('\n');
}

/** The class instance type for a constructor's return, e.g. `Component<P, S>`. */
function instanceType(className: string, typeParams: readonly TDocletTypeParam[] | undefined): string {
  if (!typeParams || typeParams.length === 0) return className;
  return `${className}<${typeParams.map((tp) => tp.name).join(', ')}>`;
}

/** Full TS constructor signature, e.g. `new Widget<T>(opts: T): Widget<T>`. */
function tsConstructorSignature(
  className: string,
  typeParams: readonly TDocletTypeParam[] | undefined,
  params: readonly TDocletParam[]
): string {
  return formatCallable(
    `new ${className}`,
    tsTypeParamParts(typeParams),
    tsParamParts(params),
    `: ${instanceType(className, typeParams)}`
  );
}

/** A callable signature `name<T>(p: T): Ret` from explicit signature parts. */
function tsCallableSignature(
  name: string,
  typeParams: readonly TDocletTypeParam[] | undefined,
  params: readonly TDocletParam[] | undefined,
  returns: readonly TDocletParam[] | undefined
): string {
  const ret = tsType(returns?.[0]?.type);
  return formatCallable(name, tsTypeParamParts(typeParams), tsParamParts(params), ret ? `: ${ret}` : '');
}

/**
 * Full TS signature for a member: a callable form for functions/methods
 * (`name<T>(p: T): Ret`), `get name(): Type` for accessors, and `name: Type`
 * for fields. Returns `null` when there's nothing meaningful to show.
 */
function tsMemberSignature(member: ClassMember): string | null {
  const name = member.name;
  if (!name) return null;
  if (member.kind === 'function') {
    return tsCallableSignature(name, member.typeParams, member.params, member.returns);
  }
  const t = tsType(member.type);
  if (member.isAccessor) return `get ${name}()${t ? `: ${t}` : ''}`;
  return t ? `${name}: ${t}` : name;
}

/** A callable doclet (function/method) that carries overload signatures. */
function hasOverloads(doclet: { overloads?: readonly TDocletOverload[] }): boolean {
  return (doclet.overloads?.length ?? 0) > 0;
}

/**
 * Sections rendered once on the shared member body when a callable is
 * overloaded — its `ts` signatures (with per-signature type params / parameters
 * / returns) move into {@link overloadSignatureBlocks}, so the shared body skips
 * exactly those.
 */
const SHARED_BODY_SKIP_FOR_OVERLOADS: readonly DocletSection[] = [
  'typeParams',
  'params',
  'returns',
  'type',
];

/**
 * Per-signature body sections: everything *except* the signature's own type
 * params / parameters / returns is rendered once on the shared body, so a
 * per-signature render skips it. (A signature's own `description` isn't a
 * skippable section — it flows through {@link docletBlocks} — which is exactly
 * how an overload's description renders under its own block.)
 */
const PER_SIGNATURE_SKIP: readonly DocletSection[] = [
  'summary',
  'modifiers',
  'relations',
  'this',
  'alias',
  'remarks',
  'properties',
  'yields',
  'throws',
  'type',
  'default',
  'fires',
  'listens',
  'examples',
  'iframes',
  'metadata',
  'deprecation',
  'inherited',
];

/**
 * One `ts` code block per call signature of an overloaded function/method — the
 * first signature (from the doclet's own `typeParams`/`params`/`returns`) then
 * each `overloads[]` entry — each followed by that signature's Type Parameters /
 * Parameters / Returns (and an overload's own description). Matches default
 * TypeDoc, which stacks every overload signature with its own parameters. The
 * first signature's shared description/examples/etc. already render on the
 * member body, so they aren't repeated here. Only reached under the typedoc
 * flavor for a doclet that {@link hasOverloads}.
 */
function overloadSignatureBlocks(
  doclet: ClassMember | ContainerView['doclet'],
  options: DocletBlocksOptions
): RootContent[] {
  const name = doclet.name;
  if (!name) return [];
  const signatures: TDocletOverload[] = [
    { typeParams: doclet.typeParams, params: doclet.params, returns: doclet.returns },
    ...(doclet.overloads ?? []),
  ];
  const out: RootContent[] = [];
  for (const sig of signatures) {
    out.push(code('ts', tsCallableSignature(name, sig.typeParams, sig.params, sig.returns)));
    // A synthetic doclet carrying only this signature's data, so docletBlocks
    // renders its Type Parameters / Parameters / Returns (and the overload's own
    // description, which isn't a skippable section).
    const synthetic: TDoclet = {
      kind: doclet.kind,
      name,
      longname: doclet.longname,
      scope: doclet.scope,
      typeParams: sig.typeParams,
      params: sig.params,
      returns: sig.returns,
    };
    if (sig.description) synthetic.description = sig.description;
    out.push(...docletBlocks(synthetic, { ...options, skip: PER_SIGNATURE_SKIP }));
  }
  return out;
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
  const typedoc = options.flavor === 'typedoc';
  // JSDoc: the heading IS the signature (`process(data) -> ret`). TypeDoc: the
  // heading is the bare name and the full TS signature renders as a `ts` code
  // block below (matching default TypeDoc), so the anchor stays `#name` either way.
  const suffix = typedoc ? undefined : memberSignatureSuffix(member);
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

  // TypeDoc: the full TS signature as a highlighted code block, then the body
  // with the now-redundant "Type" field suppressed (the type is in the signature).
  const skip: DocletSection[] = [...(options.skip ?? []), 'modifiers'];
  if (typedoc && hasOverloads(member)) {
    // Overloaded: the shared body (description/examples/…) renders once with its
    // per-signature sections suppressed, then every signature stacks below with
    // its own parameters/returns — matching default TypeDoc.
    out.push(...docletBlocks(member, { ...options, skip: [...skip, ...SHARED_BODY_SKIP_FOR_OVERLOADS] }));
    out.push(...overloadSignatureBlocks(member, options));
    return out;
  }
  if (typedoc) {
    const sig = tsMemberSignature(member);
    if (sig) out.push(code('ts', sig));
    skip.push('type');
  }

  out.push(...docletBlocks(member, { ...options, skip }));
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

  // Title — fall back to a capitalized kind word when a doclet carries neither
  // a name nor a longname (rare), instead of the old hardcoded "Class".
  const titleFallback = view.kind.charAt(0).toUpperCase() + view.kind.slice(1);
  blocks.push(h(pageLevel, text(view.doclet.name ?? view.doclet.longname ?? titleFallback)));

  // Extends/Implements/Mixes
  blocks.push(...classRelationsBlocks(view.doclet));

  // Standalone function/variable pages (typedoc flavor): the full TS signature
  // as a code block, right under the title — matching default TypeDoc, where a
  // function page leads with `name<T>(p: T): Ret` and a variable with `name: T`.
  const fnVarPage =
    options.flavor === 'typedoc' && (view.kind === 'function' || view.kind === 'variable');
  // An overloaded standalone function stacks every signature below the body
  // (handled after docletBlocks); a single-signature one leads with its block.
  const fnOverloaded = fnVarPage && view.kind === 'function' && hasOverloads(view.doclet);
  if (fnVarPage && !fnOverloaded) {
    const sig = tsMemberSignature(view.doclet);
    if (sig) blocks.push(code('ts', sig));
  }

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
      : fnOverloaded
        ? [...(options.skip ?? []), 'relations', ...SHARED_BODY_SKIP_FOR_OVERLOADS]
        : [...(options.skip ?? []), 'relations'];
  blocks.push(...docletBlocks(view.doclet, { ...options, skip }));

  // Overloaded standalone function: stack each signature (with its own
  // parameters/returns) after the shared body — matching default TypeDoc.
  if (fnOverloaded) {
    blocks.push(...overloadSignatureBlocks(view.doclet, options));
  }

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
      { slots: options.slots, longname: view.doclet.longname },
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
    if (options.flavor === 'typedoc') {
      // TypeDoc layout: "Constructors" → a `constructor` member heading → the
      // full TS call signature → description → Parameters → Returns (the class
      // instance type). Class type parameters are already shown in the class
      // body above, so they aren't repeated here.
      blocks.push(hr(), h(2, text('Constructors')));
      blocks.push(
        memberHeading({ id: 'constructor', depth: 3, name: 'constructor', sig: 'constructor' })
      );
      blocks.push(code('ts', tsConstructorSignature(ctorName, view.doclet.typeParams, ctorSigParams)));
      blocks.push(...ctorDescription);
      if (ctorParams) blocks.push(p(strong(text('Parameters'))), ctorParams);
      blocks.push(
        p(strong(text('Returns'))),
        p(inlineCode(instanceType(ctorName, view.doclet.typeParams)))
      );
    } else {
      blocks.push(hr(), h(2, text('Constructor')));
      blocks.push(p(inlineCode(constructorSignature(ctorName, ctorSigParams))));
      blocks.push(...ctorDescription);
      if (ctorParams) blocks.push(p(strong(text('Parameters'))), ctorParams);
    }
  }

  // Members. Under the typedoc flavor the layout is kind-specific (a links index
  // for modules/namespaces, "Enumeration Members" for enums, TypeDoc labels for
  // classes); the jsdoc default keeps the original bucketed sections.
  if (options.flavor === 'typedoc') {
    blocks.push(...typedocMemberBlocks(view, options));
  } else {
    const sections = defaultSections(view);
    if (sections.some((s) => s.members.length > 0)) blocks.push(hr());
    blocks.push(...memberSections(sections, options));
  }

  return root(...blocks);
}

/**
 * TypeDoc-flavored member rendering for a container, dispatched by kind:
 * module/namespace → a kind-grouped links index ({@link moduleIndexBlocks});
 * enum → an "Enumeration Members" section; class/interface/mixin → TypeDoc
 * labels ({@link typedocClassSections}); function/variable/typedef carry their
 * content in the body (params/returns/type/properties) and have no member
 * sections.
 */
function typedocMemberBlocks(view: ContainerView, options: ClassViewToMdastOptions): RootContent[] {
  if (view.kind === 'module' || view.kind === 'namespace') {
    return moduleIndexBlocks(view, options);
  }
  let sections: SectionSpec[] | null = null;
  if (view.kind === 'enum') sections = enumMemberSections(view);
  else if (
    view.kind === 'class' ||
    view.kind === 'interface' ||
    view.kind === 'mixin' ||
    view.kind === 'global'
  ) {
    sections = typedocClassSections(view);
  }
  if (!sections) return [];
  const out: RootContent[] = [];
  if (sections.some((s) => s.members.length > 0)) out.push(hr());
  out.push(...memberSections(sections, options));
  return out;
}

/**
 * Turn a ClassView into a complete mdast Root tree. Thin alias over
 * {@link containerViewToMdast} — a ClassView is a `ContainerView` with
 * `kind: 'class'`.
 */
export function classViewToMdast(view: ClassView, options: ClassViewToMdastOptions = {}): Root {
  return containerViewToMdast(view as ContainerView, options);
}

/**
 * THE adapter: `ProjectReflection` → flat `TDoclet[]`.
 *
 * Walks the reflection tree depth-first and emits one `TDoclet` per documented
 * symbol. The list is FLAT — setu re-nests members via `memberof`, exactly like
 * the JSDoc path. Kind mapping (v1) follows the plan's table:
 *
 *   Class      → `class`     (constructor signature params folded into the class)
 *   Interface  → `interface`
 *   Function   → `function`  (top-level → scope `global`)
 *   Method     → `function`  (scope from `flags.isStatic`)
 *   Constructor→ —           (NOT emitted; its params live on the class doclet)
 *   Property   → `member`
 *   Variable   → `member`
 *   Accessor   → `member`    (get-signature return type → `type`)
 *   Enum       → `enum`      (with `isEnum: true`; renders as a member section)
 *   EnumMember → `member`    (scope `static`; an entry under its enum)
 *   TypeAlias  → `typedef`   (type → body; function-type aliases keep params/returns)
 *   Module     → `module`    (top-level container page)
 *   Namespace  → `namespace` (top-level container page)
 *
 * `Reference`/re-exports remain DEFERRED — they are skipped cleanly here and
 * counted in {@link AdaptResult}.
 *
 * Bitflag kinds are matched with `reflection.kindOf(...)`, never `===`.
 */
import { ReflectionKind } from 'typedoc';
import type {
  DeclarationReflection,
  ParameterReflection,
  ProjectReflection,
  Reflection,
  ReferenceType,
  SignatureReflection,
  SomeType,
  TypeParameterReflection,
} from 'typedoc';
import type {
  TDoclet,
  TDocletKind,
  TDocletOverload,
  TDocletParam,
  TDocletTypeParam,
} from '@clean-jsdoc-theme/utils';
import {
  applyCommentFields,
  commentFields,
  flagFields,
  summaryToHtml,
  type LinkResolver,
} from './comment';
import { longnameOf, synthesizeName } from './names';
import { typeToDocletType } from './types';

/** Result of an adapter run: the doclets plus counts of what was skipped. */
export interface AdaptResult {
  doclets: TDoclet[];
  /** Reflections skipped because their kind is deferred to a later phase. */
  skipped: { kind: string; name: string; longname: string }[];
}

/** Optional logger (TypeDoc's `app.logger` shape — `info`/`warn`). */
export interface AdaptLogger {
  info?(message: string): void;
  warn?(message: string): void;
}

/** Kinds handled in v1 (everything else is deferred). */
const HANDLED =
  ReflectionKind.Class |
  ReflectionKind.Interface |
  ReflectionKind.Function |
  ReflectionKind.Method |
  ReflectionKind.Property |
  ReflectionKind.Variable |
  ReflectionKind.Accessor |
  ReflectionKind.Enum |
  ReflectionKind.EnumMember |
  ReflectionKind.TypeAlias |
  ReflectionKind.Module |
  ReflectionKind.Namespace;

/** Container kinds whose children we walk into. */
const CONTAINER =
  ReflectionKind.Project |
  ReflectionKind.Module |
  ReflectionKind.Namespace |
  ReflectionKind.Class |
  ReflectionKind.Interface |
  ReflectionKind.Enum;

/**
 * Adapt a whole project. The returned doclets are flat and ready for
 * `salty.taffy(...)`.
 */
export function reflectionsToDoclets(project: ProjectReflection, logger?: AdaptLogger): TDoclet[] {
  return adaptProject(project, logger).doclets;
}

/** Like {@link reflectionsToDoclets} but also returns skip diagnostics. */
export function adaptProject(project: ProjectReflection, logger?: AdaptLogger): AdaptResult {
  const result: AdaptResult = { doclets: [], skipped: [] };
  const resolveLink: LinkResolver = (target) => {
    try {
      const ln = longnameOf(target);
      return ln || undefined;
    } catch {
      return undefined;
    }
  };

  walk(project, result, resolveLink);
  computeReverseImplementations(result.doclets);

  if (result.skipped.length && logger?.info) {
    const byKind = new Map<string, number>();
    for (const s of result.skipped) byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + 1);
    const summary = [...byKind].map(([k, n]) => `${k}×${n}`).join(', ');
    logger.info(`[clean-jsdoc-theme] deferred reflections skipped: ${summary}`);
  }

  return result;
}

/** Depth-first walk: emit a doclet for `reflection` (if handled), then recurse. */
function walk(reflection: Reflection, result: AdaptResult, resolveLink: LinkResolver): void {
  if (!reflection.isProject()) {
    const declaration = reflection as DeclarationReflection;

    if (reflection.kindOf(HANDLED)) {
      const doclet = adaptDeclaration(declaration, resolveLink);
      if (doclet) result.doclets.push(doclet);
    } else if (!reflection.kindOf(CONTAINER)) {
      // Not a container and not handled → a deferred symbol (a `Reference`
      // re-export, etc.). Record and skip cleanly; nothing under it is lost
      // because a non-container has no documented children.
      result.skipped.push({
        kind: ReflectionKind[reflection.kind] ?? String(reflection.kind),
        name: reflection.name,
        longname: safeLongname(reflection),
      });
      return;
    }
  }

  // Recurse into children of any container (handled containers — module /
  // namespace / enum / class / interface — emit their own doclet above AND
  // surface their members here).
  const children = (reflection as DeclarationReflection).children;
  if (children) {
    for (const child of children) walk(child, result, resolveLink);
  }
}

function safeLongname(reflection: Reflection): string {
  try {
    return longnameOf(reflection);
  } catch {
    return reflection.name;
  }
}

/**
 * After the full flat doclet list is built, compute the reverse index: for
 * every doclet that `implements` an interface, push its longname onto that
 * interface's `implementations`. This can only run once every doclet exists,
 * since a class earlier in the walk order may implement an interface that
 * appears later (or vice versa).
 */
function computeReverseImplementations(doclets: TDoclet[]): void {
  const byLongname = new Map(
    doclets.filter((d) => d.longname).map((d) => [d.longname as string, d])
  );
  for (const d of doclets) {
    for (const iface of d.implements ?? []) {
      const target = byLongname.get(iface);
      if (!target || !d.longname) continue;
      (target.implementations ??= []).push(d.longname);
    }
  }
}

/** Map one handled declaration reflection to a doclet. */
function adaptDeclaration(
  reflection: DeclarationReflection,
  resolveLink: LinkResolver
): TDoclet | null {
  const { name, longname, memberof, scope } = synthesizeName(reflection);

  const kind = docletKind(reflection);
  if (!kind) return null;

  const doclet: TDoclet = { kind, name, longname, scope };
  // Critical guard: never emit longname === memberof (the self-reference bug).
  if (memberof && memberof !== longname) doclet.memberof = memberof;

  // An enum carries `isEnum` so setu buckets its members under the enum; under
  // the typedoc flavor setu also gives the enum its own standalone page.
  if (reflection.kindOf(ReflectionKind.Enum)) doclet.isEnum = true;

  // Tag accessors so setu can route them to an "Accessors" section (TypeDoc
  // parity) instead of folding them into Fields. JSDoc never sets this flag.
  if (reflection.kindOf(ReflectionKind.Accessor)) doclet.isAccessor = true;

  // Structured generics → a real "Type Parameters" section. Type parameters live
  // on the reflection for class/interface/type-alias and on the call signature
  // for functions/methods.
  const typeParams = adaptTypeParams(
    reflection.typeParameters ?? reflection.signatures?.[0]?.typeParameters,
    resolveLink
  );
  if (typeParams) doclet.typeParams = typeParams;

  // Flags (readonly / virtual / optional / access).
  Object.assign(doclet, flagFields(reflection));

  // Inheritance relations (override / inheritedFrom / implementationOf). TypeDoc
  // puts these on the member reflection itself for properties, and on the first
  // call signature for methods — read both so either shape is covered.
  applyMemberRelations(reflection, doclet, resolveLink);

  // Source coords → meta (drives "Source: file:line" links + source pages).
  const meta = sourceMeta(reflection);
  if (meta) doclet.meta = meta;

  // Comment summary → HTML; classes use `classdesc`, everything else `description`.
  const summary = summaryToHtml(reflection.comment, resolveLink);
  if (summary) {
    if (reflection.kindOf(ReflectionKind.Class)) doclet.classdesc = summary;
    else doclet.description = summary;
  }

  // Block tags + flags from the comment (examples/returns/see/deprecated/…).
  const fields = commentFields(reflection.comment, resolveLink);
  applyCommentFields(doclet, fields);

  if (reflection.kindOf(ReflectionKind.Class | ReflectionKind.Interface)) {
    adaptContainer(reflection, doclet, resolveLink);
  } else if (reflection.kindOf(ReflectionKind.Function | ReflectionKind.Method)) {
    adaptCallable(reflection, doclet, fields.paramDescriptions, resolveLink);
  } else if (reflection.kindOf(ReflectionKind.TypeAlias)) {
    adaptTypeAlias(reflection, doclet, fields.paramDescriptions, resolveLink);
  } else if (reflection.kindOf(ReflectionKind.Enum)) {
    // The enum's `@enum {T}` member type, when uniform — purely cosmetic; its
    // members arrive separately via the children walk.
    const docletType = typeToDocletType(reflection.type);
    if (docletType) doclet.type = docletType;
  } else if (reflection.kindOf(ReflectionKind.Module | ReflectionKind.Namespace)) {
    // Container pages — no body of their own; members come from the walk.
  } else {
    adaptValue(reflection, doclet, resolveLink);
  }

  return doclet;
}

/** Resolve the `TDoclet.kind` for a handled reflection. */
function docletKind(reflection: Reflection): TDocletKind | null {
  if (reflection.kindOf(ReflectionKind.Class)) return 'class';
  if (reflection.kindOf(ReflectionKind.Interface)) return 'interface';
  if (reflection.kindOf(ReflectionKind.Module)) return 'module';
  if (reflection.kindOf(ReflectionKind.Namespace)) return 'namespace';
  if (reflection.kindOf(ReflectionKind.Enum)) return 'enum';
  if (reflection.kindOf(ReflectionKind.TypeAlias)) return 'typedef';
  if (reflection.kindOf(ReflectionKind.Function | ReflectionKind.Method)) return 'function';
  // A top-level variable is its own page kind under the typedoc flavor; class
  // fields are `Property` (→ member), never `Variable`, so this only catches
  // module/global values.
  if (reflection.kindOf(ReflectionKind.Variable)) return 'variable';
  // Enum members render as static member entries under the enum (`Roles.ADMIN`).
  if (
    reflection.kindOf(
      ReflectionKind.Property | ReflectionKind.Accessor | ReflectionKind.EnumMember
    )
  )
    return 'member';
  return null;
}

/**
 * Map a base-type list (`extendedTypes`/`implementedTypes`) to longnames. The
 * common case is a `ReferenceType` resolved to an in-project reflection — use
 * the same longname resolver as `{@link}`. An external / unresolved reference
 * (or any other type shape) falls back to its readable `toString()`.
 */
function baseLongnames(
  types: readonly SomeType[] | undefined,
  resolveLink: LinkResolver
): string[] {
  const out: string[] = [];
  for (const t of types ?? []) {
    const ref = t as ReferenceType;
    const ln = ref.reflection ? resolveLink(ref.reflection) : undefined;
    out.push(ln || t.toString());
  }
  return out;
}

/**
 * Resolve one `ReferenceType` relation link (`overwrites`/`inheritedFrom`/
 * `implementationOf`) to a longname, falling back to the reference's own
 * (unresolved) name when it doesn't point at an in-project reflection.
 */
function relationLongname(ref: ReferenceType, resolveLink: LinkResolver): string {
  return (ref.reflection && resolveLink(ref.reflection)) || ref.name;
}

/**
 * Member-level inheritance relations: `override`/`overrides`, `inherited`/
 * `inherits`, and `implementationOf`. TypeDoc sets these on the member
 * reflection for properties/accessors, and on the first call signature for
 * methods — read both so either shape is covered.
 */
function applyMemberRelations(
  reflection: DeclarationReflection,
  doclet: TDoclet,
  resolveLink: LinkResolver
): void {
  const signature = reflection.signatures?.[0];

  const inheritedFrom = reflection.inheritedFrom ?? signature?.inheritedFrom;
  if (inheritedFrom) {
    doclet.inherited = true;
    doclet.inherits = relationLongname(inheritedFrom, resolveLink);
  }

  const overwrites = reflection.overwrites ?? signature?.overwrites;
  if (overwrites) {
    doclet.override = true;
    doclet.overrides = relationLongname(overwrites, resolveLink);
  }

  const implementationOf = reflection.implementationOf ?? signature?.implementationOf;
  if (implementationOf) {
    doclet.implementationOf = relationLongname(implementationOf, resolveLink);
  }
}

/**
 * Class / interface: fold the constructor's first signature parameters into the
 * container doclet's `params` (so the Constructor section renders), without
 * emitting the Constructor as a member. Also carries `extends`/`implements`
 * relationships (the reverse `implementations` index is computed later, once
 * every doclet exists).
 */
function adaptContainer(
  reflection: DeclarationReflection,
  doclet: TDoclet,
  resolveLink: LinkResolver
): void {
  const ctor = reflection.children?.find((c) => c.kindOf(ReflectionKind.Constructor));
  const signature = firstSignature(ctor);
  if (signature) {
    const params = adaptParameters(signature, new Map(), resolveLink);
    if (params.length) doclet.params = params;
  }

  const ext = baseLongnames(reflection.extendedTypes, resolveLink);
  if (ext.length) doclet.augments = ext;
  const impl = baseLongnames(reflection.implementedTypes, resolveLink);
  if (impl.length) doclet.implements = impl;
}

/** Function / method: read the first signature for params + return type. */
function adaptCallable(
  reflection: DeclarationReflection,
  doclet: TDoclet,
  paramDescriptions: Map<string, string>,
  resolveLink: LinkResolver
): void {
  const signatures = reflection.signatures ?? [];
  // The first signature drives the doclet's own params/returns/typeParams; any
  // additional overloads are captured on `overloads[]` below.
  const signature = signatures[0];
  if (!signature) return;

  // The signature may carry its own comment (TypeDoc usually puts method docs on
  // the call signature, not the method reflection). Merge it if the reflection
  // itself had none.
  if (!doclet.description && !doclet.classdesc) {
    const sigSummary = summaryToHtml(signature.comment, resolveLink);
    if (sigSummary) doclet.description = sigSummary;
  }
  const sigFields = commentFields(signature.comment, resolveLink);
  // TypeDoc puts a function/method's block tags on the call SIGNATURE comment,
  // not the reflection — adopt any the reflection itself didn't carry.
  if (!doclet.returns && sigFields.returns) doclet.returns = sigFields.returns;
  if (!doclet.remarks && sigFields.remarks) doclet.remarks = sigFields.remarks;
  if (!doclet.examples && sigFields.examples) doclet.examples = sigFields.examples;
  if (!doclet.exceptions && sigFields.exceptions) doclet.exceptions = sigFields.exceptions;
  if (!doclet.see && sigFields.see) doclet.see = sigFields.see;
  if (doclet.deprecated === undefined && sigFields.deprecated !== undefined)
    doclet.deprecated = sigFields.deprecated;
  if (doclet.since === undefined && sigFields.since !== undefined) doclet.since = sigFields.since;
  if (!doclet.author && sigFields.author) doclet.author = sigFields.author;
  if (sigFields.tags) doclet.tags = [...(doclet.tags ?? []), ...sigFields.tags];

  const mergedDescriptions = new Map(paramDescriptions);
  for (const [k, v] of sigFields.paramDescriptions) {
    if (!mergedDescriptions.has(k)) mergedDescriptions.set(k, v);
  }

  const params = adaptParameters(signature, mergedDescriptions, resolveLink);
  if (params.length) doclet.params = params;

  // Return type / description.
  const returnType = typeToDocletType(signature.type);
  const existingReturn = doclet.returns?.[0];
  if (returnType || existingReturn) {
    const ret: TDocletParam = { ...(existingReturn ?? {}) };
    if (returnType) ret.type = returnType;
    doclet.returns = [ret, ...(doclet.returns?.slice(1) ?? [])];
  }

  // Overloads: every signature beyond the first becomes an `overloads[]` entry
  // carrying its own generics / parameters / return type (and its own
  // description — TypeDoc puts each overload's docs on its own signature
  // comment). The first signature stays on the doclet itself, so a
  // single-signature member is unchanged. setu renders these only under the
  // typedoc flavor; the JSDoc path never sets `overloads`.
  const overloads = signatures.slice(1).map((sig) => adaptOverload(sig, resolveLink));
  if (overloads.length) doclet.overloads = overloads;
}

/** One overload signature → the per-signature data that differs from the first. */
function adaptOverload(
  signature: SignatureReflection,
  resolveLink: LinkResolver
): TDocletOverload {
  const overload: TDocletOverload = {};

  const typeParams = adaptTypeParams(signature.typeParameters, resolveLink);
  if (typeParams) overload.typeParams = typeParams;

  const fields = commentFields(signature.comment, resolveLink);
  const params = adaptParameters(signature, fields.paramDescriptions, resolveLink);
  if (params.length) overload.params = params;

  const returnType = typeToDocletType(signature.type);
  const existingReturn = fields.returns?.[0];
  if (returnType || existingReturn) {
    const ret: TDocletParam = { ...(existingReturn ?? {}) };
    if (returnType) ret.type = returnType;
    overload.returns = [ret];
  }

  const description = summaryToHtml(signature.comment, resolveLink);
  if (description) overload.description = description;

  return overload;
}

/**
 * Type alias → `typedef`. Three shapes, matching JSDoc's `@typedef` doclets:
 *
 *   - A **function-type** alias (`type Fn = (x: number) => boolean`) is modelled
 *     by TypeDoc (0.28) as a `ReflectionType` whose `declaration` carries
 *     `signatures`. We surface `type: {names:['function']}` + the signature's
 *     `params`/`returns` (mirrors JSDoc's `@callback`).
 *   - An **object-literal** alias (`type Point = { x: number; y: number }`) is a
 *     TypeAlias reflection that carries the members directly as its own
 *     `children` (TypeDoc inlines the object literal); each becomes a
 *     `properties[]` entry (JSDoc's `@property` list). The TypeAlias is NOT a
 *     container, so the walk never re-emits these children as standalone doclets.
 *   - Anything else (unions, primitives, references) keeps a single readable
 *     `type` string via `type.toString()`.
 */
function adaptTypeAlias(
  reflection: DeclarationReflection,
  doclet: TDoclet,
  paramDescriptions: Map<string, string>,
  resolveLink: LinkResolver
): void {
  const type = reflection.type;
  const declaration =
    type && type.type === 'reflection'
      ? (type as { declaration?: DeclarationReflection }).declaration
      : undefined;

  // Function-type alias: lift the first call signature's params/returns. The
  // signatures may live on the reflection itself or on the reflection-type's
  // inlined declaration, depending on how TypeDoc modelled it.
  const signature = reflection.signatures?.[0] ?? declaration?.signatures?.[0];
  if (signature) {
    doclet.type = { names: ['function'] };
    const params = adaptParameters(signature, paramDescriptions, resolveLink);
    if (params.length) doclet.params = params;
    const returnType = typeToDocletType(signature.type);
    if (returnType) doclet.returns = [{ type: returnType }];
    return;
  }

  // Object-literal alias: properties live directly on the alias's `children`
  // (TypeDoc 0.28) or on the inlined reflection-type declaration. Each → a
  // `properties[]` entry.
  const props = objectLiteralProperties(reflection, resolveLink);
  if (props) {
    doclet.type = { names: ['Object'] };
    doclet.properties = props;
    return;
  }

  // Plain alias (union / primitive / reference): a single readable type string.
  const docletType = typeToDocletType(type);
  if (docletType) doclet.type = docletType;
}

/**
 * The members of an object-literal type, as `properties[]`, or `undefined` when
 * the reflection isn't an object literal. Shared by `adaptTypeAlias` (a
 * `type T = { … }`) and `adaptValue` (a `const C = { … } as const`) — both model
 * the body as `children`, either directly on the reflection (TypeDoc 0.28
 * inlines object-literal aliases) or on the inlined reflection-type declaration
 * (a const object's `ReflectionType`). Each child → a `name`/`type`/`optional`/
 * `description` entry, the same shape JSDoc's `@property` list uses.
 */
function objectLiteralProperties(
  reflection: DeclarationReflection,
  resolveLink: LinkResolver
): TDocletParam[] | undefined {
  const type = reflection.type;
  const declaration =
    type && type.type === 'reflection'
      ? (type as { declaration?: DeclarationReflection }).declaration
      : undefined;
  // A function-type reflection (signatures, no member children) is NOT an object
  // literal — leave it to the callable path.
  if (declaration?.signatures?.length) return undefined;
  const children = reflection.children ?? declaration?.children;
  if (!children || children.length === 0) return undefined;
  return children.map((child) => {
    const prop: TDocletParam = { name: child.name };
    const propType = typeToDocletType(child.getSignature?.type ?? child.type);
    if (propType) prop.type = propType;
    if (child.flags?.isOptional) prop.optional = true;
    const description = summaryToHtml(child.comment, resolveLink);
    if (description) prop.description = description;
    return prop;
  });
}

/** Property / variable / accessor: value type → `type`, default → `defaultvalue`. */
function adaptValue(
  reflection: DeclarationReflection,
  doclet: TDoclet,
  resolveLink: LinkResolver
): void {
  // Accessor: prefer the get-signature's return type.
  const getSig = reflection.getSignature;
  const type = getSig?.type ?? reflection.type;
  const docletType = typeToDocletType(type);
  if (docletType) doclet.type = docletType;

  // A `const C = { … }` object literal carries its members as `properties[]`
  // (each with its own doc comment) — the same recovery `adaptTypeAlias` does
  // for `type T = { … }`. Accessors read their type off `getSignature`, so this
  // only ever fires for an object-valued variable/property. setu renders these
  // as a "Type declaration" section and expands the inline type signature.
  if (!getSig) {
    const props = objectLiteralProperties(reflection, resolveLink);
    if (props) doclet.properties = props;
  }

  // TypeDoc emits `...` as a placeholder for an initializer it doesn't print
  // (an object / complex value) — never a meaningful default, so don't carry it
  // (it would render as a bare "Default: ..." line).
  if (reflection.defaultValue !== undefined && reflection.defaultValue !== '...') {
    doclet.defaultvalue = reflection.defaultValue;
  }

  // An accessor with only a setter description: pull its summary if missing.
  if (!doclet.description && getSig?.comment) {
    const summary = summaryToHtml(getSig.comment);
    if (summary) doclet.description = summary;
  }
}

/** First signature of a (possibly undefined) reflection that has signatures. */
function firstSignature(
  reflection: DeclarationReflection | undefined
): SignatureReflection | undefined {
  return reflection?.signatures?.[0];
}

/**
 * Map a reflection's (or signature's) type parameters to structured
 * `typeParams`. `constraint` is the `extends` bound and `default` the `= …`
 * default, both kept as readable type strings (`type.toString()`, matching
 * {@link typeToDocletType}'s v1 approach). Returns `undefined` for none so the
 * caller can assign conditionally.
 */
function adaptTypeParams(
  typeParameters: readonly TypeParameterReflection[] | undefined,
  resolveLink: LinkResolver
): TDocletTypeParam[] | undefined {
  if (!typeParameters || typeParameters.length === 0) return undefined;
  return typeParameters.map((tp) => {
    const out: TDocletTypeParam = { name: tp.name };
    if (tp.type) out.constraint = tp.type.toString();
    if (tp.default) out.default = tp.default.toString();
    const description = summaryToHtml(tp.comment, resolveLink);
    if (description) out.description = description;
    return out;
  });
}

/** Map a signature's parameters to doclet params, merging in block-tag descriptions. */
function adaptParameters(
  signature: SignatureReflection,
  descriptions: Map<string, string>,
  resolveLink: LinkResolver
): TDocletParam[] {
  const params = signature.parameters ?? [];
  return params.map((param) => adaptParameter(param, descriptions, resolveLink));
}

function adaptParameter(
  param: ParameterReflection,
  descriptions: Map<string, string>,
  resolveLink: LinkResolver
): TDocletParam {
  const out: TDocletParam = { name: param.name };

  const type = typeToDocletType(param.type);
  if (type) out.type = type;

  if (param.flags?.isOptional) out.optional = true;
  if (param.flags?.isRest) out.variable = true;
  if (param.defaultValue !== undefined) out.defaultvalue = param.defaultValue;

  // Description: prefer the parameter's own comment, fall back to a `@param` block.
  const ownDescription = summaryToHtml(param.comment, resolveLink);
  const description = ownDescription || descriptions.get(param.name);
  if (description) out.description = description;

  return out;
}

/** Build `doclet.meta` from `reflection.sources[0]` for source links. */
function sourceMeta(reflection: DeclarationReflection): TDoclet['meta'] | undefined {
  const source = reflection.sources?.[0];
  if (!source) return undefined;

  // `fullFileName` is the absolute path; split it so resolve(path, filename) is
  // the real file (mirrors the JSDoc publish path). Fall back to `fileName`.
  const full = source.fullFileName || source.fileName;
  const slash = Math.max(full.lastIndexOf('/'), full.lastIndexOf('\\'));
  const path = slash >= 0 ? full.slice(0, slash) : '';
  const filename = slash >= 0 ? full.slice(slash + 1) : full;

  const meta: TDoclet['meta'] = { filename, lineno: source.line };
  if (path) meta.path = path;
  return meta;
}

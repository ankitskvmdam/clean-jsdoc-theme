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
 *
 * Enums / type aliases / modules / namespaces / re-exports are DEFERRED to a
 * later phase — they are skipped cleanly here and counted in {@link AdaptResult}.
 *
 * Bitflag kinds are matched with `reflection.kindOf(...)`, never `===`.
 */
import { ReflectionKind } from 'typedoc';
import type {
  DeclarationReflection,
  ParameterReflection,
  ProjectReflection,
  Reflection,
  SignatureReflection,
} from 'typedoc';
import type { TDoclet, TDocletKind, TDocletParam } from '@clean-jsdoc-theme/utils';
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
  ReflectionKind.Accessor;

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
export function reflectionsToDoclets(
  project: ProjectReflection,
  logger?: AdaptLogger
): TDoclet[] {
  return adaptProject(project, logger).doclets;
}

/** Like {@link reflectionsToDoclets} but also returns skip diagnostics. */
export function adaptProject(
  project: ProjectReflection,
  logger?: AdaptLogger
): AdaptResult {
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
      // Not a container and not handled → a deferred leaf (enum member, type
      // alias, reference, …). Record and skip cleanly.
      result.skipped.push({
        kind: ReflectionKind[reflection.kind] ?? String(reflection.kind),
        name: reflection.name,
        longname: safeLongname(reflection),
      });
      return;
    } else if (!reflection.kindOf(HANDLED)) {
      // A deferred CONTAINER (enum / module / namespace) — record it but still
      // recurse so any handled descendants are not lost.
      result.skipped.push({
        kind: ReflectionKind[reflection.kind] ?? String(reflection.kind),
        name: reflection.name,
        longname: safeLongname(reflection),
      });
    }
  }

  // Recurse into children of any container.
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

  // Flags (readonly / virtual / optional / access).
  Object.assign(doclet, flagFields(reflection));

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
  } else {
    adaptValue(reflection, doclet);
  }

  return doclet;
}

/** Resolve the `TDoclet.kind` for a handled reflection. */
function docletKind(reflection: Reflection): TDocletKind | null {
  if (reflection.kindOf(ReflectionKind.Class)) return 'class';
  if (reflection.kindOf(ReflectionKind.Interface)) return 'interface';
  if (reflection.kindOf(ReflectionKind.Function | ReflectionKind.Method)) return 'function';
  if (reflection.kindOf(ReflectionKind.Property | ReflectionKind.Variable | ReflectionKind.Accessor))
    return 'member';
  return null;
}

/**
 * Class / interface: fold the constructor's first signature parameters into the
 * container doclet's `params` (so the Constructor section renders), without
 * emitting the Constructor as a member.
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
}

/** Function / method: read the first signature for params + return type. */
function adaptCallable(
  reflection: DeclarationReflection,
  doclet: TDoclet,
  paramDescriptions: Map<string, string>,
  resolveLink: LinkResolver
): void {
  const signatures = reflection.signatures ?? [];
  // v1 uses the FIRST signature only; additional overloads are dropped (noted in
  // the adapter's skip diagnostics is overkill — a count would go to the logger).
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
}

/** Property / variable / accessor: value type → `type`, default → `defaultvalue`. */
function adaptValue(reflection: DeclarationReflection, doclet: TDoclet): void {
  // Accessor: prefer the get-signature's return type.
  const getSig = reflection.getSignature;
  const type = getSig?.type ?? reflection.type;
  const docletType = typeToDocletType(type);
  if (docletType) doclet.type = docletType;

  if (reflection.defaultValue !== undefined) doclet.defaultvalue = reflection.defaultValue;

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

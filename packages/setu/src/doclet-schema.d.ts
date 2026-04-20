/**
 * TypeScript types derived from the JSDoc doclet JSON schema.
 *
 * @see {@link https://github.com/jsdoc/jsdoc/blob/813e0afe83ba147eadfb780facfc3f46f2a2aca5/packages/jsdoc-doclet/lib/schema.js}
 */

// ── Primitive aliases ────────────────────────────────────────────────────────

/** A string matching `event:<identifier>` */
export type TEventRef = `event:${string}`;

/** A string matching `package:<identifier>` */
export type TPackageRef = `package:${string}`;

// ── META_SCHEMA ──────────────────────────────────────────────────────────────

export type TDocletMetaCode = {
  funcscope?: string;
  id?: string;
  name?: unknown;
  node?: Record<string, unknown>;
  paramnames?: string[];
  type?: string;
  value?: unknown;
};

export type TDocletMeta = {
  code?: TDocletMetaCode;
  columnno?: number;
  filename?: string;
  lineno?: number;
  path?: string;
  /** Tuple of [firstCharPos, lastCharPos] */
  range?: [number, number];
  vars?: Record<string, unknown>;
};

// ── TYPE_PROPERTY_SCHEMA ─────────────────────────────────────────────────────

export type TDocletTypeProperty = {
  /** Original type expression string */
  expression?: string;
  /** At least one resolved type name */
  names: [string, ...string[]];
};

// ── PARAM_SCHEMA ─────────────────────────────────────────────────────────────

/** Used for params, returns, exceptions, modifies, and properties entries. */
export type TDocletParam = {
  defaultvalue?: unknown;
  description?: string | null;
  name?: string;
  nullable?: boolean | null;
  optional?: boolean | null;
  type?: TDocletTypeProperty;
  /** Whether this parameter can be repeated (rest/variadic) */
  variable?: boolean | null;
};

// ── ENUM_PROPERTY_SCHEMA ─────────────────────────────────────────────────────

export type TDocletEnumProperty = {
  comment?: string;
  defaultvalue?: unknown;
  description?: string | null;
  kind: 'member';
  longname?: string;
  memberof?: string;
  meta?: TDocletMeta;
  name?: string;
  nullable?: boolean | null;
  optional?: boolean | null;
  scope: 'static';
  type?: TDocletTypeProperty;
  variable?: boolean | null;
};

// ── DOCLET_SCHEMA ────────────────────────────────────────────────────────────

export type TDocletKind =
  | 'class'
  | 'constant'
  | 'enum'
  | 'event'
  | 'external'
  | 'file'
  | 'function'
  | 'interface'
  | 'member'
  | 'mixin'
  | 'module'
  | 'namespace'
  | 'package'
  | 'param'
  | 'typedef';

export type TDocletScope = 'global' | 'inner' | 'instance' | 'static';

export type TDocletAccess = 'package' | 'private' | 'protected' | 'public';

export type TDocletTag = {
  originalTitle?: string;
  text?: string;
  title?: string;
  value?: string | TDocletParam;
};

export type TDoclet = {
  access?: TDocletAccess;
  alias?: string;
  async?: boolean;
  augments?: string[];
  author?: string[];
  borrowed?: Array<{ as?: string; from?: string }>;
  classdesc?: string;
  comment?: string;
  copyright?: string;
  defaultvalue?: unknown;
  defaultvaluetype?: 'object' | 'array';
  deprecated?: string | boolean;
  description?: string | null;
  examples?: string[];
  exceptions?: TDocletParam[];
  extends?: string[];
  fires?: TEventRef[];
  forceMemberof?: boolean | null;
  generator?: boolean;
  hideconstructor?: boolean;
  ignore?: boolean;
  implementations?: string[];
  implements?: string[];
  inheritdoc?: string;
  inherited?: boolean;
  /** Only valid when `inherited` is true */
  inherits?: string;
  kind?: TDocletKind;
  license?: string;
  listens?: TEventRef[];
  longname?: string;
  memberof?: string;
  meta?: TDocletMeta;
  mixed?: boolean;
  mixes?: string[];
  modifies?: TDocletParam[];
  name?: string;
  nullable?: boolean | null;
  optional?: boolean | null;
  override?: boolean;
  overrides?: string;
  params?: TDocletParam[];
  preserveName?: boolean;
  properties?: Array<TDocletEnumProperty | TDocletParam>;
  readonly?: boolean;
  requires?: string[];
  returns?: TDocletParam[];
  scope?: TDocletScope;
  see?: string[];
  since?: string;
  summary?: string;
  tags?: TDocletTag[];
  this?: string;
  todo?: string[];
  type?: TDocletTypeProperty;
  undocumented?: boolean;
  variable?: boolean | null;
  variation?: string;
  version?: string;
  virtual?: boolean;
  yields?: TDocletParam[];
};

// ── PACKAGE_SCHEMA ───────────────────────────────────────────────────────────

export type TContactInfo = {
  email?: string;
  name?: string;
  url?: string;
};

export type TBugsInfo = {
  email?: string;
  url?: string;
};

export type TPackageDoclet = {
  author?: string | TContactInfo;
  bugs?: string | TBugsInfo;
  contributors?: Array<string | TContactInfo>;
  dependencies?: Record<string, string>;
  description?: string;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  files?: string[];
  homepage?: string;
  keywords?: string[];
  kind: 'package';
  licenses?: Array<{ type?: string; url?: string }>;
  longname?: TPackageRef;
  main?: string;
  name?: string;
  repository?: { type?: string; url?: string };
  version?: string;
};

// ── DOCLETS_SCHEMA ───────────────────────────────────────────────────────────

export type TDocletList = Array<TDoclet | TPackageDoclet>;

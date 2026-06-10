/**
 * Derived from the JSDoc doclet JSON schema.
 * @see {@link https://github.com/jsdoc/jsdoc/blob/813e0afe83ba147eadfb780facfc3f46f2a2aca5/packages/jsdoc-doclet/lib/schema.js}
 **/

import { z } from 'zod';

// ── Primitive aliases ────────────────────────────────────────────────────────

export const EventRefSchema = z.string().regex(/event:.+/);
export type TEventRef = z.infer<typeof EventRefSchema>;

export const PackageRefSchema = z.string().regex(/^package:.+/);
export type TPackageRef = z.infer<typeof PackageRefSchema>;

// ── META_SCHEMA ──────────────────────────────────────────────────────────────

export const DocletMetaCodeSchema = z.object({
  funcscope: z.string().optional(),
  id: z.string().optional(),
  name: z.unknown().optional(),
  node: z.object().optional(),
  paramnames: z.array(z.string()).optional(),
  type: z.string().optional(),
  value: z.unknown().optional(),
});
export type TDocletMetaCode = z.infer<typeof DocletMetaCodeSchema>;

export const DocletMetaSchema = z.object({
  code: DocletMetaCodeSchema.optional(),
  columnno: z.number().optional(),
  filename: z.string().optional(),
  lineno: z.number().optional(),
  path: z.string().optional(),
  range: z.tuple([z.number(), z.number()]).optional(),
  vars: z.object().optional(),
});
export type TDocletMeta = z.infer<typeof DocletMetaSchema>;

// ── TYPE_PROPERTY_SCHEMA ─────────────────────────────────────────────────────

export const DocletTypePropertySchema = z.object({
  expression: z.string().optional(),
  names: z.array(z.string()).min(1),
});
export type TDocletTypeProperty = z.infer<typeof DocletTypePropertySchema>;

// ── PARAM_SCHEMA ─────────────────────────────────────────────────────────────

export const DocletParamSchema = z.object({
  defaultvalue: z.unknown().optional(),
  description: z.string().nullable().optional(),
  name: z.string().optional(),
  nullable: z.boolean().nullable().optional(),
  optional: z.boolean().nullable().optional(),
  type: DocletTypePropertySchema.optional(),
  variable: z.boolean().nullable().optional(),
});
export type TDocletParam = z.infer<typeof DocletParamSchema>;

// ── ENUM_PROPERTY_SCHEMA ─────────────────────────────────────────────────────

export const DocletEnumPropertySchema = z.object({
  comment: z.string().optional(),
  defaultvalue: z.unknown().optional(),
  description: z.string().nullable().optional(),
  kind: z.literal('member'),
  longname: z.string().optional(),
  memberof: z.string().optional(),
  meta: DocletMetaSchema.optional(),
  name: z.string().optional(),
  nullable: z.boolean().nullable().optional(),
  optional: z.boolean().nullable().optional(),
  scope: z.literal('static'),
  type: DocletTypePropertySchema.optional(),
  variable: z.boolean().nullable().optional(),
});

export type TDocletEnumProperty = z.infer<typeof DocletEnumPropertySchema>;

// ── DOCLET ENUMS ─────────────────────────────────────────────────────────────

export const DocletKindSchema = z.enum([
  'class',
  'constant',
  'enum',
  'event',
  'external',
  'file',
  'function',
  'interface',
  'member',
  'mixin',
  'module',
  'namespace',
  'package',
  'param',
  'typedef',
]);

export type TDocletKind = z.infer<typeof DocletKindSchema>;

export const DocletScopeSchema = z.enum(['global', 'inner', 'instance', 'static']);
export type TDocletScope = z.infer<typeof DocletScopeSchema>;

export const DocletAccessSchema = z.enum(['package', 'private', 'protected', 'public']);
export type TDocletAccess = z.infer<typeof DocletAccessSchema>;

// ── TAG ─────────────────────────────────────────────────────────────────────

export const DocletTagSchema = z.object({
  originalTitle: z.string().optional(),
  text: z.string().optional(),
  title: z.string().optional(),
  value: z.union([z.string(), z.lazy(() => DocletParamSchema)]).optional(),
});

export type TDocletTag = z.infer<typeof DocletTagSchema>;

// ── DOCLET ──────────────────────────────────────────────────────────────────

export const DocletSchema = z.object({
  access: DocletAccessSchema.optional(),
  alias: z.string().optional(),
  async: z.boolean().optional(),
  augments: z.array(z.string()).optional(),
  author: z.array(z.string()).optional(),
  borrowed: z
    .array(
      z.object({
        as: z.string().optional(),
        from: z.string().optional(),
      })
    )
    .optional(),
  classdesc: z.string().optional(),
  comment: z.string().optional(),
  copyright: z.string().optional(),
  defaultvalue: z.unknown().optional(),
  defaultvaluetype: z.enum(['object', 'array']).optional(),
  deprecated: z.union([z.string(), z.boolean()]).optional(),
  description: z.string().nullable().optional(),
  examples: z.array(z.string()).optional(),
  exceptions: z.array(DocletParamSchema).optional(),
  extends: z.array(z.string()).optional(),
  fires: z.array(EventRefSchema).optional(),
  forceMemberof: z.boolean().nullable().optional(),
  generator: z.boolean().optional(),
  hideconstructor: z.boolean().optional(),
  ignore: z.boolean().optional(),
  implementations: z.array(z.string()).optional(),
  implements: z.array(z.string()).optional(),
  inheritdoc: z.string().optional(),
  inherited: z.boolean().optional(),
  inherits: z.string().optional(),
  isEnum: z.boolean().optional(),
  kind: DocletKindSchema.optional(),
  license: z.string().optional(),
  listens: z.array(EventRefSchema).optional(),
  longname: z.string().optional(),
  memberof: z.string().optional(),
  meta: DocletMetaSchema.optional(),
  mixed: z.boolean().optional(),
  mixes: z.array(z.string()).optional(),
  modifies: z.array(DocletParamSchema).optional(),
  name: z.string().optional(),
  nullable: z.boolean().nullable().optional(),
  optional: z.boolean().nullable().optional(),
  override: z.boolean().optional(),
  overrides: z.string().optional(),
  params: z.array(DocletParamSchema).optional(),
  preserveName: z.boolean().optional(),
  properties: z.array(z.union([DocletEnumPropertySchema, DocletParamSchema])).optional(),
  readonly: z.boolean().optional(),
  requires: z.array(z.string()).optional(),
  returns: z.array(DocletParamSchema).optional(),
  scope: DocletScopeSchema.optional(),
  see: z.array(z.string()).optional(),
  since: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(DocletTagSchema).optional(),
  this: z.string().optional(),
  todo: z.array(z.string()).optional(),
  tutorials: z.array(z.string()).optional(),
  type: DocletTypePropertySchema.optional(),
  undocumented: z.boolean().optional(),
  variable: z.boolean().nullable().optional(),
  variation: z.string().optional(),
  version: z.string().optional(),
  virtual: z.boolean().optional(),
  yields: z.array(DocletParamSchema).optional(),
});

export type TDoclet = z.infer<typeof DocletSchema>;

// ── PACKAGE_SCHEMA ───────────────────────────────────────────────────────────

export const TContactInfoSchema = z.object({
  email: z.string().optional(),
  name: z.string().optional(),
  url: z.string().optional(),
});

export type TContactInfo = z.infer<typeof TContactInfoSchema>;

export const TBugsInfoSchema = z.object({
  email: z.string().optional(),
  url: z.string().optional(),
});

export type TBugsInfo = z.infer<typeof TBugsInfoSchema>;

export const PackageDocletSchema = z.object({
  author: z.union([z.string(), TContactInfoSchema]).optional(),
  bugs: z.union([z.string(), TBugsInfoSchema]).optional(),
  contributors: z.array(z.union([z.string(), TContactInfoSchema])).optional(),
  dependencies: z.object().optional(),
  description: z.string().optional(),
  devDependencies: z.object().optional(),
  engines: z.object().optional(),
  files: z.array(z.string()).optional(),
  homepage: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  kind: z.literal('package'),
  licenses: z
    .array(
      z.object({
        type: z.string().optional(),
        url: z.string().optional(),
      })
    )
    .optional(),
  longname: PackageRefSchema.optional(),
  main: z.string().optional(),
  name: z.string().optional(),
  repository: z
    .object({
      type: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  version: z.string().optional(),
});

export type TPackageDoclet = z.infer<typeof PackageDocletSchema>;

// ── DOCLETS LIST ─────────────────────────────────────────────────────────────

export const DocletListSchema = z.array(z.union([DocletSchema, PackageDocletSchema]));

export type TDocletList = z.infer<typeof DocletListSchema>;

export function isPackageDoclet(doclet: unknown): doclet is TPackageDoclet {
  if (!PackageDocletSchema.safeParse(doclet).success) return true;
  return (doclet as TPackageDoclet).kind === 'package';
}

export function isDoclet(doclet: unknown): doclet is TDoclet {
  if (!DocletSchema.safeParse(doclet).success) return false;
  return (doclet as TDoclet).kind !== 'package';
}

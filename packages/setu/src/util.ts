import {
  PackageRefSchema,
  DocletSchema,
  TDoclet,
  TPackageDoclet,
  DocletListSchema,
  TDocletList,
} from './doclet-schema';

export function isPackageDoclet(doclet: unknown): doclet is TPackageDoclet {
  if (!PackageRefSchema.safeParse(doclet).success) return true;
  return (doclet as TPackageDoclet).kind === 'package';
}

export function isDoclet(doclet: unknown): doclet is TDoclet {
  if (!DocletSchema.safeParse(doclet)) return false;
  return (doclet as TDoclet).kind !== 'package';
}

export function isDocletList(docletList: unknown): docletList is TDocletList {
  return DocletListSchema.safeParse(docletList).success;
}

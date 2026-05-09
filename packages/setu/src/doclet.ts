import { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';

export function getAllMembersOfClass(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string
): TDoclet[] {
  const cls = collection({ kind: 'class', longname }).get();
  if (!Array.isArray(cls) || cls.length === 0) return [];

  return collection({ memberof: longname }).get();
}

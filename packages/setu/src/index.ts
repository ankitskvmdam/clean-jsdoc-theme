import { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { isDocletList } from './util';

export function generateMdx(jsdocSaltyDB: TJSDocSaltyCollection<TDoclet>): string[] {
  const data = jsdocSaltyDB().get();
  console.log('Data', data);
  if (!isDocletList(data)) {
    throw new Error('Invalid doclet list');
  }

  const classes = jsdocSaltyDB({ kind: 'class' }).get();
  console.log('All classes', classes);
  return [];
}

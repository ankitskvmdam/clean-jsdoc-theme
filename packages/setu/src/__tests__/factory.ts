import { default as salty } from '@jsdoc/salty';
import { raw } from './raw-taffy-data';
import { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';

export function getJSDocTaffyData(): TJSDocSaltyCollection<TDoclet> {
  return salty.taffy(raw._items) as unknown as TJSDocSaltyCollection<TDoclet>;
}

// import { getJSDocTaffyData } from './__tests__/factory';
// import { getJSDocTaffyData } from './__tests__/factory';
// import { getClassView } from './class-view';
import { validateCollectionOrThrow } from './validate';

export function generateMdx(collection: unknown): string[] {
  validateCollectionOrThrow(collection);

  // At this point we have a valid doclet DB.
  console.log('Good to go!');
  return [];
}

// generateMdx(getJSDocTaffyData());

// console.log(getClassView(getJSDocTaffyData(), 'DataProcessor'));

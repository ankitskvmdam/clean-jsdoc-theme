import { DocletListSchema, TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';

export function validateCollectionOrThrow(
  collection: unknown
): asserts collection is TJSDocSaltyCollection<TDoclet> {
  if (typeof collection !== 'function') {
    throw new Error('Invalid collection: expected a function, got ' + typeof collection);
  }

  let data: unknown;
  try {
    data = collection().get();
  } catch {
    throw new Error('collection is not a valid @jsdoc/salty DB ');
  }

  const docletListSchemaResult = DocletListSchema.safeParse(data);
  if (!docletListSchemaResult.success) {
    throw new Error(
      [
        'Invalid doclet list.',
        '@clean-jsdoc-theme/setu supports JSDoc 4, if you are using an older version consider upgrading to JSDoc 4 or higher.',
        'The first issue is:',
        // Not showing all the issues at once, as it is hard to read a long list of issues
        JSON.stringify(docletListSchemaResult.error.issues[0], null, 2),
      ].join('\n')
    );
  }
}

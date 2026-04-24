import { validateJSDocSaltyDBOrThrow } from './validate';

export function generateMdx(jsdocSaltyDB: unknown): string[] {
  validateJSDocSaltyDBOrThrow(jsdocSaltyDB);

  // At this point we have a valid doclet DB.
  console.log('Good to go!');
  return [];
}

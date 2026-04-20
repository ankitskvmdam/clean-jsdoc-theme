/**
 * @clean-jsdoc-theme/core
 *
 * Doclet processing and MDX generation.
 * Phase 1: type stubs only. Real implementation in Phase 2.
 */

export interface Doclet {
  kind: string;
  name: string;
  longname: string;
  memberof?: string;
  description?: string;
  classdesc?: string;
  params?: DocletParam[];
  returns?: DocletReturn[];
  examples?: string[];
}

export interface DocletParam {
  name: string;
  type?: { names: string[] };
  description?: string;
  optional?: boolean;
}

export interface DocletReturn {
  type?: { names: string[] };
  description?: string;
}

export function generateMdx(_doclets: Doclet[]): string[] {
  // stub
  return [];
}

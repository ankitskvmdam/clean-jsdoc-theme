'use strict';
import { generateMdx } from '@clean-jsdoc-theme/setu';

export function publish(data: unknown) {
  generateMdx(data);
}

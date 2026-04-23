/* eslint-disable */
'use strict';
// import fs from 'node:fs';
import { generateMdx } from '@clean-jsdoc-theme/setu';

export function publish(data: any, opts: any, tutorials: any) {
  // Writing everything on disk.
  // We will use it to do testing.
  // const d = data();
  // fs.writeFileSync('./data.json', JSON.stringify(d, null, 2));
  // fs.writeFileSync('./opts.json', JSON.stringify(opts, null, 2));
  // fs.writeFileSync('./tutorials.json', JSON.stringify(tutorials, null, 2));
  generateMdx(data);
}

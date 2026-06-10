'use strict';

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { OutputFile } from '@clean-jsdoc-theme/dwar';

export async function writeOutputFiles(
  destination: string,
  files: readonly OutputFile[]
): Promise<void> {
  for (const file of files) {
    const target = join(destination, file.path);
    await mkdir(dirname(target), { recursive: true });
    const contents = typeof file.contents === 'string' ? file.contents : Buffer.from(file.contents);
    await writeFile(target, contents);
  }
}

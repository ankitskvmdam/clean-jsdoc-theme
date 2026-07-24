import { describe, it, expect } from 'vitest';
import { render } from '../index';
import { makeManifest, minimalTheme } from './fixtures';
import type { OutputFile } from '@clean-jsdoc-theme/utils';

function asString(file: OutputFile): string {
  return typeof file.contents === 'string'
    ? file.contents
    : new TextDecoder().decode(file.contents);
}

describe('render() — collapsibleGroups threading', () => {
  it('emits collapsibleGroups in the sidebar island payload', async () => {
    const manifest = { ...makeManifest(), collapsibleGroups: ['Classes'] };
    const result = await render(manifest, { theme: minimalTheme });
    const home = result.files.find((f) => f.path === 'index.html')!;
    const html = asString(home);
    expect(html).toContain('collapsibleGroups');
    expect(html).toContain('Classes');
  });
});

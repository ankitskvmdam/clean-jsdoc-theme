import { describe, it, expect } from 'vitest';
import { render } from '../index';
import { makeManifest, minimalTheme } from './fixtures';
import type { OutputFile } from '@clean-jsdoc-theme/utils';

function asString(file: OutputFile): string {
  return typeof file.contents === 'string'
    ? file.contents
    : new TextDecoder().decode(file.contents);
}

describe('render() — scrollbar mode threading', () => {
  it('defaults to data-scrollbar="styled" and injects the idle-hide script', async () => {
    const result = await render(makeManifest(), { theme: minimalTheme });
    const home = result.files.find((f) => f.path === 'index.html')!;
    const html = asString(home);
    expect(html).toContain('data-scrollbar="styled"');
    expect(html).toContain('clean-scrolling');
  });

  it('visible mode sets the attribute and omits the script', async () => {
    const result = await render(makeManifest(), {
      theme: { ...minimalTheme, scrollbar: 'visible' },
    });
    const home = result.files.find((f) => f.path === 'index.html')!;
    const html = asString(home);
    expect(html).toContain('data-scrollbar="visible"');
    expect(html).not.toContain('clean-scrolling');
  });

  it('native mode sets the attribute and omits the script', async () => {
    const result = await render(makeManifest(), {
      theme: { ...minimalTheme, scrollbar: 'native' },
    });
    const home = result.files.find((f) => f.path === 'index.html')!;
    const html = asString(home);
    expect(html).toContain('data-scrollbar="native"');
    expect(html).not.toContain('clean-scrolling');
  });
});

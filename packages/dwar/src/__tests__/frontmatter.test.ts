import { describe, it, expect } from 'vitest';
import { frontmatterLength } from '../frontmatter';
import { expectLinearScaling, PERF_TEST_TIMEOUT } from './linear-scaling';

// The cases mirror what remark-frontmatter (micromark-extension-frontmatter)
// parses as a `yaml` node, so the search text and the rendered page agree.
describe('frontmatterLength', () => {
  it.each<[string, string, number]>([
    ['LF', '---\ntitle: x\n---\nBody', 17],
    ['`---` inside a value', '---\ntitle: a --- b\n---\nBody', 23],
    ['CRLF', '---\r\ntitle: x\r\n---\r\nBody', 20],
    ['CR only', '---\rtitle: x\r---\rBody', 17],
    ['leading BOM', '\uFEFF---\ntitle: x\n---\nBody', 18],
    ['closer with trailing spaces and tabs', '---\ntitle: x\n--- \t\nBody', 19],
    ['opener with a trailing space', '--- \ntitle: x\n---\nBody', 18],
    ['empty block', '---\n---\nBody', 8],
    ['empty block with a later fence in the body', '---\n---\nBody\n---\nMore', 8],
    ['closer at end of input', '---\ntitle: x\n---', 16],
    ['closer at end of input with trailing spaces', '---\ntitle: x\n---  ', 18],
    ['body directly after the closer', '---\na: b\n---\n# X', 13],
    ['indented ` ---` is not a closer', '---\na: |\n ---\n---\nBody', 18],
    ['`--- x` is not a closer', '---\na: b\n--- x\n---\nBody', 19],
    ['`----` is not a closer', '---\na: b\n----\n---\nBody', 18],
  ])('measures %s', (_name, source, expected) => {
    expect(frontmatterLength(source)).toBe(expected);
    // Sanity: the block ends right before the body.
    expect(source.slice(expected)).not.toMatch(/^---/);
  });

  it.each<[string, string]>([
    ['no frontmatter', '# Title\n\nBody'],
    ['an unclosed block', '---\ntitle: x\nBody'],
    ['a `...` closer', '---\ntitle: x\n...\nBody'],
    ['a newline before the opener', '\n---\ntitle: x\n---\nBody'],
    ['a space before the opener', ' ---\ntitle: x\n---\nBody'],
    ['a `----` opener', '----\ntitle: x\n---\nBody'],
  ])('is 0 for %s', (_name, source) => {
    expect(frontmatterLength(source)).toBe(0);
  });

  it.each<[string, (n: number) => string]>([
    ['an unclosed block', (n) => '---\n' + 'a: b\n'.repeat(n / 5)],
    ['near-miss closers', (n) => '---\n' + '--- x\n'.repeat(n / 6)],
    ['a closer followed by trailing text', (n) => '---\nx\n---' + ' '.repeat(n) + 'x'],
  ])(
    'scales linearly on %s',
    (_name, makeInput) => {
      expectLinearScaling((src: string) => frontmatterLength(src), makeInput);
    },
    PERF_TEST_TIMEOUT
  );
});

import { describe, it, expect } from 'vitest';
import { inlineTagsToText } from '../inline-tag-text';
import { expectLinearScaling, PERF_TEST_TIMEOUT } from './linear-scaling';

const titles = (name: string): string | undefined =>
  name === 'getting-started' ? 'Getting Started' : undefined;

describe('inlineTagsToText (#366)', () => {
  it('returns text without inline tags unchanged', () => {
    const text = 'Plain text with {braces} and [brackets].';
    expect(inlineTagsToText(text)).toBe(text);
  });

  it('reduces a bare link to its target as written', () => {
    expect(inlineTagsToText('See {@link Foo}.')).toBe('See Foo.');
    expect(inlineTagsToText('See {@link Foo#bar}.')).toBe('See Foo#bar.');
    expect(inlineTagsToText('See {@link Queue~config}.')).toBe('See Queue~config.');
  });

  it('uses the label of a labelled link', () => {
    expect(inlineTagsToText('See {@link module:queue/types|type definitions}.')).toBe(
      'See type definitions.'
    );
    expect(inlineTagsToText('See {@link Foo some label}.')).toBe('See some label.');
    expect(inlineTagsToText('See [label]{@link Foo}.')).toBe('See label.');
  });

  it('handles linkcode and linkplain like link', () => {
    expect(inlineTagsToText('{@linkcode X} and {@linkplain Y|why}')).toBe('X and why');
  });

  it('reduces URL links to their label, else the URL', () => {
    expect(inlineTagsToText('{@link https://example.com|Example}')).toBe('Example');
    expect(inlineTagsToText('{@link https://example.com}')).toBe('https://example.com');
  });

  it('uses the tutorial title, else its name, and a label over both', () => {
    expect(inlineTagsToText('See {@tutorial getting-started}.', titles)).toBe(
      'See Getting Started.'
    );
    expect(inlineTagsToText('See {@tutorial getting-started}.')).toBe('See getting-started.');
    expect(inlineTagsToText('See {@tutorial other}.', titles)).toBe('See other.');
    expect(inlineTagsToText('See {@tutorial getting-started|the guide}.', titles)).toBe(
      'See the guide.'
    );
  });

  it('falls back to the target when the label is empty', () => {
    expect(inlineTagsToText('{@link Foo|}')).toBe('Foo');
    expect(inlineTagsToText('[]{@link Foo}')).toBe('Foo');
    expect(inlineTagsToText('[ ]{@link Foo|bar}')).toBe('bar');
  });

  it('leaves a tag with no target unchanged', () => {
    expect(inlineTagsToText('a {@link } b')).toBe('a {@link } b');
    expect(inlineTagsToText('a {@link |x} b')).toBe('a {@link |x} b');
  });

  it('leaves other inline tags alone', () => {
    expect(inlineTagsToText('{@inheritDoc}')).toBe('{@inheritDoc}');
  });

  it(
    'scans pathological input in linear time',
    () => {
      expectLinearScaling(
        (s: string) => inlineTagsToText(s),
        (n) => '[{@link '.repeat(n / 16) + ']'.repeat(n / 16)
      );
    },
    PERF_TEST_TIMEOUT
  );
});

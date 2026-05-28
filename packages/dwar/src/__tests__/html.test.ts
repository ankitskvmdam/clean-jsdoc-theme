import { describe, it, expect } from 'vitest';
import { extractExcerpt, htmlPathFor } from '../html';

describe('htmlPathFor', () => {
  it('returns index.html for an empty slug', () => {
    expect(htmlPathFor('')).toBe('index.html');
  });
  it('returns index.html for the literal "index" slug', () => {
    expect(htmlPathFor('index')).toBe('index.html');
  });
  it('treats slug as a directory', () => {
    expect(htmlPathFor('guide/intro')).toBe('guide/intro/index.html');
  });
  it('strips leading and trailing slashes', () => {
    expect(htmlPathFor('/foo/bar/')).toBe('foo/bar/index.html');
  });
});

describe('extractExcerpt', () => {
  it('strips frontmatter, headings, and code fences', () => {
    const src = `---
title: x
---

# Hello

\`\`\`js
console.log(1);
\`\`\`

Body paragraph here with **bold** and \`code\`.
`;
    const out = extractExcerpt(src);
    expect(out).not.toContain('---');
    expect(out).not.toContain('console.log');
    expect(out).not.toContain('#');
    expect(out).toContain('Body paragraph here');
  });

  it('caps length and appends an ellipsis', () => {
    const long = 'word '.repeat(200);
    const out = extractExcerpt(long, 50);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out.endsWith('…')).toBe(true);
  });

  it('rewrites markdown links to their label', () => {
    const out = extractExcerpt('See [the docs](https://example.com).');
    expect(out).toContain('the docs');
    expect(out).not.toContain('example.com');
  });
});

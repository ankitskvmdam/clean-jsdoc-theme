import type {
  SiteManifest,
  ThemeConfig,
  ThemeTokens,
} from '@clean-jsdoc-theme/utils';

export const minimalTokens: ThemeTokens = {
  colors: {
    bg: '#ffffff',
    bgMuted: '#f3f4f6',
    fg: '#111827',
    fgMuted: '#6b7280',
    accent: '#2563eb',
    accentFg: '#ffffff',
    border: '#e5e7eb',
  },
  fonts: {
    heading: 'IBM Plex Serif',
    body: 'IBM Plex Sans',
    mono: 'ui-monospace, SFMono-Regular, monospace',
  },
  shiki: {
    light: 'github-light',
    dark: 'github-dark',
  },
  siteName: 'Test Site',
};

export const minimalTheme: ThemeConfig = {
  tokens: minimalTokens,
  basePath: '/',
};

export function makeManifest(): SiteManifest {
  return {
    pages: [
      {
        slug: '',
        frontmatter: {
          title: 'Home',
          kind: 'index',
          description: 'Welcome to the test site.',
        },
        body: `# Welcome

This is the **home** page. It has a paragraph and some \`inline code\`.
`,
        headings: [],
      },
      {
        slug: 'guide/intro',
        frontmatter: {
          title: 'Introduction',
          kind: 'guide',
          description: 'A guide intro.',
        },
        body: `# Introduction

Hello from the guide.

- First bullet
- Second bullet
`,
        headings: [
          { depth: 2, text: 'Section', id: 'section' },
        ],
      },
    ],
    nav: [
      { label: 'Home', slug: '' },
      {
        label: 'Guide',
        children: [{ label: 'Intro', slug: 'guide/intro' }],
      },
    ],
    pkg: { name: 'test-pkg', version: '1.0.0' },
    buildId: 'test-build-123',
  };
}

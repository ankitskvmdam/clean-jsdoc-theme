import type {
  Code,
  Emphasis,
  Heading,
  Html,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Strong,
  Text,
  ThematicBreak,
} from 'mdast';

export const text = (value: string): Text => ({ type: 'text', value });

export const inlineCode = (value: string): InlineCode => ({ type: 'inlineCode', value });

export const strong = (...children: PhrasingContent[]): Strong => ({
  type: 'strong',
  children,
});

export const emphasis = (...children: PhrasingContent[]): Emphasis => ({
  type: 'emphasis',
  children,
});

export const link = (url: string, ...children: PhrasingContent[]): Link => ({
  type: 'link',
  url,
  children: children.length ? children : [text(url)],
});

export const p = (...children: PhrasingContent[]): Paragraph => ({
  type: 'paragraph',
  children,
});

export const h = (depth: 1 | 2 | 3 | 4 | 5 | 6, ...children: PhrasingContent[]): Heading => ({
  type: 'heading',
  depth,
  children,
});

export const code = (lang: string | null, value: string): Code => ({
  type: 'code',
  lang,
  value,
});

export const hr = (): ThematicBreak => ({ type: 'thematicBreak' });

export const html = (value: string): Html => ({ type: 'html', value });

export const li = (...children: ListItem['children']): ListItem => ({
  type: 'listItem',
  spread: false,
  children,
});

export const ul = (items: ListItem[]): List => ({
  type: 'list',
  ordered: false,
  spread: false,
  children: items,
});

export const ol = (items: ListItem[]): List => ({
  type: 'list',
  ordered: true,
  spread: false,
  children: items,
});

export const root = (...children: RootContent[]): Root => ({ type: 'root', children });

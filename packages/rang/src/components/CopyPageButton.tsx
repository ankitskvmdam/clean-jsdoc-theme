import type { VNode } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { Copy, Check, ChevronDown, FileText } from 'lucide-preact';
import type { CopyPageAction } from '@clean-jsdoc-theme/utils';
import { ChatGptIcon } from './icons/ChatGptIcon';
import { Button, buttonVariants } from './Button';
import { ButtonGroup } from './ButtonGroup';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './DropdownMenu';
import { cn } from '../lib/cn';

export interface CopyPageButtonProps {
  /** URL of the page's companion markdown file (dwar's `<slug>/index.md`). */
  mdUrl: string;
  /** Site name (logo alt or package name) used in the default AI prompt. */
  siteName?: string;
  /**
   * Custom AI prompt; `{siteName}`, `{url}`, and `{mdUrl}` (the page's raw
   * Markdown link) are substituted at click time. Overrides the default. The
   * page body is never sent — the AI fetches `{mdUrl}` itself.
   */
  prompt?: string;
  /**
   * Which dropdown actions to show, in order. Omit for all; pass a subset to
   * trim the menu; pass `[]` to show just the primary "Copy page" button.
   */
  actions?: CopyPageAction[];
}

/** All dropdown actions, in their default render order. */
const DEFAULT_ACTIONS: CopyPageAction[] = ['copy', 'view', 'claude', 'chatgpt', 'perplexity'];

/**
 * Default prompt for "Open in ChatGPT/Claude/Perplexity". Placeholders are
 * filled at click time. We send the URLs only (page + raw Markdown link) — never
 * the page body — so the query stays short for long docs; the AI fetches the
 * `{mdUrl}` itself.
 */
const DEFAULT_PROMPT =
  "I'm looking at the {siteName} documentation: {url}. Fetch {mdUrl} for the full " +
  'page content in Markdown, then help me understand how to use it. Be ready to ' +
  'explain concepts, give examples, or help debug based on it.';

const HOW_LONG_COPIED_MS = 2000;

/** Query-prefilled chat entry points for the "Open in …" actions. */
const AI_PROVIDERS = {
  claude: 'https://claude.ai/new?q=',
  chatgpt: 'https://chatgpt.com/?q=',
  perplexity: 'https://www.perplexity.ai/search?q=',
} as const;

/** A monochrome Simple Icons CDN glyph, masked so it inherits the current text color. */
function BrandGlyph({ slug }: { slug: string }) {
  const url = `https://cdn.simpleicons.org/${encodeURIComponent(slug)}`;
  const mask = `url(${url}) center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      class="mt-0.5 inline-block h-4 w-4 shrink-0 bg-current"
      style={{ mask, WebkitMask: mask }}
    />
  );
}

/** Two-line dropdown row: leading icon + bold title over a muted description. */
function ItemBody({ title, description }: { title: string; description: string }) {
  return (
    <span class="flex min-w-0 flex-col">
      <span class="font-medium text-foreground">{title}</span>
      <span class="text-xs text-muted-foreground">{description}</span>
    </span>
  );
}

export function CopyPageButton({ mdUrl, siteName, prompt, actions }: CopyPageButtonProps) {
  const [copied, setCopied] = useState(false);
  // Fetch the markdown once, then reuse it for every action.
  const mdCache = useRef<string | null>(null);

  const getMarkdown = async (): Promise<string> => {
    if (mdCache.current !== null) return mdCache.current;
    let text = '';
    try {
      const res = await fetch(mdUrl);
      if (res.ok) text = await res.text();
    } catch {
      // Network failure — copy/open just gets an empty body rather than throwing.
    }
    mdCache.current = text;
    return text;
  };

  const copyPage = async (): Promise<void> => {
    const md = await getMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      window.setTimeout(() => setCopied(false), HOW_LONG_COPIED_MS);
    } catch {
      // Clipboard blocked (insecure context / denied) — silently no-op.
    }
  };

  const viewMarkdown = (): void => {
    window.open(mdUrl, '_blank', 'noopener,noreferrer');
  };

  const openInAi = (provider: 'claude' | 'chatgpt' | 'perplexity'): void => {
    // Send only the prompt + links (page URL + raw .md), never the page body —
    // the AI fetches the markdown itself, so the query can't blow the URL limit.
    const href = window.location.href;
    const message = (prompt && prompt.trim() ? prompt : DEFAULT_PROMPT)
      .replace(/\{siteName\}/g, siteName || 'this')
      .replace(/\{url\}/g, href)
      .replace(/\{mdUrl\}/g, new URL(mdUrl, href).href);
    window.open(AI_PROVIDERS[provider] + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
  };

  // One dropdown row per configured action, in the order given.
  const renderItem = (action: CopyPageAction): VNode => {
    switch (action) {
      case 'copy':
        return (
          <DropdownMenuItem key="copy" class="items-start" onSelect={copyPage}>
            <Copy size={16} class="mt-0.5 shrink-0" aria-hidden="true" />
            <ItemBody title="Copy page" description="Copy page as Markdown for LLMs" />
          </DropdownMenuItem>
        );
      case 'view':
        return (
          <DropdownMenuItem key="view" class="items-start" onSelect={viewMarkdown}>
            <FileText size={16} class="mt-0.5 shrink-0" aria-hidden="true" />
            <ItemBody title="View Markdown" description="View this page as plain text" />
          </DropdownMenuItem>
        );
      case 'claude':
        return (
          <DropdownMenuItem key="claude" class="items-start" onSelect={() => openInAi('claude')}>
            <BrandGlyph slug="claude" />
            <ItemBody title="Open in Claude" description="Ask Claude about this page" />
          </DropdownMenuItem>
        );
      case 'chatgpt':
        return (
          <DropdownMenuItem key="chatgpt" class="items-start" onSelect={() => openInAi('chatgpt')}>
            <ChatGptIcon size={16} class="mt-0.5 shrink-0" />
            <ItemBody title="Open in ChatGPT" description="Ask ChatGPT about this page" />
          </DropdownMenuItem>
        );
      case 'perplexity':
        return (
          <DropdownMenuItem
            key="perplexity"
            class="items-start"
            onSelect={() => openInAi('perplexity')}
          >
            <BrandGlyph slug="perplexity" />
            <ItemBody title="Open in Perplexity" description="Ask Perplexity about this page" />
          </DropdownMenuItem>
        );
    }
  };

  const items = (actions ?? DEFAULT_ACTIONS).filter((a) => DEFAULT_ACTIONS.includes(a));

  const primary = (
    <Button variant="outline" size="sm" onClick={copyPage}>
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy page'}
    </Button>
  );

  return (
    <div class="mb-6 flex justify-end">
      {items.length === 0 ? (
        // No dropdown actions configured → just the primary copy button.
        primary
      ) : (
        <DropdownMenu>
          <ButtonGroup label="Copy page">
            {primary}
            <DropdownMenuTrigger
              class={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }), 'px-1')}
              aria-label="More copy options"
            >
              <ChevronDown size={16} aria-hidden="true" />
            </DropdownMenuTrigger>
          </ButtonGroup>
          <DropdownMenuContent align="end" label="Copy page options" class="w-72">
            {items.map(renderItem)}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

import { CodeXml, ChevronDown } from 'lucide-preact';
import { useTranslation } from '@clean-jsdoc-theme/bhasha';
import type { PlaygroundProvider } from '@clean-jsdoc-theme/utils';
import { buttonVariants } from './Button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './DropdownMenu';
import { SimpleIcon } from './SimpleIcon';
import { cn } from '../lib/cn';
import { openCodepen } from './playground/codepen';
import { openJsfiddle } from './playground/jsfiddle';
import { openCodesandbox } from './playground/codesandbox';

/** Per-provider display name + Simple Icons slug + opener. */
const PROVIDERS: Record<
  PlaygroundProvider,
  { label: string; slug: string; open: (code: string, options: Record<string, unknown>) => void }
> = {
  codepen: { label: 'CodePen', slug: 'codepen', open: openCodepen },
  jsfiddle: { label: 'JSFiddle', slug: 'jsfiddle', open: openJsfiddle },
  codesandbox: { label: 'CodeSandbox', slug: 'codesandbox', open: openCodesandbox },
};

export interface PlaygroundMenuProps {
  /** Enabled providers, in render order. */
  providers: PlaygroundProvider[];
  /** Source to prefill — read from the sibling `<pre>` at hydration. */
  code?: string;
  /** Site-wide per-provider options — read from the page payload at hydration. */
  options?: Partial<Record<PlaygroundProvider, Record<string, unknown>>>;
}

/**
 * The "Open Code in" dropdown — the body of the `playground` in-content island
 * (mounted into the `data-island="playground"` marker `CodeBlock` renders in a
 * code block's header). One menu item per enabled provider; selecting one POSTs
 * the example to that provider's prefill endpoint in a new tab (the pure payload
 * builders live in `playground/`). SSR renders the trigger; the island hands the
 * `code` (from the sibling `<pre>`) and `options` (page payload) at hydration.
 */
export function PlaygroundMenu({ providers, code = '', options = {} }: PlaygroundMenuProps) {
  const { t } = useTranslation();
  if (providers.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        class={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
        aria-label={t('chrome.playground.openIn')}
      >
        <CodeXml size={14} aria-hidden="true" />
        {t('chrome.playground.openIn')}
        <ChevronDown size={14} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" label={t('chrome.playground.openIn')}>
        {providers.map((provider) => {
          const meta = PROVIDERS[provider];
          if (!meta) return null;
          return (
            <DropdownMenuItem
              key={provider}
              onSelect={() => meta.open(code, options[provider] ?? {})}
            >
              <SimpleIcon slug={meta.slug} />
              {t('chrome.playground.openInProvider', { provider: meta.label })}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

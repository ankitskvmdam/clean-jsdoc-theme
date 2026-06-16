import { useState } from 'preact/hooks';
import { useTranslation } from '@clean-jsdoc-theme/bhasha';
import { buttonVariants } from './Button';
import { cn } from '../lib/cn';

export interface CopyBtnProps {
  text: string;
}

/**
 * Copy-to-clipboard button for a code block's header. Styled like the sibling
 * "Open Code in" trigger — the same `outline`/`sm` button variant, `rounded-lg`
 * (0.5rem) — so the two header controls are balanced. On a successful copy the
 * copy glyph is swapped for a check (tick) for 2s.
 */
export function CopyBtn({ text }: CopyBtnProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent failure — clipboard write can reject in non-secure contexts.
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? t('chrome.code.copied') : t('chrome.code.copy')}
      class={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1 rounded-lg')}
    >
      {copied ? (
        <>
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{t('chrome.code.copiedShort')}</span>
        </>
      ) : (
        <>
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>{t('chrome.code.copyShort')}</span>
        </>
      )}
    </button>
  );
}

import { useState } from 'preact/hooks';

export interface CopyBtnProps {
  text: string;
}

export function CopyBtn({ text }: CopyBtnProps) {
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
      aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
      class="inline-flex items-center gap-1 rounded border border-[var(--clean-border)] bg-[var(--clean-bg-muted)] px-2 py-1 text-xs text-[var(--clean-fg)] hover:bg-[var(--clean-bg)]"
    >
      {copied ? (
        <span>Copied!</span>
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
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

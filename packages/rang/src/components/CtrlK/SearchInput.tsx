import type { RefObject } from 'preact';
import { useTranslation } from '@clean-jsdoc-theme/bhasha';

export interface SearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement>;
}

/** The palette's query input. */
export function SearchInput({ value, onValueChange, inputRef }: SearchInputProps) {
  const { t } = useTranslation();
  return (
    <div class="border-b border-border p-3">
      <input
        ref={inputRef}
        type="search"
        value={value}
        onInput={(e) => onValueChange((e.currentTarget as HTMLInputElement).value)}
        placeholder={t('chrome.search.placeholder')}
        class="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t('chrome.search.inputLabel')}
      />
    </div>
  );
}

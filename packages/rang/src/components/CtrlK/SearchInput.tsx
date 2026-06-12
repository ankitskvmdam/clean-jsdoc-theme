import type { RefObject } from 'preact';

export interface SearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement>;
}

/** The palette's query input. */
export function SearchInput({ value, onValueChange, inputRef }: SearchInputProps) {
  return (
    <div class="border-b border-border p-3">
      <input
        ref={inputRef}
        type="search"
        value={value}
        onInput={(e) => onValueChange((e.currentTarget as HTMLInputElement).value)}
        placeholder="Search docs..."
        class="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Search query"
      />
    </div>
  );
}

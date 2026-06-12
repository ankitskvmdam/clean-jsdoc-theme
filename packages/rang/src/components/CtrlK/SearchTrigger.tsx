import { Search } from 'lucide-preact';
import { Button } from '../Button';

export interface SearchTriggerProps {
  open: boolean;
  onOpen: () => void;
}

/** The header search button that opens the palette. */
export function SearchTrigger({ open, onOpen }: SearchTriggerProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label="Search"
      title="Search (Ctrl K)"
    >
      <Search size={18} aria-hidden="true" />
    </Button>
  );
}

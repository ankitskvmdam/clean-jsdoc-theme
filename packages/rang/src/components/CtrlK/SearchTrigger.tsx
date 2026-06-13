import { Search } from 'lucide-preact';
import { useTranslation } from '@clean-jsdoc-theme/bhasha';
import { Button } from '../Button';

export interface SearchTriggerProps {
  open: boolean;
  onOpen: () => void;
}

/** The header search button that opens the palette. */
export function SearchTrigger({ open, onOpen }: SearchTriggerProps) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={t('chrome.search.triggerLabel')}
      title={t('chrome.search.triggerTitle')}
    >
      <Search size={18} aria-hidden="true" />
    </Button>
  );
}

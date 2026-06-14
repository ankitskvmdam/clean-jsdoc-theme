import { useTranslation } from '@clean-jsdoc-theme/bhasha';
import { Button } from '../Button';

/** The palette footer: keyboard hints + a Close button. */
export function SearchFooter({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div class="flex items-center justify-between border-t border-border p-2 text-xs text-muted-foreground">
      <span class="px-1">{t('chrome.search.footerHint')}</span>
      <Button type="button" variant="ghost" size="sm" onClick={onClose}>
        {t('chrome.common.close')}
      </Button>
    </div>
  );
}

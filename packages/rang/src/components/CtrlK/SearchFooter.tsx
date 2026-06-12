import { Button } from '../Button';

/** The palette footer: keyboard hints + a Close button. */
export function SearchFooter({ onClose }: { onClose: () => void }) {
  return (
    <div class="flex items-center justify-between border-t border-border p-2 text-xs text-muted-foreground">
      <span class="px-1">↑↓ to navigate · ↵ to open · esc to close</span>
      <Button type="button" variant="ghost" size="sm" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}

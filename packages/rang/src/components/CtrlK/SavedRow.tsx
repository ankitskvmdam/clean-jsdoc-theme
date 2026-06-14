import { History, Star, X } from 'lucide-preact';
import { useTranslation } from '@clean-jsdoc-theme/bhasha';
import { withBase } from '@clean-jsdoc-theme/utils';
import type { SavedKind, SavedSearch } from './types';

export interface SavedRowProps {
  basePath: string;
  item: SavedSearch;
  kind: SavedKind;
  active: boolean;
  /** Highlight this row (e.g. on hover). */
  onActivate: () => void;
  /** Record the selection. The row's `<a href>` handles the actual navigation. */
  onRecord: () => void;
  /** Promote a recent to favorites (only rendered for `recent` rows). */
  onFavorite: () => void;
  /** Remove this entry from its list. */
  onRemove: () => void;
}

/**
 * One saved-search row. A recent can be saved to favorites (★) or forgotten (×);
 * a favorite shows a filled star and can be removed (×).
 */
export function SavedRow({
  basePath,
  item,
  kind,
  active,
  onActivate,
  onRecord,
  onFavorite,
  onRemove,
}: SavedRowProps) {
  const { t } = useTranslation();
  return (
    <li
      role="option"
      aria-selected={active}
      class={`flex items-center gap-2 rounded px-3 py-2 text-sm ${active ? 'bg-accent' : ''}`}
      onMouseMove={onActivate}
    >
      {kind === 'favorite' ? (
        <Star size={16} fill="currentColor" class="shrink-0 text-amber-500" aria-hidden="true" />
      ) : (
        <History size={16} class="shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <a
        href={withBase(basePath, '/' + item.slug)}
        onClick={onRecord}
        class="block min-w-0 flex-1 text-foreground no-underline"
      >
        <span class="block truncate">
          {item.title}
          {item.context ? (
            <span class="ml-2 text-xs text-muted-foreground">
              {t('chrome.search.inContext', { context: item.context })}
            </span>
          ) : null}
        </span>
        {!item.context && (item.excerpt || item.description) ? (
          <span class="mt-0.5 block truncate text-xs text-muted-foreground">
            {item.excerpt || item.description}
          </span>
        ) : null}
      </a>
      {kind === 'recent' ? (
        <button
          type="button"
          aria-label={t('chrome.search.saveToFavorites', { title: item.title })}
          class="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground hover:bg-background hover:text-amber-500"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavorite();
          }}
        >
          <Star size={14} aria-hidden="true" />
        </button>
      ) : null}
      <button
        type="button"
        aria-label={
          kind === 'favorite'
            ? t('chrome.search.removeFromFavorites', { title: item.title })
            : t('chrome.search.removeFromRecent', { title: item.title })
        }
        class="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </li>
  );
}

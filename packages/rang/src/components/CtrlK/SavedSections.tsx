import type { VNode } from 'preact';
import type { SavedSearch } from './types';
import { SavedRow } from './SavedRow';

export interface SavedSectionsProps {
  basePath: string;
  favorites: SavedSearch[];
  recents: SavedSearch[];
  active: number;
  onActivate: (index: number) => void;
  onRecord: (item: SavedSearch) => void;
  onFavorite: (item: SavedSearch) => void;
  onRemoveRecent: (slug: string) => void;
  onRemoveFavorite: (slug: string) => void;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <li
      role="presentation"
      class="px-1 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
    >
      {children}
    </li>
  );
}

/**
 * The empty-query view: a Favorite section then a Recent section. A single
 * running index across both keeps each row's position aligned with the
 * orchestrator's combined nav list (favorites then recents) for keyboard nav.
 */
export function SavedSections({
  basePath,
  favorites,
  recents,
  active,
  onActivate,
  onRecord,
  onFavorite,
  onRemoveRecent,
  onRemoveFavorite,
}: SavedSectionsProps) {
  if (favorites.length === 0 && recents.length === 0) {
    return (
      <li class="px-2 py-6 text-center text-sm text-muted-foreground">Type to search the docs</li>
    );
  }

  const rows: VNode[] = [];
  let i = 0;

  if (favorites.length > 0) {
    rows.push(<SectionLabel key="fav-label">Favorite</SectionLabel>);
    for (const item of favorites) {
      const index = i++;
      rows.push(
        <SavedRow
          key={`favorite-${item.slug}`}
          basePath={basePath}
          item={item}
          kind="favorite"
          active={index === active}
          onActivate={() => onActivate(index)}
          onRecord={() => onRecord(item)}
          onFavorite={() => undefined}
          onRemove={() => onRemoveFavorite(item.slug)}
        />
      );
    }
  }

  if (recents.length > 0) {
    rows.push(<SectionLabel key="rec-label">Recent</SectionLabel>);
    for (const item of recents) {
      const index = i++;
      rows.push(
        <SavedRow
          key={`recent-${item.slug}`}
          basePath={basePath}
          item={item}
          kind="recent"
          active={index === active}
          onActivate={() => onActivate(index)}
          onRecord={() => onRecord(item)}
          onFavorite={() => onFavorite(item)}
          onRemove={() => onRemoveRecent(item.slug)}
        />
      );
    }
  }

  return <>{rows}</>;
}

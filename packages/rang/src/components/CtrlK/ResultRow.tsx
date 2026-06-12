import type { SearchEntry } from '@clean-jsdoc-theme/utils';
import { withBase } from '@clean-jsdoc-theme/utils';
import type { FuzzyResult } from '../search-utils';
import { Highlighted } from './Highlighted';

export interface ResultRowProps {
  basePath: string;
  result: FuzzyResult<SearchEntry>;
  active: boolean;
  /** Highlight this row (e.g. on hover). */
  onActivate: () => void;
  /** Record the selection. The row's `<a href>` handles the actual navigation. */
  onRecord: () => void;
}

/** One fuzzy-search result row. */
export function ResultRow({ basePath, result, active, onActivate, onRecord }: ResultRowProps) {
  const { item, match } = result;
  return (
    <li
      role="option"
      aria-selected={active}
      class={`rounded px-3 py-2 text-sm ${active ? 'bg-accent' : ''}`}
      onMouseMove={onActivate}
    >
      <a
        href={withBase(basePath, '/' + item.slug)}
        onClick={onRecord}
        class="block text-foreground no-underline"
      >
        <span class="block">
          <Highlighted text={item.title} positions={match.positions} />
          {/* Member hits show their parent page as an inline crumb. */}
          {item.context ? (
            <span class="ml-2 text-xs text-muted-foreground">in {item.context}</span>
          ) : null}
        </span>
        {!item.context && (item.excerpt || item.description) ? (
          <span class="mt-0.5 block truncate text-xs text-muted-foreground">
            {item.excerpt || item.description}
          </span>
        ) : null}
      </a>
    </li>
  );
}

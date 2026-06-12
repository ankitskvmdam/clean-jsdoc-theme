import { highlightSegments } from '../search-utils';

/** Render a title with its fuzzy-matched characters emphasized. */
export function Highlighted({ text, positions }: { text: string; positions: number[] }) {
  return (
    <>
      {highlightSegments(text, positions).map((seg, i) =>
        seg.match ? (
          <mark key={i} class="bg-transparent font-semibold text-primary">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

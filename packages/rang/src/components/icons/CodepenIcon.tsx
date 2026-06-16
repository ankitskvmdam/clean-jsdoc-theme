/**
 * CodePen mark, inlined from `./codepen.svg`. A stroked (outline) glyph — strokes
 * with `currentColor`, so it tracks the surrounding text color like the other
 * menu icons (the original ships a hard-coded `#000000`, swapped here).
 */
export interface CodepenIconProps {
  size?: number;
  class?: string;
}

export function CodepenIcon({ size = 16, class: cls }: CodepenIconProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      stroke-width="33"
      stroke-linejoin="round"
      class={cls}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M81 198v116l175 117 175-117V198L256 81z" />
      <path d="M81 198l175 116 175-116M256 81v117" />
      <path d="M81 314l175-116 175 116M256 431V314" />
    </svg>
  );
}

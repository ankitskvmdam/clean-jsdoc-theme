/**
 * CodeSandbox mark, inlined from `./codesandbox.svg`. Fills with `currentColor`,
 * so it tracks the surrounding text color like the other menu icons. The source
 * shipped without a `viewBox`/`xmlns`; the path spans 0–300, so a `0 0 300 300`
 * box is added here.
 */
export interface CodesandboxIconProps {
  size?: number;
  class?: string;
}

export function CodesandboxIcon({ size = 16, class: cls }: CodesandboxIconProps) {
  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      fill="currentColor"
      class={cls}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        d="M0,.09h299.83v300H0V.09ZM269.17,30.77v238.64H30.66V30.77h238.5Z"
      />
    </svg>
  );
}

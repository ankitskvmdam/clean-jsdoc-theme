/**
 * CSS pipeline. Emits a single output file containing two layers:
 *
 *   1. Theme variables — derived from `ThemeTokens`, scoped at `:root` with a
 *      `[data-theme="dark"]` override block. The Phase 4 dark override is a
 *      bg/fg swap because `ThemeTokens` doesn't yet carry a light/dark token
 *      pair; expanding the tokens to encode both modes is a Phase 5 concern.
 *
 *   2. Utility classes — a static, hand-rolled subset of Tailwind-compatible
 *      utilities that covers the class names rang's components emit. We opted
 *      out of Tailwind v4's programmatic Node API for Phase 4 because:
 *        - the public Node API surface for v4 is unstable across point releases,
 *        - it would force `render()` to load a heavyweight async pipeline,
 *        - and our utility usage is bounded (one component library) — a static
 *          dictionary is small, deterministic, and tree-shakable by hand when
 *          rang's components grow.
 *      If/when we need full arbitrary-utility support, the natural next step is
 *      a separate `compileStylesForDir(destination, theme)` post-write step
 *      mirroring `runPagefindAgainstDir`. For now, the static set is enough to
 *      render a usable theme.
 */

import type { ThemeTokens } from '@clean-jsdoc-theme/utils';

export interface CssBuildResult {
  /** Forward-slash relative path. */
  path: string;
  contents: string;
}

export function buildThemeVariableCss(tokens: ThemeTokens): string {
  const { colors, fonts } = tokens;
  const root =
    `:root {\n` +
    `  --clean-bg: ${colors.bg};\n` +
    `  --clean-bg-muted: ${colors.bgMuted};\n` +
    `  --clean-fg: ${colors.fg};\n` +
    `  --clean-fg-muted: ${colors.fgMuted};\n` +
    `  --clean-accent: ${colors.accent};\n` +
    `  --clean-accent-fg: ${colors.accentFg};\n` +
    `  --clean-border: ${colors.border};\n` +
    `  --clean-font-sans: ${fonts.sans};\n` +
    `  --clean-font-mono: ${fonts.mono};\n` +
    `}\n`;

  // Phase 4: ThemeTokens carries a single palette. Dark mode flips bg/fg and
  // bgMuted/fgMuted; the rest stays.
  const dark =
    `[data-theme="dark"] {\n` +
    `  --clean-bg: ${colors.fg};\n` +
    `  --clean-bg-muted: ${colors.fgMuted};\n` +
    `  --clean-fg: ${colors.bg};\n` +
    `  --clean-fg-muted: ${colors.bgMuted};\n` +
    `}\n`;

  return `${root}${dark}`;
}

/**
 * Hand-rolled utility layer. Covers the class names emitted by rang's
 * components + dwar's `mdx-components`. Keep this in sync when those grow.
 */
function buildUtilityCss(): string {
  return `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;font-family:var(--clean-font-sans);background:var(--clean-bg);color:var(--clean-fg);line-height:1.5}
a{color:var(--clean-accent);text-decoration:none}
button{background:transparent;border:0;cursor:pointer;color:inherit;font:inherit}
code,pre{font-family:var(--clean-font-mono)}

/* layout */
.min-h-screen{min-height:100vh}
.mx-auto{margin-left:auto;margin-right:auto}
.ml-2{margin-left:.5rem}
.ml-3{margin-left:.75rem}
.ml-4{margin-left:1rem}
.mt-2{margin-top:.5rem}
.mt-4{margin-top:1rem}
.mt-5{margin-top:1.25rem}
.mt-6{margin-top:1.5rem}
.mt-8{margin-top:2rem}
.mb-1{margin-bottom:.25rem}
.mb-2{margin-bottom:.5rem}
.mb-3{margin-bottom:.75rem}
.mb-4{margin-bottom:1rem}
.my-0\\.5{margin-top:.125rem;margin-bottom:.125rem}
.my-1{margin-top:.25rem;margin-bottom:.25rem}
.my-3{margin-top:.75rem;margin-bottom:.75rem}
.my-4{margin-top:1rem;margin-bottom:1rem}
.my-6{margin-top:1.5rem;margin-bottom:1.5rem}
.m-0{margin:0}
.p-0{padding:0}
.p-1{padding:.25rem}
.p-3{padding:.75rem}
.px-2{padding-left:.5rem;padding-right:.5rem}
.px-3{padding-left:.75rem;padding-right:.75rem}
.px-4{padding-left:1rem;padding-right:1rem}
.py-0\\.5{padding-top:.125rem;padding-bottom:.125rem}
.py-1{padding-top:.25rem;padding-bottom:.25rem}
.py-2{padding-top:.5rem;padding-bottom:.5rem}
.py-3{padding-top:.75rem;padding-bottom:.75rem}
.py-6{padding-top:1.5rem;padding-bottom:1.5rem}
.pl-2{padding-left:.5rem}
.pl-6{padding-left:1.5rem}
.pr-2{padding-right:.5rem}
.pt-1{padding-top:.25rem}
.gap-1{gap:.25rem}
.gap-2{gap:.5rem}
.gap-3{gap:.75rem}
.gap-6{gap:1.5rem}

.flex{display:flex}
.inline-flex{display:inline-flex}
.grid{display:grid}
.block{display:block}
.hidden{display:none}
.relative{position:relative}
.absolute{position:absolute}
.sticky{position:sticky}
.fixed{position:fixed}
.inset-0{top:0;right:0;bottom:0;left:0}
.top-0{top:0}
.top-2{top:.5rem}
.top-20{top:5rem}
.right-2{right:.5rem}
.z-30{z-index:30}
.z-40{z-index:40}
.z-50{z-index:50}

.items-center{align-items:center}
.justify-between{justify-content:space-between}
.justify-center{justify-content:center}

.w-5{width:1.25rem}
.w-full{width:100%}
.h-5{height:1.25rem}
.max-w-screen-2xl{max-width:1536px}
.min-w-0{min-width:0}
.max-h-\\[calc\\(100vh-6rem\\)\\]{max-height:calc(100vh - 6rem)}
.overflow-y-auto{overflow-y:auto}
.overflow-x-auto{overflow-x:auto}

.text-xs{font-size:.75rem;line-height:1rem}
.text-sm{font-size:.875rem;line-height:1.25rem}
.text-base{font-size:1rem;line-height:1.5rem}
.text-lg{font-size:1.125rem;line-height:1.75rem}
.text-xl{font-size:1.25rem;line-height:1.75rem}
.text-2xl{font-size:1.5rem;line-height:2rem}
.text-3xl{font-size:1.875rem;line-height:2.25rem}
.text-left{text-align:left}
.uppercase{text-transform:uppercase}
.tracking-wider{letter-spacing:.05em}
.font-semibold{font-weight:600}
.font-bold{font-weight:700}
.leading-relaxed{line-height:1.625}
.scroll-mt-20{scroll-margin-top:5rem}
.no-underline{text-decoration:none}
.underline{text-decoration:underline}

.list-none{list-style:none}
.list-disc{list-style-type:disc}
.list-decimal{list-style-type:decimal}

.rounded{border-radius:.25rem}
.rounded-full{border-radius:9999px}
.border{border-width:1px;border-style:solid}
.border-0{border-width:0}
.border-t{border-top-width:1px;border-top-style:solid}
.border-b{border-bottom-width:1px;border-bottom-style:solid}
.border-l{border-left-width:1px;border-left-style:solid}
.border-l-4{border-left-width:4px;border-left-style:solid}
.border-collapse{border-collapse:collapse}

.opacity-0{opacity:0}
.opacity-100{opacity:1}
.transition-opacity{transition:opacity .15s}

.group:hover .group-hover\\:opacity-100{opacity:1}

/* colors via CSS variables */
.bg-\\[var\\(--clean-bg\\)\\]{background-color:var(--clean-bg)}
.bg-\\[var\\(--clean-bg-muted\\)\\]{background-color:var(--clean-bg-muted)}
.bg-\\[var\\(--clean-accent\\)\\]{background-color:var(--clean-accent)}
.text-\\[var\\(--clean-fg\\)\\]{color:var(--clean-fg)}
.text-\\[var\\(--clean-fg-muted\\)\\]{color:var(--clean-fg-muted)}
.text-\\[var\\(--clean-accent\\)\\]{color:var(--clean-accent)}
.text-\\[var\\(--clean-accent-fg\\)\\]{color:var(--clean-accent-fg)}
.text-\\[0\\.9em\\]{font-size:.9em}
.border-\\[var\\(--clean-border\\)\\]{border-color:var(--clean-border)}
.border-\\[var\\(--clean-accent\\)\\]{border-color:var(--clean-accent)}
.hover\\:bg-\\[var\\(--clean-bg-muted\\)\\]:hover{background-color:var(--clean-bg-muted)}
.hover\\:text-\\[var\\(--clean-accent\\)\\]:hover{color:var(--clean-accent)}
.aria-pressed\\:bg-\\[var\\(--clean-accent\\)\\][aria-pressed="true"]{background-color:var(--clean-accent)}
.aria-pressed\\:text-\\[var\\(--clean-accent-fg\\)\\][aria-pressed="true"]{color:var(--clean-accent-fg)}

/* grid templates used by Layout */
.grid-cols-1{grid-template-columns:repeat(1,minmax(0,1fr))}
@media (min-width:768px){
  .md\\:block{display:block}
  .md\\:grid-cols-\\[16rem_minmax\\(0\\,1fr\\)\\]{grid-template-columns:16rem minmax(0,1fr)}
}
@media (min-width:1024px){
  .lg\\:block{display:block}
  .lg\\:grid-cols-\\[16rem_minmax\\(0\\,1fr\\)_14rem\\]{grid-template-columns:16rem minmax(0,1fr) 14rem}
}

table{width:100%}
th,td{padding:.5rem .75rem;text-align:left}
hr{border:0;border-top:1px solid var(--clean-border)}
`;
}

export function buildCss(tokens: ThemeTokens, buildId: string): CssBuildResult {
  const head =
    `/* clean-jsdoc-theme/dwar — generated CSS, buildId=${buildId} */\n`;
  const contents = `${head}${buildThemeVariableCss(tokens)}${buildUtilityCss()}`;
  return {
    path: `_assets/styles.${buildId}.css`,
    contents,
  };
}

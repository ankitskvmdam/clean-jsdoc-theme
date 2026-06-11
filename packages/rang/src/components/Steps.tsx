/**
 * Steps — a vertical numbered stepper, à la many docs sites. SSR-only: it is
 * pure static markup with no interactivity, so there is no island and no client
 * JS. setu emits `<Steps>` / `<Step label="…">` (capitalized → routed through
 * the MDX components map).
 */

import { toChildArray } from 'preact';
import type { ComponentChildren, VNode } from 'preact';

export interface StepProps {
  /** Optional bold heading shown above the step body. */
  label?: string;
  /** The rendered MDX content of the step. */
  children?: ComponentChildren;
}

/**
 * A logical marker, never rendered on its own — `Steps` reads its props off the
 * child vnodes directly (it inspects `.type === Step` to find the real steps and
 * pulls `label`/`children` from `.props`). Returning `null` means an authoring
 * mistake (a stray `<Step>` outside a `<Steps>`) renders nothing rather than
 * leaking markup.
 */
export function Step(_props: StepProps) {
  return null;
}

export function Steps({ children }: { children?: ComponentChildren }) {
  // MDX interleaves whitespace/text nodes between the JSX children; keep only
  // the real Step vnodes (those whose `.type` is the Step marker above).
  const steps = toChildArray(children).filter(
    (child): child is VNode<StepProps> =>
      typeof child === 'object' && child != null && (child as VNode).type === Step
  );

  if (steps.length === 0) return null;

  return (
    <ol class="my-4 list-none p-0">
      {steps.map((step, i) => {
        const { label, children: body } = step.props;
        const isLast = i === steps.length - 1;
        return (
          <li key={i} class="relative flex gap-4 pb-6 last:pb-0">
            {/* Left rail: a numbered circle, plus a connecting vertical line to
                the next step (omitted after the last). */}
            <div class="flex flex-col items-center">
              <span class="flex size-7 shrink-0 items-center justify-center rounded-full border border-(--clean-border) bg-(--clean-bg-muted) text-sm font-medium text-(--clean-fg)">
                {i + 1}
              </span>
              {!isLast && <span class="mt-1 w-px grow bg-(--clean-border)" />}
            </div>
            {/* Body: optional bold label heading, then the rendered content. The
                first/last child margins are reset so the body aligns with the
                circle (mirrors the callout's `*:first:mt-0 *:last:mb-0`). */}
            <div class="min-w-0 flex-1 pt-0.5 *:first:mt-0 *:last:mb-0">
              {label && <div class="mb-1 font-semibold text-(--clean-fg)">{label}</div>}
              {body}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Inline client script: idle auto-hide for the custom scrollbar.
 *
 * On Windows/Chrome native scrollbars are always visible and ::-webkit-scrollbar
 * styling is static, so the "show while scrolling, hide when it stops" behavior
 * can't be done in CSS. This adds a single delegated `scroll` listener (capture
 * phase — scroll events don't bubble) that marks the element being scrolled with
 * the `clean-scrolling` class and removes it ~700ms after it last scrolled. The
 * CSS (see tailwind.css @layer base) paints the thumb only while that class is
 * present (or on hover). Per-element timers (WeakMap) so scrolling one container
 * never flashes another's scrollbar. The document scroll target is `document`,
 * whose scrollbar lives on <html>, so that case marks documentElement.
 */

const SCROLLBAR_SCRIPT =
  `(function(){` +
  `var IDLE=700;var timers=new WeakMap();` +
  `function onScroll(e){` +
  `var el=e.target;` +
  `if(el===document||el===window)el=document.documentElement;` +
  `if(!el||!el.classList)return;` +
  `el.classList.add('clean-scrolling');` +
  `var prev=timers.get(el);if(prev)window.clearTimeout(prev);` +
  `timers.set(el,window.setTimeout(function(){el.classList.remove('clean-scrolling');},IDLE));` +
  `}` +
  `document.addEventListener('scroll',onScroll,true);` +
  `}());`;

export function getScrollbarScript(): string {
  return SCROLLBAR_SCRIPT;
}

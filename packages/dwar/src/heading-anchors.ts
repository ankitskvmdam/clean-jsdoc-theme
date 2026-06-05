/**
 * Inline client script that enhances the SSR'd content headings. The MDX body
 * is server-rendered and never hydrated as an island, so heading interactivity
 * is delegated from the document instead of bound per-heading.
 *
 * Two affordances, deliberately different:
 *   - Clicking the heading text updates the URL hash via JS — the same effect
 *     as the TOC's `<a href="#id">`, so the browser scrolls the section into
 *     view honoring the heading's `scroll-margin-top` (`scroll-mt-20`) — and
 *     also copies the link. We set the hash in JS rather than rendering an
 *     anchor tag on the heading.
 *   - Clicking the hover link icon button (`[data-heading-anchor]`, see rang's
 *     `HeadingAnchor`) ONLY copies the link; it does NOT touch the hash.
 *
 * On a successful copy it sets `data-copied` on the anchor button for 3s — the
 * CSS (see rang's `HeadingAnchor`) swaps the link icon for a check as feedback.
 *
 * Real links inside a heading still work — clicks landing on an `<a>` are
 * ignored so they navigate normally.
 */

const HEADING_ANCHORS_SCRIPT =
  `(function(){` +
  `function flash(h){var b=h.querySelector('[data-heading-anchor]');if(!b)return;b.setAttribute('data-copied','');window.setTimeout(function(){b.removeAttribute('data-copied');},3000);}` +
  `function onClick(e){var t=e.target;if(!t||!t.closest)return;if(t.closest('a'))return;var h=t.closest('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]');if(!h)return;var id=h.id;if(!id)return;var iconOnly=!!t.closest('[data-heading-anchor]');if(!iconOnly){if(location.hash.slice(1)===id){h.scrollIntoView();}else{location.hash=id;}}try{var url=location.origin+location.pathname+location.search+'#'+id;if(navigator.clipboard){navigator.clipboard.writeText(url).then(function(){flash(h);}).catch(function(){});}}catch(_){}}` +
  `document.addEventListener('click',onClick);` +
  `}());`;

export function getHeadingAnchorsScript(): string {
  return HEADING_ANCHORS_SCRIPT;
}

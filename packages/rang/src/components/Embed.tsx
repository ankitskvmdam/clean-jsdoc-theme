import { useEffect, useRef } from 'preact/hooks';

/**
 * Props mirror the MDX attributes setu's `embed` builder emits — all arrive as
 * strings (numbers/booleans are stringified upstream: `height="400"`,
 * `clickToLoad="true"`). Stringy booleans are coerced internally via `isTrue`.
 *
 * See `packages/setu/docs/plan-iframe-embeds.md` (Design §5).
 */
export interface EmbedProps {
  /** Required; `https://` or protocol-relative `//`. May contain a `{theme}` token. */
  src: string;
  /** iframe title (a11y) + poster label. */
  title?: string;
  /** px (string from MDX); default 400 when no `aspectRatio`. */
  height?: string;
  /** CSS width; default `100%`. */
  width?: string;
  /** e.g. "16/9"; preferred over `height` when set. */
  aspectRatio?: string;
  /** iframe `allow=` (e.g. "fullscreen; clipboard-write"). */
  allow?: string;
  /** Override the default sandbox token list. */
  sandbox?: string;
  /** Stringy boolean `"true"`: render a click-to-load poster instead of a live iframe. */
  clickToLoad?: string;
  /** Stringy boolean `"true"`: `{theme}` in `src` is swapped to `light`/`dark`. */
  themed?: string;
}

/** Default sandbox token list; overridable via the `sandbox` prop. */
const DEFAULT_SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-forms';
const DEFAULT_HEIGHT = '400';
const REFERRER_POLICY = 'strict-origin-when-cross-origin';

/** Coerce a stringy boolean (`"true"`, case-insensitive) to a real boolean. */
function isTrue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

/** Read the active theme from `<html data-theme>` (defaults to `light`). */
function currentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** Replace the literal `{theme}` token in a URL with the active theme. */
function resolveSrc(src: string, themed: boolean): string {
  if (!themed || !src.includes('{theme}')) return src;
  return src.replace(/\{theme\}/g, currentTheme());
}

/**
 * The inner body of an embed: a live `<iframe>` (non-click-to-load) or a poster
 * `<button>` + `<noscript>` fallback (click-to-load). Rendered as the children
 * of the `data-island="embed"` marker — never as the marker itself.
 *
 * SSR and the first client paint render identical markup (the `{theme}` token
 * stays literal in `src` until post-mount) so hydration finds a match. The
 * client behavior (poster → iframe injection, `{theme}` swap on a `<html>`
 * `data-theme` MutationObserver) is wired up by the hooks below.
 *
 * This is the component dwar's island loader hydrates onto the marker (it reads
 * the marker's `data-*` back into these props), mirroring how the `copy-btn`
 * island mounts `CopyBtn` into its wrapper. Splitting the marker (`Embed`) from
 * the body (`EmbedBody`) keeps the marker out of the hydration root, so the
 * loader can `hydrate(h(EmbedBody, props), markerEl)` without double-wrapping.
 */
export function EmbedBody({
  src,
  title,
  allow,
  sandbox,
  clickToLoad,
  themed,
}: EmbedProps) {
  const clickable = isTrue(clickToLoad);
  const isThemed = isTrue(themed);
  const sandboxValue = sandbox ?? DEFAULT_SANDBOX;

  const posterRef = useRef<HTMLButtonElement | null>(null);
  // The live iframe: the SSR one (non-click-to-load) or the one injected on a
  // poster click. Tracked in a ref so the theme-sync observer can re-point it.
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Build a real <iframe> from the resolved config. Used by the click-to-load
  // injector; identical to the SSR markup of the non-click-to-load path.
  const buildIframe = (): HTMLIFrameElement => {
    const iframe = document.createElement('iframe');
    iframe.src = resolveSrc(src, isThemed);
    if (title) iframe.title = title;
    iframe.setAttribute('sandbox', sandboxValue);
    if (allow) iframe.setAttribute('allow', allow);
    iframe.setAttribute('referrerpolicy', REFERRER_POLICY);
    iframe.setAttribute('loading', 'lazy');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    return iframe;
  };

  // click-to-load: on poster click, replace the poster with the live iframe.
  useEffect(() => {
    if (!clickable) return;
    const poster = posterRef.current;
    if (!poster) return;

    const onClick = () => {
      const iframe = buildIframe();
      iframeRef.current = iframe;
      poster.replaceWith(iframe);
    };
    poster.addEventListener('click', onClick);
    return () => poster.removeEventListener('click', onClick);
    // src/title/etc. are static per render; the poster identity is what matters.
  }, [clickable, src, title, allow, sandboxValue, isThemed]);

  // Non-click-to-load: resolve the initial `{theme}` token on the SSR iframe
  // (the SSR src kept the literal token to match server output and avoid a
  // hydration mismatch). `iframeRef` already points at it via the ref below.
  useEffect(() => {
    if (clickable) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (isThemed && src.includes('{theme}')) {
      iframe.src = resolveSrc(src, true);
    }
  }, [clickable, src, isThemed]);

  // theme-sync: when themed and `src` carries a `{theme}` token, re-point the
  // live iframe whenever `<html data-theme>` flips. Mirrors CodeViewer's
  // observer (the toggle lives in a separate island, so hook state never sees
  // the change). No-op when not themed / no token / no iframe yet.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isThemed || !src.includes('{theme}')) return;
    const apply = () => {
      const iframe = iframeRef.current;
      if (iframe) iframe.src = resolveSrc(src, true);
    };
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, [isThemed, src]);

  // SSR src keeps the literal `{theme}` token so server and first client paint
  // match; the effects above resolve it on the client.
  const ssrSrc = src;

  if (clickable) {
    return (
      <>
        <button
          type="button"
          ref={posterRef}
          data-embed-poster
          aria-label={title ? `Load embedded content: ${title}` : 'Load embedded content'}
          class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 bg-(--clean-bg-muted) p-4 text-center text-(--clean-fg) transition-colors hover:bg-(--clean-bg)"
        >
          <span class="text-sm font-medium">{title ?? 'Embedded content'}</span>
          <span class="inline-flex items-center gap-1 rounded-full border border-(--clean-border) bg-(--clean-bg) px-3 py-1 text-xs text-(--clean-fg-muted)">
            Load
          </span>
        </button>
        {/* No-JS fallback: the live embed still renders without hydration. */}
        <noscript>
          <iframe
            src={ssrSrc}
            title={title}
            sandbox={sandboxValue}
            allow={allow}
            referrerpolicy={REFERRER_POLICY}
            loading="lazy"
            style="width:100%;height:100%;border:0;display:block"
          />
        </noscript>
      </>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={ssrSrc}
      title={title}
      sandbox={sandboxValue}
      allow={allow}
      referrerpolicy={REFERRER_POLICY}
      loading="lazy"
      style="width:100%;height:100%;border:0;display:block"
    />
  );
}

/**
 * An embeddable iframe. setu emits `<Embed …/>` (capitalized → routed through
 * the MDX components map). The component renders the `data-island="embed"`
 * marker — the in-content island envelope — wrapping `EmbedBody`:
 *
 *   <div data-island="embed" data-src data-title … data-click-to-load data-themed>
 *     — non-click-to-load → a live <iframe> (works with no JS)
 *     — click-to-load     → a poster <button> + <noscript><iframe></noscript>
 *
 * The wrapper's `data-*` attributes are the island's config channel (in-content
 * islands have no JSON props payload — see `CodeBlock`'s `copy-btn` marker).
 * dwar's loader reads those `data-*` back into `EmbedProps` and hydrates
 * `EmbedBody` onto this marker, so SSR and the first client paint stay
 * identical.
 */
export function Embed(props: EmbedProps) {
  const { src, title, height, width, aspectRatio, allow, sandbox, clickToLoad, themed } = props;
  const clickable = isTrue(clickToLoad);
  const isThemed = isTrue(themed);
  const sandboxValue = sandbox ?? DEFAULT_SANDBOX;

  // Sizing: prefer aspect-ratio (responsive), else a fixed px height. Width
  // defaults to 100% so the box fills the prose column.
  const wrapperStyle: Record<string, string> = {
    width: width ?? '100%',
  };
  if (aspectRatio) {
    wrapperStyle.aspectRatio = aspectRatio;
  } else {
    wrapperStyle.height = `${height ?? DEFAULT_HEIGHT}px`;
  }

  // data-* config: the island's only config channel. Omit unset attrs.
  const dataAttrs: Record<string, string> = { 'data-src': src };
  if (title) dataAttrs['data-title'] = title;
  if (aspectRatio) dataAttrs['data-aspect'] = aspectRatio;
  else dataAttrs['data-height'] = height ?? DEFAULT_HEIGHT;
  if (allow) dataAttrs['data-allow'] = allow;
  dataAttrs['data-sandbox'] = sandboxValue;
  if (clickable) dataAttrs['data-click-to-load'] = 'true';
  if (isThemed) dataAttrs['data-themed'] = 'true';

  return (
    <div
      data-island="embed"
      {...dataAttrs}
      class="my-4 overflow-hidden rounded-2xl border border-(--clean-border) bg-(--clean-bg)"
      style={wrapperStyle as never}
    >
      <EmbedBody
        src={src}
        title={title}
        allow={allow}
        sandbox={sandbox}
        clickToLoad={clickToLoad}
        themed={themed}
      />
    </div>
  );
}

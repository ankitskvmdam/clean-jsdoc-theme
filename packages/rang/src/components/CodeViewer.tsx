import { useEffect, useRef, useState } from 'preact/hooks';

// Minimal typing for the Monaco globals we touch via the AMD loader. Monaco is
// loaded from the CDN at runtime (never bundled), so we only describe the bits
// this read-only viewer uses rather than depending on `monaco-editor` types.
interface MonacoEditorInstance {
  setModel(model: unknown): void;
  revealLineInCenter(line: number): void;
  deltaDecorations(oldIds: string[], newDecorations: unknown[]): string[];
  dispose(): void;
}
interface MonacoThemeDef {
  base: string;
  inherit: boolean;
  rules: unknown[];
  colors: Record<string, string>;
}
interface MonacoGlobal {
  editor: {
    create(el: HTMLElement, opts: Record<string, unknown>): MonacoEditorInstance;
    setTheme(theme: string): void;
    defineTheme(name: string, theme: MonacoThemeDef): void;
  };
  Range: new (startLine: number, startCol: number, endLine: number, endCol: number) => unknown;
}
// AMD loader injected by loader.js. Named separately because `Window['require']`
// may already be declared by ambient Node types, which would clash with a
// `Window`-extending interface.
type MonacoRequire = ((deps: string[], cb: (...mods: unknown[]) => void) => void) & {
  config(opts: { paths: Record<string, string> }): void;
};
interface MonacoWindow {
  monaco?: MonacoGlobal;
  require?: MonacoRequire;
  MonacoEnvironment?: {
    getWorker?: (...args: unknown[]) => Worker;
    getWorkerUrl?: (...args: unknown[]) => string;
  };
}

// Localized cast helper: the page's untyped Monaco globals live on `window`.
const monacoWin = (): MonacoWindow => window as unknown as MonacoWindow;

export interface CodeViewerProps {
  /** Full file text (used for SSR fallback; the client re-reads it from the DOM <pre>). */
  code: string;
  /** Monaco language id, e.g. 'javascript'. */
  language: string;
  filename?: string;
  /** 1-based line to reveal + highlight. Falls back to the `#L<n>` URL hash. */
  highlightLine?: number;
}

const MONACO_VERSION = '0.52.2';
const MONACO_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@' + MONACO_VERSION + '/min/vs';
const LOADER_SCRIPT_ID = 'cjt-monaco-loader';
const HIGHLIGHT_STYLE_ID = 'cjt-code-viewer-style';

// Custom editor themes so the editor surface matches the code blocks elsewhere
// on the site. The dark background mirrors the pinned `[data-theme=dark] .shiki`
// backdrop (#0b0c0e in dwar's tailwind.css); keep the two in sync.
const THEME_DARK = 'clean-dark';
const THEME_LIGHT = 'clean-light';
const SHIKI_DARK_BG = '#0b0c0e';
const SHIKI_LIGHT_BG = '#ffffff';

// Shared singleton so multiple CodeViewers on one page trigger a single Monaco load.
let monacoPromise: Promise<MonacoGlobal> | null = null;
let themesDefined = false;

function loadMonaco(): Promise<MonacoGlobal> {
  const win = monacoWin();
  if (win.monaco) return Promise.resolve(win.monaco);
  if (monacoPromise) return monacoPromise;

  monacoPromise = new Promise<MonacoGlobal>((resolve, reject) => {
    // Read-only viewer needs no language services, so an empty blob worker is
    // enough to silence Monaco's "missing web worker" warning.
    win.MonacoEnvironment = {
      getWorker() {
        return new Worker(URL.createObjectURL(new Blob([''], { type: 'application/javascript' })));
      },
    };

    const onLoaderReady = () => {
      const req = win.require;
      if (!req) {
        reject(new Error('Monaco AMD loader did not initialize'));
        return;
      }
      req.config({ paths: { vs: MONACO_BASE } });
      req(['vs/editor/editor.main'], () => {
        if (win.monaco) resolve(win.monaco);
        else reject(new Error('Monaco editor.main loaded without window.monaco'));
      });
    };

    const existing = document.getElementById(LOADER_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      // Another viewer already injected the loader; if require is ready use it,
      // otherwise wait for the script's load event.
      if (win.require) onLoaderReady();
      else existing.addEventListener('load', onLoaderReady);
      return;
    }

    const script = document.createElement('script');
    script.id = LOADER_SCRIPT_ID;
    script.src = MONACO_BASE + '/loader.js';
    script.addEventListener('load', onLoaderReady);
    script.addEventListener('error', () => reject(new Error('Failed to load Monaco loader.js')));
    document.head.appendChild(script);
  });

  return monacoPromise;
}

// Register the custom themes once per page. `editor.background` is the only
// surface we override; everything else inherits from vs / vs-dark.
function defineThemes(monaco: MonacoGlobal) {
  if (themesDefined) return;
  themesDefined = true;
  monaco.editor.defineTheme(THEME_DARK, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: { 'editor.background': SHIKI_DARK_BG, 'editorGutter.background': SHIKI_DARK_BG },
  });
  monaco.editor.defineTheme(THEME_LIGHT, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: { 'editor.background': SHIKI_LIGHT_BG, 'editorGutter.background': SHIKI_LIGHT_BG },
  });
}

// The editor theme follows the same signal as the rest of the chrome: the
// `data-theme` attribute on <html>, which the theme toggle (a separate island)
// flips. Reading it here keeps the editor in sync across island boundaries —
// useThemeMode() state is per-island and would not see the toggle's change.
function currentEditorTheme(): string {
  if (typeof document === 'undefined') return THEME_LIGHT;
  return document.documentElement.dataset.theme === 'dark' ? THEME_DARK : THEME_LIGHT;
}

// Parse the `#L<n>` deep-link (e.g. /source/foo/#L42) into a 1-based line.
function parseHashLine(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  const m = /^#L(\d+)$/.exec(window.location.hash);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 1 ? n : undefined;
}

// Tailwind can't target Monaco's injected line class, so inject a tiny stylesheet
// once. The accent CSS var exists in both light/dark themes (see dwar css.ts).
function ensureHighlightStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent =
    '.cjt-line-highlight{background:color-mix(in oklch,var(--clean-accent) 18%,transparent);}' +
    '.cjt-line-highlight-gutter{border-left:3px solid var(--clean-accent);}';
  document.head.appendChild(style);
}

export function CodeViewer({ code, language, filename, highlightLine }: CodeViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [ready, setReady] = useState(false);

  // Reveal + highlight a 1-based line. Stable across renders (only touches refs).
  const highlight = (line: number) => {
    const editor = editorRef.current;
    const monaco = monacoWin().monaco;
    if (!editor || !monaco) return;
    editor.revealLineInCenter(line);
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'cjt-line-highlight',
          linesDecorationsClassName: 'cjt-line-highlight-gutter',
        },
      },
    ]);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Reuse Monaco if it's already loaded; avoids a flash of the editor when
      // navigating between viewer pages within the same session.
      setReady(!!monacoWin().monaco);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let mounted = true;

    ensureHighlightStyle();

    loadMonaco()
      .then((monaco) => {
        if (!mounted) return;
        const mountEl = mountRef.current;
        if (!mountEl) return;

        defineThemes(monaco);

        // Prefer the SSR'd <pre> textContent so the editor shows byte-exact what
        // was rendered; fall back to the prop if the <pre> is gone.
        const pre = mountEl.querySelector('pre');
        const value = pre?.textContent ?? code;

        mountEl.replaceChildren();

        const editor = monaco.editor.create(mountEl, {
          value,
          language,
          readOnly: true,
          domReadOnly: true,
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          theme: currentEditorTheme(),
          lineNumbers: 'on',
          renderValidationDecorations: 'off',
        });
        editorRef.current = editor;
        setReady(true);

        // The line comes from the prop or the `#L<n>` deep link. Defer one frame
        // so Monaco has measured/laid out before we scroll to it.
        const target = highlightLine ?? parseHashLine();
        if (target) {
          requestAnimationFrame(() => {
            if (mounted) highlight(target);
          });
        }
      })
      .catch(() => {
        // Leave the SSR <pre> fallback in place on any CDN/load failure.
      });

    return () => {
      mounted = false;
      editorRef.current?.dispose();
      editorRef.current = null;
      decorationsRef.current = [];
    };
    // `highlight` is a stable closure over refs and intentionally not a dep.
  }, [code, language, highlightLine]);

  // Theme sync: re-theme Monaco whenever <html data-theme> flips. An attribute
  // observer is used (not useThemeMode) because the toggle lives in a different
  // island, so this component's hook state never sees the change.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const apply = () => monacoWin().monaco?.editor.setTheme(currentEditorTheme());
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    apply();
    return () => observer.disconnect();
  }, [ready]);

  // Re-reveal when the `#L<n>` hash changes while already on the page.
  useEffect(() => {
    if (typeof window === 'undefined' || !ready) return;
    const onHash = () => {
      const line = parseHashLine();
      if (line) highlight(line);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [ready]);

  return (
    <div class="my-4 overflow-hidden rounded-lg border border-(--clean-border) bg-(--clean-bg)">
      {filename && (
        <div class="flex items-center justify-between border-b border-(--clean-border) bg-(--clean-bg-muted) px-3 py-2 text-sm">
          <span class="font-mono text-(--clean-fg)">{filename}</span>
          <span class="text-xs text-(--clean-fg-muted)">{language}</span>
        </div>
      )}
      {/* Monaco mounts here once loaded; until then this is the byte-exact SSR
          fallback the hydration chunk reads back via textContent. */}
      <div ref={mountRef} class="h-[calc(100vh-13rem)] min-h-[24rem]">
        <pre class="m-0 h-full overflow-auto whitespace-pre p-4 text-sm leading-relaxed text-(--clean-fg)">
          <code class={`language-${language}`}>{code}</code>
        </pre>
      </div>
    </div>
  );
}

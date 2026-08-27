/**
 * Vite plugin: dev server for a GENERATED static docs site.
 *
 * The sites in `examples/*` and `docs-site` aren't Vite apps — they're static
 * output produced by running `jsdoc` / `typedoc` / `clean-jsdoc build`. So this
 * plugin doesn't transform modules; it does the two things the old
 * `nodemon` + `serve` pair did, minus the pain:
 *
 *   1. watches the site's own sources AND every `packages/<pkg>/dist`, then
 *      re-runs the site's generator command (debounced, and coalesced if edits
 *      land mid-build);
 *   2. pushes a real **full-reload** over Vite's websocket when generation
 *      finishes, so the browser updates itself. `serve` had no reload channel at
 *      all — every change meant a manual refresh.
 *
 * Vite's own watcher is told to ignore the output directory (which is also its
 * `root`). Otherwise writing thousands of generated files would both spam
 * reloads and feed the generator its own output, so the loop would never settle.
 *
 * Package rebuilds stay with `turbo watch build`: it already knows the dependency
 * graph, so a change in utils correctly cascades through setu/rang → dwar → the
 * theme, and this plugin just reacts to the resulting `dist` writes.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createLogger } from 'vite';

const GRAY = '[90m';
const GREEN = '[32m';
const RED = '[31m';
const CYAN = '[36m';
const RESET = '[39m';

/**
 * @param {object} options
 * @param {string} options.generate  Shell command that regenerates the site.
 * @param {string[]} [options.watch] Site-relative paths to watch (sources, configs).
 * @param {string[]} [options.packages] Package names whose `dist` should trigger a rebuild.
 * @param {string} [options.redirect] Send `/` here (mirrors the old serve.json redirect).
 * @param {number} [options.debounce] Quiet period before regenerating, ms.
 */
export function staticDocs({ generate, watch = [], packages = [], redirect, debounce = 300 } = {}) {
  if (!generate) throw new Error('staticDocs({ generate }) is required');

  return {
    name: 'clean-jsdoc-theme:static-docs',
    // Dev-server only; `vite build` has no meaning for a pre-generated site.
    apply: 'serve',

    config() {
      return {
        appType: 'mpa', // directory requests resolve index.html; no SPA fallback
        // The generated JS is already bundled; discovery would only waste time
        // and can rewrite chunks that are meant to be served verbatim.
        optimizeDeps: { noDiscovery: true, include: [] },
      };
    },

    configureServer(server) {
      const siteRoot = process.cwd();
      const repoRoot = path.resolve(siteRoot, siteRoot.includes('examples') ? '../..' : '..');

      // NOTE: middlewares registered here (rather than in a returned callback)
      // run BEFORE Vite's internal static/html handling — required, since we're
      // intercepting requests Vite would otherwise 404.

      if (redirect) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '') {
            res.statusCode = 302;
            res.setHeader('location', redirect);
            res.end();
            return;
          }
          next();
        });
      }

      // Clean-URL redirect: `/module/foo` → `/module/foo/`.
      //
      // Every page is emitted as `<slug>/index.html`. Vite's static middleware
      // resolves `/slug/` but NOT `/slug`, so an extensionless URL without the
      // trailing slash 404s — which broke any hand-typed or copied link, since
      // `serve` used to resolve those. A redirect (not an internal rewrite) is
      // used deliberately: real static hosts (GitHub Pages, Netlify, S3) canonical-
      // ize to the trailing-slash form, so dev now behaves like production and
      // there's exactly one canonical URL per page.
      const docRoot = path.resolve(server.config.root);
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const [urlPath, query = ''] = (req.url ?? '').split('?');
        if (!urlPath || urlPath.endsWith('/') || path.posix.extname(urlPath)) return next();
        // Keep traversal out: resolve and confirm we stayed under the doc root.
        const candidate = path.join(docRoot, decodeURIComponent(urlPath), 'index.html');
        if (!candidate.startsWith(docRoot + path.sep) || !existsSync(candidate)) return next();
        res.statusCode = 301;
        res.setHeader('location', `${urlPath}/${query ? `?${query}` : ''}`);
        res.end();
      });

      const targets = [
        ...watch.map((p) => path.resolve(siteRoot, p)),
        ...packages.map((p) => path.join(repoRoot, 'packages', p, 'dist')),
      ].filter((p) => existsSync(p));

      server.watcher.add(targets);

      let timer = null;
      let running = false;
      let queued = false;

      const run = () => {
        if (running) {
          queued = true; // an edit landed mid-build — rebuild once this one ends
          return;
        }
        running = true;
        const started = Date.now();
        server.config.logger.info(`${CYAN}[docs]${RESET} regenerating…`);

        const child = spawn(generate, { cwd: siteRoot, shell: true, stdio: 'inherit' });
        child.on('exit', (code) => {
          running = false;
          const ms = Date.now() - started;
          if (code === 0) {
            server.config.logger.info(
              `${GREEN}[docs]${RESET} ready in ${ms}ms ${GRAY}— reloading browser${RESET}`
            );
            // `hot` is the current API; `ws` is kept for older Vite majors.
            const channel = server.hot ?? server.ws;
            channel?.send({ type: 'full-reload', path: '*' });
          } else {
            server.config.logger.error(
              `${RED}[docs]${RESET} generation failed (exit ${code}) — leaving the last good output in place`
            );
          }
          if (queued) {
            queued = false;
            run();
          }
        });
      };

      const onChange = (file) => {
        if (!targets.some((t) => file === t || file.startsWith(t + path.sep))) return;
        clearTimeout(timer);
        timer = setTimeout(run, debounce);
      };

      server.watcher.on('add', onChange);
      server.watcher.on('change', onChange);
      server.watcher.on('unlink', onChange);

      server.httpServer?.once('listening', () => {
        server.config.logger.info(
          `${CYAN}[docs]${RESET} watching ${targets.length} path(s); edit a package or a source file and the page reloads itself`
        );
      });
    },
  };
}

/**
 * A logger that drops one known-benign warning.
 *
 * dwar's island loader does `import(src)` where `src` comes from a per-page map of
 * content-hashed chunk names. That's deliberate and resolves natively in the
 * browser, but Vite's import-analysis can't see through it and warns on EVERY page
 * load. Filtering it here keeps the fix in dev tooling — the alternative would be
 * shipping a `/* @vite-ignore *\/` comment into every generated site.
 */
function quietLogger() {
  const logger = createLogger('info', { allowClearScreen: true });
  const warn = logger.warn.bind(logger);
  logger.warn = (msg, opts) => {
    if (String(msg).includes('dynamic import cannot be analyzed')) return;
    warn(msg, opts);
  };
  return logger;
}

/**
 * Shared server options for a generated site: serve `outDir` verbatim and keep
 * Vite's watcher out of it (see the note at the top of this file).
 *
 * @param {object} options
 * @param {string} options.outDir Directory holding the generated site.
 * @param {number} options.port
 */
export function staticDocsServer({ outDir, port }) {
  const generated = path.resolve(outDir);
  return {
    root: outDir,
    customLogger: quietLogger(),
    server: {
      port,
      strictPort: false,
      open: false,
      watch: {
        // Ignore ONLY the generated tree (which is `root`), so writing thousands
        // of files doesn't spam reloads or feed the generator its own output. A
        // predicate is used rather than a glob because the source paths the plugin
        // adds live outside this directory and must stay watched.
        ignored: (file) => file === generated || file.startsWith(generated + path.sep),
      },
      fs: { strict: false },
    },
  };
}

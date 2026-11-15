# clean-jsdoc-theme

## 5.3.0

### Minor Changes

- 5.3.0 is a minor release because several fixes change behavior that existing
  builds may rely on. Check these when upgrading:
  - **`strict: true` now fails on option warnings**, as documented, and a failed
    JSDoc build exits non-zero instead of 0.
  - **Node 22 or newer** is now declared in `engines`.
  - **`@private` and `@ignore` symbols no longer get pages**, and everything
    inside a private namespace, module or class is hidden too.
  - **Leftover v4 options now warn** (and `theme_opts` fails a strict build).
  - **Some heading anchors changed**: headings made only of punctuation or emoji
    get a fallback anchor, and emoji presentation characters are dropped from
    anchors, so links to the old, invisible anchors stop working.
  - **Angle-bracketed words in prose are kept as text** (`Promise<User>`), and
    stray closing tags the old behavior hid now show.

### Patch Changes

- 1afb7ca: `clean-jsdoc build` and `extract` now pass the JSDoc/TypeDoc process's stderr
  through as it runs. It used to be captured and dropped, apart from its last line
  when a build failed, so the reason for a failure (a strict-mode option error, a
  missing `plugins/markdown`) and the theme's option warnings were hidden.

  The JSDoc theme now prints each option warning once, at the end of the build
  (on stderr, after the build report, or on the way out if the build fails), like
  the TypeDoc plugin. It used to print them when the options were validated and
  again after the build report. A localized build runs one JSDoc process per locale,
  so each warning shows once per locale.

- 4b77f39: All packages now declare `engines.node: ">=22"`, the Node line CI tests (Node 20
  reached end-of-life in April 2026). Installing on an older Node now warns up front
  (or fails under `engine-strict`) instead of breaking later at runtime. Package
  metadata also gains keywords and an updated homepage URL.
- 6b7b1d6: Fix local images getting the `basePath` prefix twice under TypeDoc (#377). With
  `cleanJsdocTheme.basePath: "/docs"`, a Markdown image or raw `<img>` in a docs
  page, the README or a symbol comment rendered as
  `<img src="/docs/docs/_assets/…">` (404). The TypeDoc plugin pre-applied the base
  to the rewritten `_assets/` src and the renderer applied it again. Both bridges
  now emit base-free `/_assets/…` srcs, like page links, and the base is added
  exactly once at render time. Inline SVGs are unaffected.

  The companion `<page>/index.md` files and `llms-full.txt` now carry `basePath`
  on their root-relative links and image references, so they resolve when fetched
  from a sub-path deploy (both flavours; JSDoc's used to emit `/_assets/…` and
  both emitted base-free page links). Builds without `basePath` are unchanged.

- 0e0e148: `@private` and `@ignore` symbols no longer get their own page. A private typedef,
  class, namespace, module, interface or mixin used to get a page and a sidebar
  entry, and `@ignore`d globals still showed on the Globals page; only private
  _members_ were hidden. Hidden symbols are now dropped once, before any page,
  sidebar entry, link target, search entry or `llms.txt` line is built. A type that
  names a hidden typedef now renders as plain text; it no longer links to a page for
  the private typedef.

  Everything documented inside a `@private` namespace, module or class is hidden
  too, including public symbols nested in it. This differs from JSDoc's default
  template, which hides only the private container and keeps an orphan page for a
  public class nested inside it.

  A class whose only private part is its ES6 `constructor` (`/** @private */
constructor()`) keeps its page and public members, whatever its shape: exported,
  plain, a subclass, a class expression (top-level or nested, as in
  `Ns.Foo = class {…}`), an `export default class`, or a CommonJS export
  (`exports.Foo = class`, `module.exports = Foo`, `module.exports = class`), with or
  without an `@alias` on the class comment. An ES5
  `@class`/`@constructor` function marked `@private` is the class itself, so it
  stays hidden. On the kept class, only the Constructor section
  is hidden, along with everything else on the constructor comment (`@since`,
  `@see`, …). JSDoc merges the constructor comment into the class, which used to
  show the whole class as `private`. On TypeDoc pages, a `private constructor()`
  that TypeDoc excludes no longer leaves a `new Name()` Constructor section behind.
  With `excludePrivate: false`, or for a `protected constructor()`, the section
  shows a `private` or `protected` badge.

  JSDoc's `--private` (or `--access` naming `private` or `all`) now shows private
  symbols, members included, as JSDoc's default template does. The other `--access`
  levels (`public`, `protected`, `package`, `undefined`) are not supported: symbols
  with those access levels are always documented. Under TypeDoc,
  `excludePrivate: false` now also shows private members, which were dropped even
  though TypeDoc had kept them.

- 63b035d: Keep angle-bracketed words like `Promise<User>` and `<T>` in doc-comment prose.

  A description such as "Resolves to a Promise<User> or Array<string>" rendered
  as "Resolves to a Promise or Array", with no error or warning: the markdown
  step passes `<User>` through as an HTML tag, and the HTML conversion dropped the
  unknown tag. A type name that matches an HTML element was worse: `Array<Option>`
  or `Array<title>` lost the rest of the paragraph or page.

  The rule for a tag, by its name as written:
  - Lowercase HTML or custom elements are markup (`<kbd>`, `<br>`, `<p>`,
    `<my-widget>`). The exception is one glued to a word with no attributes, no
    closing tag in the same block, and not void: `Promise<object>` and
    `Array<title>` are text, while `foo<br>` still breaks the line.
  - ALL-CAPS element names of two or more letters are markup (`<BR>`,
    `<TABLE>`, `<DIV>`), with the same exception: `Array<DATA>` is text.
  - A single capital letter that names an element is markup only with
    attributes or a closing tag in the same block (`<B>bold</B>`,
    `<A HREF="…">`, `<P ALIGN=center>`). On its own (`<T>`, `<P>`) it is a
    generic and shows as text.
  - Every other name shows as text: unknown names (`<User>`, `<string>`) and
    any other capitalized name, even with attributes or a closing tag. That
    covers component tags in component-library docs, such as
    `<Button variant="primary">Click</Button>` or `<Option value>`, and
    mixed-case HTML such as `<Img src>` or `<Div>`, which used to render as HTML.
  - A lone closing tag follows the same rule: one whose name is not an HTML
    element, or is capitalized, shows as text. Markdown `text</content>` used to
    render as `text` and now renders `text</content>` (written `text\</content>`
    in the generated MDX). Check your pages for stray closing tags such as
    `</content>` or `</invoke>` that the old behavior hid; five of this
    project's Japanese and Chinese docs pages had them.

  The `<steps>`/`<tabs>`/`<playground>` containers work as before. This applies
  to JSDoc and TypeDoc comments, `@example` captions, the README, tutorials and
  `docs` pages. A literal tag with braces (`<Foo bar="{x}">`) no longer fails
  the page.

  The page's meta description and search entry now match the rendered text:
  literal words are kept and character references are decoded once (so
  `&quot;` and `&mdash;` no longer show up in search results). The search
  excerpt and content drop the backslashes that escaped characters left behind
  (`snake\_case` reads `snake_case`). Inline code in the search content keeps
  its text as written, where `snake_case` used to become `snake case` and
  `Array<Map<string, T>>` lost its `>>`; the excerpt still leaves inline code out.

- 70ae366: Keep a doc page's sidebar link when a later doc page is skipped for sharing its slug.

  When two files in the docs directory produced the same URL (for example
  `docs/foo-bar.md` and `docs/foo_bar.md`, both `foo-bar`), the first was built and
  the second skipped with a warning, but the sidebar dropped both entries, so the
  built page could only be reached by typing its URL. Only the skipped page's entry
  is removed now; the page that was built keeps its link. A doc page skipped because
  an API page already owns its slug still gets no sidebar entry.

- 614a6a9: Keep a tutorial's sidebar link when a later tutorial is skipped for sharing its slug, and warn about the skip.

  When two tutorials produced the same URL (for example `tutorials/foo-bar.md` and
  `tutorials/foo_bar.md`, both `tutorials/foo-bar`), the first was built and the
  second dropped, but the sidebar kept both entries, so the second link opened the
  first tutorial's page. Only the built tutorial keeps its entry now. A skipped
  tutorial, which used to be dropped silently, is reported like a skipped doc page:
  `skipping tutorial "Underscore" (tutorials/foo_bar): its slug "tutorials/foo-bar"
collides with an existing page`. A tutorial whose slug a doc or API page already
  owns is skipped with the same warning and gets no sidebar entry.

- 7ba5ed2: Label the home page in the failed-page and content-warning reports.

  When the home page (README or root `index.md`) failed to render or raised a
  content warning, the build log listed it with a blank label (`-  (line 8:2): …`)
  because its slug is empty. It is now shown as `(home page)`. Other pages keep
  their slug as the label.

  A doc page that is skipped because its slug is empty or already taken is now
  named by its title and source file, e.g. `skipping doc page "Bangs"
(docs/!!!.md): its slug is empty, which would collide with the home page`,
  instead of `slug ""`.

- 4fa057c: Fix links to a class named `Index` opening the home page (#333).

  The page for a symbol named `index` is written to `index/index.html`, but the
  sidebar, type links, search results, prev/next cards and the language switcher
  linked it as `/index`. Hosts that serve `/index` from `index.html` (GitHub Pages
  does) showed the home page instead. Links to a page whose URL ends in `index`
  (`/index`, `/module/index`) now carry a trailing slash (`/index/`) so they reach
  the page itself. All other links are unchanged.

- 88de8f4: Clearer npm descriptions and keywords for `clean-jsdoc-theme` and
  `@clean-jsdoc-theme/typedoc`, so both show up in npm searches for JSDoc and
  TypeDoc themes. The TypeDoc package also gains the `typedocplugin` keyword,
  which typedoc.org's plugin list reads.
- 24b07fe: Give every heading a visible anchor that the table of contents links to.
  - **Headings with no letters or digits.** A member named `$`, `_` or `$$`, or a
    Markdown heading like `## $` or `## 🚀`, got an empty anchor: it rendered with
    `id=""`, and its table-of-contents link (and a `{@link}` to such a member)
    pointed at the top of the page. These now get an anchor built from their
    text's code points: `#section--1f680` for a prose `## 🚀` (a repeat becomes
    `#section--1f680-1`) and `#member--24` for a member `$`.
  - **Emoji with a variation selector or keycap.** `## ⚠️`, `## ❤️` or `## 1️⃣`
    used to get an anchor made of invisible characters. A heading that is only
    such an emoji now gets a fallback like `#section--26a0_fe0f`, and the emoji
    presentation characters U+FE0E, U+FE0F and the keycap U+20E3 are dropped
    from mixed text: `## ⚠️ Warning` is now `#warning`, and `## 1️⃣ Step` is now
    `#1-step`. Links to the old, invisible anchors stop working. A heading whose
    anchor was made only of combining marks (`## ゛`) also gets a fallback.
  - **Formatted headings in the table of contents.** For a heading with bold,
    italic, link or inline-code text, the table of contents only read the plain
    text around the formatting, so `## **Bold** title` was listed as `title` and
    linked to `#title` while the heading itself was `#bold-title`. The table of
    contents now reads the whole heading and links to the anchor the page renders.
    This includes a footnote reference: `## Intro[^1]` is now listed as `Intro1`
    and links to `#intro1`, the anchor the page always rendered (and the one
    GitHub generates).
  - **Hard line breaks in headings.** `## a<br>b` was listed as `ab` linking to
    `#ab` while the page rendered `#a-b`; the table of contents now links to
    `#a-b`.
  - **TypeDoc members with no visible name.** A TypeScript property or enum
    member literally named `' '` aborted the TypeDoc build. It now renders with
    the anchor `#member--20`, and is shown as `' '` in the heading, the table of
    contents and search. A name made only of characters that print nothing — a
    no-break space, a zero-width space, a soft hyphen, a lone combining mark, a
    tab, a Braille blank (U+2800), a lone surrogate half — is shown as a quoted
    escape (`'\u00a0'`, `'\u200b'`, `'\t'`, `'\u2800'`, `'\ud800'`), so its
    heading and table-of-contents row are never blank and two such names never
    look the same; the anchor keeps the code points (`#member--200b`). A name
    with any visible character, such as `$` or `a b`, is unchanged.

  The table of contents, the rendered page and `{@link}` always use the same
  anchor. Any heading whose anchor already contained a letter or digit and none
  of U+FE0E/U+FE0F/U+20E3 keeps its anchor byte for byte; all 1,900 headings in
  this repo's own docs (en/hi/ja/zh) are unchanged.

- c892638: `"template": "node_modules/clean-jsdoc-theme"` (the path v4 configs and the
  migration guide use) now works: the package ships a root `publish.js` that loads
  the built theme, so JSDoc no longer fails with `Cannot find module
'.../clean-jsdoc-theme/publish'`. `node_modules/clean-jsdoc-theme/dist` keeps
  working.
- c5936b3: Fix a blank member heading for a member with an empty name.

  JSDoc can't name an ES private method (instance or static), so a doc comment on
  `#secret() {}` reached the theme as a member with an empty name and rendered as
  an empty heading with no anchor on its class page. TypeDoc does the same for a
  TypeScript property declared as `'': number`. Members with an empty name are now
  left out of every member list in both the JSDoc and TypeDoc themes, so they no
  longer produce a heading, a table-of-contents entry, a search entry or a link
  target. Named members are unaffected.

- e222882: **`strict: true` now fails on option warnings, as documented — existing strict
  builds may start failing.** Before, `strict` only failed on option errors, so a
  misspelled key, an unusable `siteUrl`, or an unreadable `footer` / `favicon` /
  logo / custom file was reported and the build carried on. Now every option
  warning is an error under `strict`, and the build stops before writing anything.
  The exceptions are a top-level v4 option name under JSDoc (see the v4-options
  change) and, under TypeDoc, JSDoc-only options and the `siteUrl` override of
  `hostedBaseUrl` (see the TypeDoc change). Content warnings, such as an unbalanced
  backtick, are not affected.

  A failed JSDoc build now exits non-zero. JSDoc 4 printed a thrown theme error as
  `Unhandled rejection …` and still exited 0, so CI (and `clean-jsdoc build`, which
  checks each locale's exit code) couldn't see a strict failure, a missing
  `plugins/markdown`, or a bad build spec. The error is now reported once through
  JSDoc's logger and the process exits 1. TypeDoc already exited non-zero.

  The Google Fonts check (when `fonts` is set) now uses `node:https` instead of the
  global `fetch` in both the JSDoc and TypeDoc builds. On Windows, a build that
  failed right after the check aborted Node with a libuv assertion
  (`!(handle->flags & UV_HANDLE_CLOSING)`, exit code 127) instead of exiting with
  its normal error code. The check uses Node's default HTTPS agent, so it still
  honours the env proxy (`NODE_USE_ENV_PROXY=1` / `--use-env-proxy` with
  `HTTPS_PROXY`, Node 24+) the way `fetch` did.

  `customCssFile` / `customJsFile` entries that aren't local paths (a URL, or a v4
  `{ href, integrity }` object) now warn and are skipped instead of being dropped
  silently.

- 0dd64ea: Fix a page being skipped when its prose contains an HTML comment (`<!-- … -->`).

  MDX has no HTML-comment syntax, so a single comment in a README (badge blocks,
  all-contributors markers), a tutorial or a doc comment made the whole page fail
  to render with ``Unexpected character `!` (U+0021) before name`` — on the README
  that left the site without a home page. Comments are now dropped from prose, as
  a browser would hide them: the generator removes them while converting README,
  tutorial and doc-comment text — so a generated page's body, its `.md` companion,
  `llms-full.txt`, the page description and the search index hold no comment text
  — and the renderer drops any comment left in a body handed to it directly (from
  the rendered HTML and the search index; the `.md` companion stays the verbatim
  body, as documented). A comment shown inside a fenced code block (including a
  four-backtick fence wrapping triple-backtick lines, a fence in a list item or a
  blockquote), an inline code span, a quoted attribute value or a link URL/title
  is kept as written, and a comment that starts a line hides everything up to its
  `-->`, so commenting out a whole section — or a single `<step>`/`<tab>` inside a
  live `<steps>`/`<tabs>`, or a playground fence — works as on GitHub. An
  unterminated `<!--` is shown as literal text instead of hiding the rest of the
  page, and a comment removed from the middle of a page no longer shifts the line
  numbers reported for a later render error. TypeDoc doc comments get the same
  fix.

  The search index's text now strips tags with a pass that reads quoted attribute
  values whole, so a value holding `>` (such as a member signature) no longer
  leaves fragments such as `" /` in a page's search `content`, and a `<` in inline
  code (a generic type such as `Array<Map<string, T>>`) is no longer taken for the
  start of a tag, so the code's text stays in the search index.

  `@example` captions are parsed with the same GitHub-Flavored Markdown as every
  other prose surface (`~~strikethrough~~`, bare URLs), and ones holding raw HTML
  such as `<?php … ?>`, `<![CDATA[…]]>` or `<br>` no longer skip the page: they are
  normalized the same way descriptions already were.

- 452124c: Parameter and property defaults now show exactly as written. A string default
  was quoted a second time, so `[name=""]` displayed as `"\"\""` and `[sep='']`
  as `"''"`. Defaults now render verbatim in a code span (`""`, `''`, `{a: 1}`,
  `() => {}`, `0`, `true`, `null`, `NaN`), the same as a member's **Default:**
  line, on JSDoc and TypeDoc pages alike.

  A default that is a `{@link}` tag
  (`@param {number} [priority={@link Priority.NORMAL}]`) now renders the link,
  the way a `{@link}` in a description does: a resolved target becomes a link to
  that symbol (`{@linkcode}` keeps the code look), text around the tag stays
  text, and an unresolved target falls back to the same inert code span
  (`Priority.NORMAL`). The tag used to print raw inside the code span
  (`{@link Priority.NORMAL}`).

  On TypeDoc pages, a `@defaultValue` tag no longer shows its own backticks or a
  `ts` code fence inside the **Default:** value, and it now wins over the
  property's initializer. Defaults follow TypeDoc's own model. A tag that is a
  single code span or plain content renders as a code value, so prose with no code
  of its own (`@defaultValue the current working directory`,
  `see [docs](url)`) shows as code, exactly as in TypeDoc's default theme. A tag
  that mixes text with code spans or `{@link}` renders as text with working links
  and code. A parameter with an object or array initializer no longer shows
  `default: ...`.

- 66a7ecc: Leftover v4 options no longer pass silently. A `theme_opts` block (v5 reads options
  directly from `opts`) and top-level v4 option names that v5 doesn't use
  (`base_url`, `homepageTitle`, `sections`, …) now warn, each with a hint naming
  the v5 replacement or saying the option was removed. v4 names that are still v5
  options (`menu`, `favicon`, `meta`, `footer`) aren't flagged.

  Under `strict: true`, the `theme_opts` block and every key in it are errors that
  fail the build. Top-level v4 names stay warnings even under `strict`, because
  another JSDoc plugin may own an `opts.title` or `opts.search`. The TypeDoc plugin
  never had v4 options and doesn't run this check.

- Updated dependencies [6b7b1d6]
- Updated dependencies [0e0e148]
- Updated dependencies [63b035d]
- Updated dependencies [70ae366]
- Updated dependencies [614a6a9]
- Updated dependencies [7ba5ed2]
- Updated dependencies [834814d]
- Updated dependencies [4fa057c]
- Updated dependencies [24b07fe]
- Updated dependencies [c5936b3]
- Updated dependencies [e222882]
- Updated dependencies [0dd64ea]
- Updated dependencies [452124c]
- Updated dependencies [66a7ecc]
  - @clean-jsdoc-theme/dwar@5.3.0
  - @clean-jsdoc-theme/rang@5.3.0
  - @clean-jsdoc-theme/setu@5.3.0
  - @clean-jsdoc-theme/utils@5.3.0
  - @clean-jsdoc-theme/bhasha@5.3.0

## 5.2.1

### Patch Changes

- 6489b20: Remove the unused Pagefind step and drop `setu` from dwar's dependencies.

  **Pagefind is gone.** Every build ran Pagefind over the output directory and
  wrote a `pagefind/` bundle that nothing ever read — the `Ctrl K` palette has
  always searched dwar's own fuzzy index
  (`_assets/search-index.<buildId>.json`), and no theme code loaded
  `pagefind/pagefind.js`. Builds are now that much faster and no longer emit a
  `pagefind/` directory. `@clean-jsdoc-theme/dwar` no longer exports
  `runPagefindAgainstDir`, and `pagefind` is no longer a dependency (it pulled in
  a platform binary per install). In-page search is unchanged.

  If you were pointing your own search UI at the generated `pagefind/`
  directory, run Pagefind yourself as a post-build step against the output.

  **dwar no longer depends on setu.** `@clean-jsdoc-theme/setu` was listed in
  dwar's `dependencies` but no `src/` file imported it — only the dev-only smoke
  script did, which contradicted the one-way setu→dwar boundary and dragged setu
  into dwar's published dependency graph. The smoke script now builds its
  `SiteManifest` by hand; the full `setu → dwar → disk` path is covered
  end-to-end by `examples/basic`.

  Docs (`ARCHITECTURE.md`, the pipeline diagram, the package docs in all four
  locales, the READMEs, and the LLM skills) no longer describe a Pagefind index
  or a `setu` dependency, and no longer claim a flag that never existed.

- 972a75c: Fix a page being skipped when a description line starts with `import` or `export` (#347).

  A doc comment whose description began with the lowercase word `import` (or
  `export`) — e.g. "import these functions to your own project." — made its whole
  page fail to render with `Could not parse import/exports with acorn`, because MDX
  reads a flow line that starts with that keyword as an ES module statement. The
  renderer's pre-pass now neutralizes such prose lines (the keyword's first letter
  becomes a character reference, invisible once rendered), so the sentence renders
  as plain text whatever word it starts with. Real `import` statements inside code
  fences and inline code are untouched, and the `.md` companion is unchanged.

- Updated dependencies [6489b20]
- Updated dependencies [972a75c]
  - @clean-jsdoc-theme/dwar@5.2.1
  - @clean-jsdoc-theme/utils@5.2.1
  - @clean-jsdoc-theme/setu@5.2.1
  - @clean-jsdoc-theme/rang@5.2.1
  - @clean-jsdoc-theme/bhasha@5.2.1

## 5.2.0

### Minor Changes

- 68a3bda: Add `llmsTxt` — generate an [llmstxt.org](https://llmstxt.org) index for your docs.

  Set `llmsTxt: true` (with `siteUrl`) and the build emits `llms.txt` at the output
  root — your project name, a summary, then one section per sidebar group where each
  entry links a page's companion Markdown rather than its HTML — plus `llms-full.txt`
  with every page concatenated. Accepts `{ full?: boolean, api?: boolean | 'index' }`:
  `full: false` skips the concatenated file, `api: 'index'` lists API pages without
  descriptions and omits their bodies from `llms-full.txt`, and `api: false` leaves API
  pages out of both. Source-file viewer pages are never listed, and each locale of a
  localized build gets its own file.

  The TypeDoc plugin now also falls back to TypeDoc's own `hostedBaseUrl` when
  `cleanJsdocTheme.siteUrl` is unset (the theme-specific key wins if both are set, with
  a warning), so `sitemap.xml` and `llms.txt` work without repeating the URL.

  `siteUrl` is now validated up front: a malformed value, or `llmsTxt` enabled without
  a usable site URL, reports a warning instead of silently producing nothing (and fails
  the build under `strict`). A `siteUrl` carrying a path while `basePath` is unset now
  warns too, since that path is dropped from emitted URLs. Option warnings are also
  re-printed after the build report, so they can't scroll away behind the build log.

### Patch Changes

- 4f9bf22: Build the packages with [tsdown](https://tsdown.dev) (Rolldown) instead of tsup.

  No API, entry-point, or output-filename changes: every package emits the same
  files with the same exports and the same type surface, and a site built with the
  new toolchain is byte-identical — 671/671 emitted HTML/Markdown files, the
  stylesheet, and all 61 hydration bundles match the previous output exactly.

- Updated dependencies [6c89543]
- Updated dependencies [68a3bda]
- Updated dependencies [4f9bf22]
  - @clean-jsdoc-theme/rang@5.2.0
  - @clean-jsdoc-theme/utils@5.2.0
  - @clean-jsdoc-theme/dwar@5.2.0
  - @clean-jsdoc-theme/setu@5.2.0
  - @clean-jsdoc-theme/bhasha@5.2.0

## 5.1.1

### Patch Changes

- 2abaafa: Add a **`scrollbar`** option (`"styled"` | `"visible"` | `"native"`) to control scrollbar presentation. The default `"styled"` keeps the current overlay bar (invisible at rest); `"visible"` keeps the themed bar always shown; `"native"` disables all scrollbar styling and uses the browser's own scrollbar. Fixes #281.
- Updated dependencies [2abaafa]
  - @clean-jsdoc-theme/utils@5.1.1
  - @clean-jsdoc-theme/dwar@5.1.1
  - @clean-jsdoc-theme/setu@5.1.1
  - @clean-jsdoc-theme/rang@5.1.1
  - @clean-jsdoc-theme/bhasha@5.1.1

## 5.1.0

### Minor Changes

- d3082d7: Add **`collapsibleSidebarSections`** — top-level sidebar section headers (Namespaces, Classes, Interfaces, `@category` groups, doc groups, Tutorials, …) can now be collapsed. It accepts `true` / absent (all sections collapsible — the default), `false` (none), or an array of exact, case-sensitive section labels (only those). Sections default open, and a visitor's collapsed state persists in `localStorage`. A label in the array that matches no rendered section prints a build warning listing the available section labels. Works for both the JSDoc template and the TypeDoc plugin. (Closes #343.)

  **Heads-up — visible default change:** with no configuration, every top-level sidebar section header now renders as a collapse toggle (still expanded by default, so nothing is hidden on load). Pass `"collapsibleSidebarSections": false` to restore the previous always-static headers.

### Patch Changes

- 8fc6dd1: Footer: the repository link now **underlines on hover** instead of changing color. It keeps its `text-muted-foreground` color and adds `hover:underline` (was `hover:text-accent`).
- Updated dependencies [d3082d7]
- Updated dependencies [8fc6dd1]
  - @clean-jsdoc-theme/utils@5.1.0
  - @clean-jsdoc-theme/setu@5.1.0
  - @clean-jsdoc-theme/rang@5.1.0
  - @clean-jsdoc-theme/dwar@5.1.0
  - @clean-jsdoc-theme/bhasha@5.1.0

## 5.0.8

### Patch Changes

- ce160bc: Stamp the theme version into every generated page as `<meta name="generator" content="clean-jsdoc-theme <version>" />`, so a built site records which version produced it (useful for bug-report triage). Emitted by default in both the JSDoc and TypeDoc flavors; an author `meta` entry with `name: "generator"` overrides it.
- 4c687c6: Fix `Cannot read properties of undefined (reading 'context')` that made every page fail to render under Yarn Berry (PnP), producing an empty `dist`.

  `preact` was a direct dependency of the internal packages that create and consume Preact contexts, so under Yarn PnP's strict resolution the server-rendered component tree and `preact-render-to-string` could bind to different Preact instances — leaving Preact's internal `currentComponent` unset and throwing on the first `useContext` of every page. `preact` is now a `peerDependency` of the internal packages (`rang`, `dwar`, `bhasha`, `setu`) and a direct dependency of the installable entry points (`clean-jsdoc-theme`, `@clean-jsdoc-theme/typedoc`, `@clean-jsdoc-theme/aadesh`), so a single Preact instance is shared regardless of package manager.

- Updated dependencies [ce160bc]
- Updated dependencies [4c687c6]
  - @clean-jsdoc-theme/dwar@5.0.8
  - @clean-jsdoc-theme/rang@5.0.8
  - @clean-jsdoc-theme/bhasha@5.0.8
  - @clean-jsdoc-theme/setu@5.0.8
  - @clean-jsdoc-theme/utils@5.0.8

## 5.0.7

### Patch Changes

- Patch release: dependency security updates, a TypeDoc doc/behavior cleanup, and standalone package READMEs.
  - **Security / dependencies** — bump `esbuild` (dwar) to `^0.28.1` and refresh the build/test toolchain (`happy-dom`, `vitest`, `vite`, `turbo`), plus transitive overrides (`markdown-it`, `linkify-it`, `shell-quote`, `fast-uri`, `brace-expansion`, `js-yaml`) to clear all open Socket/Dependabot advisories.
  - **setu / typedoc** — remove the inert `sectionOrder` / `clubSidebarItems` handling under the TypeDoc flavor. Under TypeDoc the module hierarchy owns the API sidebar and doc groups order via `docGroups`; these options were accepted but had no effect, so the dead threading is gone. No behavior change.
  - **Docs** — correct the TypeDoc sidebar-lever documentation (getting-started, structure-your-sidebar, configuration) and make the `clean-jsdoc-theme` and `@clean-jsdoc-theme/typedoc` package READMEs standalone, each centered on its own toolchain.

- Updated dependencies
  - @clean-jsdoc-theme/setu@5.0.7
  - @clean-jsdoc-theme/dwar@5.0.7
  - @clean-jsdoc-theme/utils@5.0.7
  - @clean-jsdoc-theme/rang@5.0.7
  - @clean-jsdoc-theme/bhasha@5.0.7

## 5.0.6

### Patch Changes

- TypeDoc output parity with TypeDoc's default theme. **TypeDoc flavor only — JSDoc output is unchanged (byte-identical).**
  - **Sidebar** now mirrors TypeDoc's default theme: a module/folder hierarchy (folders from your source directory structure, single-child folders merged, clickable + expandable module nodes, members nested and ordered by kind) instead of the global kind buckets. Under the TypeDoc flavor the module hierarchy owns the API sidebar, so `@category` / `@group` / `@order` / `sectionOrder` / `clubSidebarItems` no longer shape it (they continue to work for the JSDoc template; doc groups, `menu`, and tutorials still apply for both).
  - **Inheritance & relationships** on class/interface pages: `Hierarchy`, `Implements`, and `Implemented By` sections, plus `Inherited from` / `Overrides` / `Implementation of` member captions.
  - **`@group`** tag recognized; **`@inheritDoc`** resolved; native TypeDoc **`projectDocuments`** rendered as pages; **async** modifier badge; inline **object-literal types** expanded into linked property tables.

  Docs updated for all of the above in English, Hindi, Japanese, and Chinese.

- Updated dependencies
  - @clean-jsdoc-theme/setu@5.0.6
  - @clean-jsdoc-theme/rang@5.0.6
  - @clean-jsdoc-theme/utils@5.0.6
  - @clean-jsdoc-theme/dwar@5.0.6
  - @clean-jsdoc-theme/bhasha@5.0.6

## 5.0.5

### Patch Changes

- Local images now resolve from every prose source, plus JSDoc `staticFiles`
  support and a generated `sitemap.xml`.

  ### Images
  - Local images referenced from **tutorials, the README, and JSDoc / TypeScript
    doc comments** (previously only `opts.docs`) are copied into the content-hashed
    `_assets/` pipeline and the reference is rewritten — both Markdown `![](…)` and
    raw `<img>`. Comment images resolve against each symbol's own source file; SVGs
    are inlined so light/dark follows the theme toggle. Parity across the JSDoc and
    TypeDoc bridges.
  - JSDoc **`templates.default.staticFiles`** is honored: included files are copied
    verbatim to the output root (JSDoc parity), and the include directories become
    fallback search roots, so a bare reference like `![](classes-io.png)` resolves
    and is hashed — no need to rewrite existing comments or tutorials. A file already
    served from `_assets/` is not duplicated at the root.
  - Image syntax shown **inside code spans / fenced blocks** is left literal — no
    spurious copy, rewrite, or "could not read image" warning.

  ### Sitemap
  - New **`siteUrl`** option: when set, the build emits `sitemap.xml` at the output
    root with one `<loc>` per non-hidden page. Only the URL's origin is used; the
    deploy sub-path comes from `basePath`, so the two never double-count.

  ### Security
  - No runtime security-surface changes. Image and `staticFiles` resolution runs at
    build time over author-declared paths only — no runtime evaluation and no new
    network access; `siteUrl` is used solely to compose the absolute `<loc>` URLs in
    `sitemap.xml`.
  - @clean-jsdoc-theme/utils@5.0.5
  - @clean-jsdoc-theme/setu@5.0.5
  - @clean-jsdoc-theme/rang@5.0.5
  - @clean-jsdoc-theme/dwar@5.0.5
  - @clean-jsdoc-theme/bhasha@5.0.5

## 5.0.4

### Patch Changes

- TypeDoc support reaches parity with the JSDoc output, plus security hardening.

  ### TypeDoc parity
  - **Standalone pages** for enums, top-level functions, and variables, with
    TypeDoc section labels (Constructors / Properties / Accessors / Methods) and an
    "Enumeration Members" section; module/namespace pages become a kind-grouped
    index of links.
  - **Full TypeScript signatures** (shiki-highlighted inline) on
    member/constructor/function headings, in both flavors. Overloaded
    functions/methods render every call signature.
  - **Declaration blocks** lead interface / type-alias / variable pages
    (`interface Name { … }`, `Name = (p) => R`, `HTTP_STATUS: { … }`), and
    object-literal constants now list every member with its own doc comment under
    "Properties" instead of collapsing to one line.
  - **Type names hyperlink** to the symbols they reference (v4 parity); generics
    render a "Type Parameters" section; `@remarks` renders as its own section.
  - New **`basePath`** option so a TypeDoc site can be served from a sub-directory
    (every emitted URL — pages, assets, logos, favicon — is prefixed).

  ### Security
  - Removed the `new Function` **eval shim** from the module-path resolver — the
    theme no longer evaluates code at runtime.
  - Added `socket.yml` to triage build-inherent Socket alerts, dropped the
    now-unneeded `usesEval` exception, and scoped the `shellAccess` rule to the
    aadesh CLI.

  ### Fixes
  - `findStrayBackticks` no longer false-positives on valid inline code spans.
  - Both bridges clean their output directory before writing, so stale/renamed
    pages don't linger in the served site.
  - Dark-theme colors for inline signatures; wrapped signature params are indented
    and rendered slightly smaller; the JSDoc constructor section is unified.
  - @clean-jsdoc-theme/utils@5.0.4
  - @clean-jsdoc-theme/setu@5.0.4
  - @clean-jsdoc-theme/rang@5.0.4
  - @clean-jsdoc-theme/dwar@5.0.4
  - @clean-jsdoc-theme/bhasha@5.0.4

## 5.0.3

### Patch Changes

- Patch release with bug fixes and a TypeDoc parity feature:
  - **Fix — `index` name clash (#333):** a documented symbol named `index` no
    longer overwrites the home page. It now renders at `/index/` like any other
    container, so neither page is lost.
  - **Improve — render diagnostics (#333):** when a page fails to compile, the
    build now reports the exact `line:column` plus a code-frame snippet (instead
    of just the slug), so the offending content is easy to locate on large
    aggregated pages like Globals.
  - **Fix — MDX brace escaping (#333):** inline-code detection now follows
    CommonMark (a code span can't cross a blank line), so a single unbalanced
    backtick in one doc comment can no longer desync escaping across a whole page
    and abort it with "Could not parse expression with acorn".
  - **Add — unbalanced-backtick warnings (#333):** unbalanced inline-code
    backticks are surfaced as non-fatal build warnings pointing at the source
    line, so the authoring slip is easy to find and fix.
  - **Add — TypeDoc `docs` directory (#334):** the TypeDoc plugin now supports the
    `docs` prose directory (plus `docGroups` / `defaultDocGroup`), matching the
    JSDoc bridge — hand-written Markdown/HTML guides render alongside the API.
  - **Fix — sidebar on tablet/iPad:** on widths where both the left sidebar and
    the mobile table-of-contents bar are shown, the sidebar's first item is no
    longer hidden behind the TOC bar.
  - @clean-jsdoc-theme/utils@5.0.3
  - @clean-jsdoc-theme/setu@5.0.3
  - @clean-jsdoc-theme/rang@5.0.3
  - @clean-jsdoc-theme/dwar@5.0.3
  - @clean-jsdoc-theme/bhasha@5.0.3

## 5.0.2

### Patch Changes

- cbf2da2: Mobile header fix and restored `target`/`class` menu options.
  - **Search + language switcher now stay visible on mobile.** The header search
    trigger was wrapped in a `hidden … md:flex` desktop-only container, so the
    search icon disappeared below the `md` breakpoint. Search (and the
    always-present language switcher) are pulled out of that wrapper so both stay
    visible on every breakpoint; theme/settings remain desktop-only since the
    mobile nav drawer already hosts them.
  - **`target` and `class` are back on menu entries.** Both options were dropped
    from the v5 menu object and are now re-introduced as optional fields, threaded
    through the whole pipeline (opts schema, setu, the JSDoc + TypeDoc bridges, and
    rang's sidebar). `target` overrides the link target (external links still
    default to `_blank`, and the `noopener` rel is dropped when the target isn't
    `_blank`); `class` is merged onto the rendered link. Both apply to external and
    built-in/internal entries and are omitted when unset, so existing menus stay
    byte-identical.

- Updated dependencies [cbf2da2]
  - @clean-jsdoc-theme/utils@5.0.2
  - @clean-jsdoc-theme/setu@5.0.2
  - @clean-jsdoc-theme/rang@5.0.2
  - @clean-jsdoc-theme/dwar@5.0.2
  - @clean-jsdoc-theme/bhasha@5.0.2

## 5.0.1

### Patch Changes

- 746b91d: Code playgrounds, a favicon option, and a refreshed code block.
  - **Playgrounds (#329).** Open an `@example` (or a code fence) in **CodePen**,
    **JSFiddle**, or **CodeSandbox**, prefilled — bringing back and generalizing
    v4's `codepen` feature. A code block's header gains an "Open Code in" dropdown;
    it's fully client-side (form POST / parameterized link — no backend, no API
    key). Configure with `opts.playground` (`enableForAllExamples`, `providers`,
    and site-wide per-provider options) and the `@playground` block tag (provider
    selection, `none`/`off`, plus `filename=` and `highlight=` for the rendered
    block). Works in prose too — a ` ```js playground ` fence or a `<playground>`
    container — and through both the JSDoc and TypeDoc bridges.
  - **Favicon.** New `favicon` option — a path to an image the theme copies to a
    content-hashed asset and links as `<link rel="icon">` (with the right `type`).
    Restores the v4 option v5 had dropped, and is the way to ship an SVG favicon
    (browsers auto-discover only a root `favicon.ico`).
  - **Refreshed code block.** Each block now has a header bar (a `CODE`/filename
    label plus copy and the playground dropdown), per-line highlighting, and
    configurable code-chrome colors (`codeHeaderBg` / `codeHeaderFg` /
    `codeHighlightBg` under `colors` / `darkColors`) that stay legible in light and
    dark.

- Updated dependencies [746b91d]
  - @clean-jsdoc-theme/utils@5.0.1
  - @clean-jsdoc-theme/setu@5.0.1
  - @clean-jsdoc-theme/rang@5.0.1
  - @clean-jsdoc-theme/dwar@5.0.1
  - @clean-jsdoc-theme/bhasha@5.0.1

## 5.0.0

### Minor Changes

- 8221bc8: Assets, theme colors, and synchronized tabs.
  - **Hashed asset pipeline + inline SVGs.** Doc/README images referenced by a relative or root-relative path are now copied into content-hashed `_assets/<name>.<hash><ext>` paths (cache-busting, like the logo and custom CSS/JS), and SVGs are inlined into the page so their `[data-theme="dark"]` styles follow the in-page theme toggle rather than only the OS color scheme. Logos gain the same content hash.
  - **`colors` / `darkColors` options.** Override the light and dark palettes per key (`bg`, `fg`, `accent`, …) from `jsdoc.json` / `typedoc.json`; previously these were silently ignored.
  - **Synchronized tabs.** Tab blocks sharing a `group` now stay in sync across a page and persist the choice (e.g. picking the TypeDoc example switches every example), with a `value` per tab as the sync key. Fixes the active-tab underline being clipped until a scroll.

- 61a6b67: Command palette, callouts, tutorials, and a rebuilt documentation site.
  - **Command palette — recent & favorite searches.** `Ctrl K` now remembers recent
    queries and lets you star favorites (persisted locally). The palette was
    refactored into focused components.
  - **Tutorials nest in the sidebar.** Sub-tutorials render as collapsible groups
    mirroring JSDoc's resolved hierarchy (#253), and `@tutorial` resolves to its
    page through a shared cross-reference resolver.
  - **Callouts everywhere.** Every blockquote renders as a callout (defaulting to
    `info`), and GitHub-style alert blockquotes nested inside lists are promoted
    too.
  - **Rendering fixes.** Anchor jumps land below the sticky header on small
    screens; Home is included in the prev/next reading order (source & menu links
    excluded); grouped badge images no longer add vertical margin; the island
    bundle cache busts when `rang` changes; and the build spinner stays alive
    during long synchronous stages.
  - **Documentation.** A rebuilt docs site — getting-started, guides, authoring
    (callouts / steps / tabs / embeds / custom tags), an FAQ, and per-package
    pages — plus refreshed package READMEs with a theme-aware logo.

- 8b45c63: Localization (i18n), prompt-to-file, Unicode anchors, and polish.
  - **Multi-language documentation.** A new localization pipeline renders one static
    site per locale (the default unprefixed, others under `/<locale>`) with a header
    language switcher, `hreflang` alternates, and per-language fonts. Two new
    packages drive it: **`@clean-jsdoc-theme/bhasha`** (the pure, browser-safe i18n
    core — chrome catalog, the `t` translator + fallback chain, `LanguageProvider`,
    and the API-slot key/hash scheme) and **`@clean-jsdoc-theme/aadesh`** (the
    `clean-jsdoc` CLI: `extract` / `prompt` / `validate` / `build`, plus an
    interactive menu). Translatable content spans UI chrome, API
    descriptions/summaries/example captions/parameter + return descriptions, and
    prose (a per-locale `README.<locale>.md` home and a `docs.<locale>/` overlay).
    Opt in with `opts.locales` / `opts.defaultLocale`; a build with no locales stays
    byte-identical. The TypeDoc bridge supports _extract_ today; the localized
    _build_ is JSDoc-only for now.
  - **`clean-jsdoc prompt` writes files.** The LLM translation prompt is now written
    to Markdown files under `clean-jsdoc-theme-artifacts/locales/prompts/` (chunked,
    git-ignored, regenerated each run) instead of being dumped to the console — so
    you can paste or upload each file straight into an LLM.
  - **Unicode-aware heading anchors.** `slugifyHeading` / `slugifyPath` /
    `slugifySourcePath` now keep non-ASCII letters (and recompose to NFC), so Hindi,
    Japanese, and CJK headings get meaningful anchors, a working TOC, and valid
    `#fragment` links. Latin accent folding (`café → cafe`) is preserved.
  - **Sidebar TOC fix.** The active TOC entry is scrolled into view on long tables
    of contents.
  - **Maintenance.** Package version constants are derived from `package.json` at
    build time (no more drift), and the package READMEs were refreshed to match the
    current code.

- 32a34f0: Custom footer restored (`opts.footer`).

  v4's custom footer is back as `opts.footer`, accepting an inline HTML string or
  `{ file: "./footer.html" }`. The bridge resolves the union (reading the file
  form from disk) and threads the resolved string to `ThemeConfig.footer`, so the
  setu→dwar boundary stays a plain string and `render()` stays pure. rang's footer
  slot renders the author HTML verbatim in place of the default footer; style it
  with `customCss` / `customCssFile`.

- b623df9: Custom `<meta>` injection restored (`opts.meta`).

  v4's custom `<meta>` tags are back as `opts.meta` — an array of attribute maps
  (`{ name, content }`, `{ property, content }`, `{ charset }`, …), each rendered
  as a `<meta>` tag in every page's `<head>`. dwar emits its own defaults
  (charset, viewport, the auto description) first, then the author entries,
  de-duping by identifying attribute (`name` / `property` / `http-equiv` /
  `charset`) so an author `description` replaces the auto one. Values are escaped
  and invalid attribute names dropped; `render()` does no I/O for it.

### Patch Changes

- 768cd9e: v5 alpha release to test end to end pipeline
- Updated dependencies [8221bc8]
- Updated dependencies [61a6b67]
- Updated dependencies [8b45c63]
- Updated dependencies [768cd9e]
- Updated dependencies [3c6fc7c]
- Updated dependencies [32a34f0]
- Updated dependencies [b623df9]
  - @clean-jsdoc-theme/bhasha@5.0.0
  - @clean-jsdoc-theme/utils@5.0.0
  - @clean-jsdoc-theme/dwar@5.0.0
  - @clean-jsdoc-theme/rang@5.0.0
  - @clean-jsdoc-theme/setu@5.0.0

## 5.0.0-alpha.4

### Minor Changes

- Localization (i18n), prompt-to-file, Unicode anchors, and polish.
  - **Multi-language documentation.** A new localization pipeline renders one static
    site per locale (the default unprefixed, others under `/<locale>`) with a header
    language switcher, `hreflang` alternates, and per-language fonts. Two new
    packages drive it: **`@clean-jsdoc-theme/bhasha`** (the pure, browser-safe i18n
    core — chrome catalog, the `t` translator + fallback chain, `LanguageProvider`,
    and the API-slot key/hash scheme) and **`@clean-jsdoc-theme/aadesh`** (the
    `clean-jsdoc` CLI: `extract` / `prompt` / `validate` / `build`, plus an
    interactive menu). Translatable content spans UI chrome, API
    descriptions/summaries/example captions/parameter + return descriptions, and
    prose (a per-locale `README.<locale>.md` home and a `docs.<locale>/` overlay).
    Opt in with `opts.locales` / `opts.defaultLocale`; a build with no locales stays
    byte-identical. The TypeDoc bridge supports _extract_ today; the localized
    _build_ is JSDoc-only for now.
  - **`clean-jsdoc prompt` writes files.** The LLM translation prompt is now written
    to Markdown files under `clean-jsdoc-theme-artifacts/locales/prompts/` (chunked,
    git-ignored, regenerated each run) instead of being dumped to the console — so
    you can paste or upload each file straight into an LLM.
  - **Unicode-aware heading anchors.** `slugifyHeading` / `slugifyPath` /
    `slugifySourcePath` now keep non-ASCII letters (and recompose to NFC), so Hindi,
    Japanese, and CJK headings get meaningful anchors, a working TOC, and valid
    `#fragment` links. Latin accent folding (`café → cafe`) is preserved.
  - **Sidebar TOC fix.** The active TOC entry is scrolled into view on long tables
    of contents.
  - **Maintenance.** Package version constants are derived from `package.json` at
    build time (no more drift), and the package READMEs were refreshed to match the
    current code.

### Patch Changes

- Updated dependencies
  - @clean-jsdoc-theme/utils@5.0.0-alpha.4
  - @clean-jsdoc-theme/setu@5.0.0-alpha.4
  - @clean-jsdoc-theme/rang@5.0.0-alpha.4
  - @clean-jsdoc-theme/dwar@5.0.0-alpha.4
  - @clean-jsdoc-theme/bhasha@5.0.0-alpha.4

## 5.0.0-alpha.3

### Minor Changes

- 61a6b67: Command palette, callouts, tutorials, and a rebuilt documentation site.
  - **Command palette — recent & favorite searches.** `Ctrl K` now remembers recent
    queries and lets you star favorites (persisted locally). The palette was
    refactored into focused components.
  - **Tutorials nest in the sidebar.** Sub-tutorials render as collapsible groups
    mirroring JSDoc's resolved hierarchy (#253), and `@tutorial` resolves to its
    page through a shared cross-reference resolver.
  - **Callouts everywhere.** Every blockquote renders as a callout (defaulting to
    `info`), and GitHub-style alert blockquotes nested inside lists are promoted
    too.
  - **Rendering fixes.** Anchor jumps land below the sticky header on small
    screens; Home is included in the prev/next reading order (source & menu links
    excluded); grouped badge images no longer add vertical margin; the island
    bundle cache busts when `rang` changes; and the build spinner stays alive
    during long synchronous stages.
  - **Documentation.** A rebuilt docs site — getting-started, guides, authoring
    (callouts / steps / tabs / embeds / custom tags), an FAQ, and per-package
    pages — plus refreshed package READMEs with a theme-aware logo.

### Patch Changes

- Updated dependencies [61a6b67]
  - @clean-jsdoc-theme/utils@5.0.0-alpha.3
  - @clean-jsdoc-theme/setu@5.0.0-alpha.3
  - @clean-jsdoc-theme/rang@5.0.0-alpha.3
  - @clean-jsdoc-theme/dwar@5.0.0-alpha.3
  - @clean-jsdoc-theme/bhasha@5.0.0-alpha.3

## 5.0.0-alpha.2

### Minor Changes

- Assets, theme colors, and synchronized tabs.
  - **Hashed asset pipeline + inline SVGs.** Doc/README images referenced by a relative or root-relative path are now copied into content-hashed `_assets/<name>.<hash><ext>` paths (cache-busting, like the logo and custom CSS/JS), and SVGs are inlined into the page so their `[data-theme="dark"]` styles follow the in-page theme toggle rather than only the OS color scheme. Logos gain the same content hash.
  - **`colors` / `darkColors` options.** Override the light and dark palettes per key (`bg`, `fg`, `accent`, …) from `jsdoc.json` / `typedoc.json`; previously these were silently ignored.
  - **Synchronized tabs.** Tab blocks sharing a `group` now stay in sync across a page and persist the choice (e.g. picking the TypeDoc example switches every example), with a `value` per tab as the sync key. Fixes the active-tab underline being clipped until a scroll.

### Patch Changes

- Updated dependencies
  - @clean-jsdoc-theme/bhasha@5.0.0-alpha.2
  - @clean-jsdoc-theme/utils@5.0.0-alpha.2
  - @clean-jsdoc-theme/dwar@5.0.0-alpha.2
  - @clean-jsdoc-theme/rang@5.0.0-alpha.2
  - @clean-jsdoc-theme/setu@5.0.0-alpha.2

## 5.0.0-alpha.1

### Patch Changes

- 768cd9e: v5 alpha release to test end to end pipeline
- Updated dependencies [768cd9e]
  - @clean-jsdoc-theme/bhasha@5.0.0-alpha.1
  - @clean-jsdoc-theme/utils@5.0.0-alpha.1
  - @clean-jsdoc-theme/dwar@5.0.0-alpha.1
  - @clean-jsdoc-theme/rang@5.0.0-alpha.1
  - @clean-jsdoc-theme/setu@5.0.0-alpha.1

---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
'@clean-jsdoc-theme/typedoc': patch
'@clean-jsdoc-theme/utils': patch
---

Remove the unused Pagefind step and drop `setu` from dwar's dependencies.

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

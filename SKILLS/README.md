# SKILLS

Downloadable, LLM-ready **skills** for working with `clean-jsdoc-theme`. Each skill
is a self-contained directory holding a `SKILL.md` (in the agent-skill format — a
`name` + `description` frontmatter block) that you can drop into a coding assistant
to give it expert, source-verified knowledge of the theme.

They're plain Markdown, so any LLM can read one: attach it to a chat, add it to
your editor's project rules, or — for agents that support skills — copy the folder
into your skills directory (e.g. `.claude/skills/<name>/`).

## Available skills

| Skill | What it does |
| --- | --- |
| [`clean-jsdoc-theme`](./clean-jsdoc-theme/SKILL.md) | The umbrella skill — setup (JSDoc + TypeDoc), the full config reference, authoring (callouts/steps/tabs/embeds/custom tags), images & static assets (local images, `staticFiles`, sitemap), the docs directory + frontmatter, the sidebar model, cross-references, source links, the LLM features, theming, multi-language localization (the `clean-jsdoc` CLI), the package architecture, and gotchas. |
| [`typedoc`](./typedoc/SKILL.md) | A focused **TypeDoc** skill for `@clean-jsdoc-theme/typedoc` — the plugin/output setup, the `cleanJsdocTheme` option block (and which options are, and aren't, wired for TypeDoc), the module-hierarchy sidebar, the TypeDoc document model (standalone enum/function/variable pages, overloads, declaration blocks), and TypeDoc-specific rendering (inheritance sections, `@group`, `@inheritDoc`, `projectDocuments`, object-literal expansion). Defers to the umbrella skill for shared topics. |
| [`migrate-v4-to-v5`](./migrate-v4-to-v5/SKILL.md) | A step-by-step v4 → v5 migration procedure — lift options out of `opts.theme_opts`, rename the ones that carry over, drop the removed ones, reshape the `menu`, and verify the build. Distilled from `MIGRATION.md` + `migration-map.json`. |

## Planned

More focused skills are planned — e.g. building a guides-only site, building an
API reference only, and per-package deep-dives (`setu`, `dwar`, …). Each will live
in its own folder here with a `SKILL.md`.

## Staying current

These skills are versioned alongside the code and verified against the source, so a
fresh copy always matches the theme you're on. Re-download after upgrading the theme
to pick up new options and features. See the **Use with an LLM** page in the docs
site for download and setup instructions.

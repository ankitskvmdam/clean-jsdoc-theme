---
title: Use with an LLM
group: Using the Theme
order: 5
---

# Use with an LLM

This theme is **built for LLMs** — every page ships a companion `.md` and a
"copy / open in Claude · ChatGPT · Perplexity" button. This page is the other
half of that story: a single, downloadable **skill file** that teaches *any*
assistant how to **use and extend `clean-jsdoc-theme` itself**.

It lives in the repo's
[`SKILLS/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/SKILLS)
folder as
[`SKILLS/clean-jsdoc-theme/SKILL.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/SKILLS/clean-jsdoc-theme/SKILL.md).
Hand it to your coding assistant and it stops guessing — it configures the theme,
authors your guides, and structures your sidebar correctly the first time.

> [!NOTE]
> `SKILLS/` is where focused skills will live as the project grows (per-package
> skills, "build a guides site", "build an API reference", …). Today it ships the
> umbrella `clean-jsdoc-theme` skill that covers everything below.

## What it is

`SKILL.md` is a self-contained Markdown document that captures the whole theme in
one place — verified against the source, not the model's memory. It's written in
the **agent-skill** format (a `name` + `description` frontmatter block), so it
drops straight into agents that support skills, but it's just Markdown: any LLM
can read it.

It covers, end to end:

- **Setup** — JSDoc and TypeDoc, with minimal working configs.
- **Every configuration option** — the `opts` / `cleanJsdocTheme` reference, plus
  the JSDoc-only `templates.default` ones.
- **Authoring** — callouts, steps, tabs, embeds, and the `@category` / `@order` /
  `@iframe` custom tags, with the exact syntax rules.
- **The docs directory & frontmatter** — how files become pages.
- **The sidebar model** — the one group/order engine and all its levers.
- **Cross-references and source links**, the **LLM features**, and **theming**.
- **The package architecture** (`utils` · `setu` · `rang` · `dwar`) for anyone
  extending the internals.
- A **gotchas & troubleshooting** section for the mistakes assistants make most.

## Why it matters

`clean-jsdoc-theme` isn't the default JSDoc template, and an assistant working
from generic "JSDoc theme" knowledge will get the details wrong — it'll forget
that [`plugins/markdown`](/theme/jsdoc-getting-started) is required, miss that
custom tags need [`allowUnknownTags`](/authoring/custom-tags), or assume spaces
nest a [`@category`](/authoring/custom-tags) path when only `/` does.

> [!TIP]
> Front-loading the skill turns a back-and-forth ("that option doesn't exist…",
> "try this instead…") into a correct first answer. It's the same idea as the
> companion `.md` the theme emits for *your* docs — give the model the source of
> truth up front and it reads your project as fluently as a person does.

## How to use it

<steps>

<step label="Download it">

Grab the raw file from the repository:

```sh
curl -O https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/SKILLS/clean-jsdoc-theme/SKILL.md
```

Or open
[`SKILL.md` on GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/SKILLS/clean-jsdoc-theme/SKILL.md)
and copy it.

</step>

<step label="Give it to your assistant">

Pick whichever matches your setup:

<tabs group="assistant">

<tab label="Claude Code / agents">

It's a ready-to-use **skill**. Drop it into your project (or user) skills
directory so the agent loads it on demand:

```sh
mkdir -p .claude/skills/clean-jsdoc-theme
mv SKILL.md .claude/skills/clean-jsdoc-theme/SKILL.md
```

The `name` / `description` frontmatter is what lets the agent decide when to
apply it.

</tab>

<tab label="ChatGPT / Claude.ai / Perplexity">

**Attach or paste** `SKILL.md` at the start of a chat, then ask your question:

> _Here is the skill for clean-jsdoc-theme. Using it, set up a `typedoc.json`
> that puts my guides above the API reference in the sidebar._

</tab>

<tab label="Cursor / Copilot / Windsurf">

Add it to your editor's **project rules / context** — e.g. save it as a rule file
(`.cursor/rules/clean-jsdoc-theme.md` or your tool's equivalent), or `@`-mention
the file in chat so it's pulled into context.

</tab>

</tabs>

</step>

<step label="Ask away">

Anything from "write the `jsdoc.json` for a guides-only site" to "why is my
`@category` showing two groups?" now gets an answer grounded in how the theme
actually works.

</step>

</steps>

## Keep it current

`SKILL.md` is versioned alongside the code (it carries a `skill-revision` stamp)
and verified against the source, so a fresh copy always matches the theme you're
on. The skill also **teaches the assistant to check for updates** — when relevant,
and at most once per session, it compares its revision against the published copy
and your installed theme version against npm's latest, and offers to update if
either is behind. Re-download it after upgrading the theme to pick up new options
and features.

## See also

- [Configuration](/theme/configuration) — the same options the skill documents,
  rendered as a browsable reference.
- [JSDoc Getting Started](/theme/jsdoc-getting-started) ·
  [TypeDoc Getting Started](/theme/typedoc-getting-started) — set up the build.
- [Structure your sidebar](/guides/structure-your-sidebar) and
  [Authoring](/authoring/callouts) — the deep dives the skill condenses.

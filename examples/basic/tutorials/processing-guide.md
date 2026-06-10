# Configuration

All theme options live under `opts` in your `jsdoc.json`. This page also
exercises a few GitHub-flavored Markdown features — a table and a task list —
to confirm they render.

## Options

| Option        | Type             | Description                                   |
| ------------- | ---------------- | --------------------------------------------- |
| `siteName`    | string \| object | Header/footer text, or a per-theme logo set.  |
| `readme`      | string           | Markdown file rendered as the home page.      |
| `tutorials`   | string           | Directory of `.md` / `.html` tutorial files.  |
| `fonts`       | object           | `heading` / `body` / `mono` family overrides. |
| `destination` | string           | Output directory for the generated site.      |

## Checklist

- [x] Install JSDoc and the theme
- [x] Point `opts.template` at the theme
- [ ] Add a `siteName` logo
- [ ] Publish the `dist/` output

For per-page customization beyond these options, continue to
[Advanced Usage](advanced-usage).

---
title: Configuration
group: Guide
order: 2
---

# Configuration

To localize the prose pages, create a sibling directory per locale next to your
docs folder and translate the files you want:

```
docs/                  # default-language docs
  getting-started.md
  configuration.md
docs.ja/               # Japanese overlay
  getting-started.md
  configuration.md
docs.hi/               # Hindi overlay (partial — falls back for the rest)
  getting-started.md
```

A locale only needs the pages it actually translates; any file missing from the
overlay falls back to the default `docs/` version. (This page is translated for
Japanese but not Hindi, so the Hindi site shows this English text — that's the
fallback in action.)

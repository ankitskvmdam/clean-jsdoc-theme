# CLI Flags

This file has **no YAML frontmatter at all**. It proves the fallbacks:

- Its **group** falls back to the humanized parent directory — `reference/` →
  **"Reference"**.
- Its **title** falls back to the humanized filename — `cli-flags` →
  **"Cli Flags"**.
- Its **slug** is the relative path — `/reference/cli-flags`.

Because there is no frontmatter `order`, it sorts after any page in the same
group that does set one.

## A few flags

```sh
jsdoc -c jsdoc.json        # build using the config
jsdoc -t clean-jsdoc-theme # select the theme directly
```

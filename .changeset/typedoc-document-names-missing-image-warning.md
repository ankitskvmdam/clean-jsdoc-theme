---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/typedoc': patch
---

TypeDoc: the names of `projectDocuments` that span directories are POSIX-normalised, so a `cleanJsdocTheme.docs` page at the same path wins the collision on Windows too (and the losing document's images are no longer copied). A missing image in a project document is now reported once, by TypeDoc's own "relative path … is not a file" warning (so `validation.invalidPath` governs it), in both normal and `entryPointStrategy: "packages"` mode (#397).

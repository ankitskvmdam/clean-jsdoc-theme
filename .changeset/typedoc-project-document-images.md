---
'@clean-jsdoc-theme/typedoc': patch
---

Copy the local images of TypeDoc project documents into `_assets/` (#378).

A page from `projectDocuments` or `@document` kept its local image srcs
(`![](./pic.png)`, raw `<img src="./pic.png">`) verbatim, so the image was never
copied and showed broken. These images now go through the same content-hashed
`_assets/` pipeline as the `docs` directory, resolved relative to the document's
own file, with `basePath` applied once.

---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

Hide a `@private` constructor on a class tagged `@public`, `@protected` or `@package` (#373).

A class comment with an explicit access tag (or `@access …`) and a `@private`
ES6 `constructor` still showed the Constructor section, the constructor's
description and parameters, and its other tags such as `@since`. The class page
now keeps its Modifiers line and hides only the constructor, as it already did
for a class with no access tag. A public constructor on such a class is still
shown, and `--private` shows the private one again. The TypeDoc flavor is unchanged.

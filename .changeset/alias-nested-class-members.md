---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

Show the members of a nested class documented with `@alias` (#374).

JSDoc leaves the methods, getters, statics, nested classes, events and typedefs
of an aliased `Ns.Foo = class {…}` (or an aliased ES5 `Ns.Foo = function`, or an
aliased class exported from a `@module`) under the original name, so the alias
page showed only its constructor and fields. They now appear on the alias page,
and links by either name (`{@link Ns.Foo#m}`, `{@link Other#m}`) resolve there.
An aliased global class is no longer listed as a member of its original
namespace. The TypeDoc flavor is unchanged.

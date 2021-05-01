## Change Log

### In version 3.2.7

### Bug Fix

1. Fix: quotes issue for codepen options.
1. Fix: source is not printing if source is the only key. (#71)[https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/71]
1. Fix (css): font size of return type. (#70)[https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/70]

### In version 3.2.6

### Feature

1. Add an option to open code in codepen.

### Bug Fix

1. Fix the css of example caption. [View changes.](https://github.com/ankitskvmdam/clean-jsdoc-theme/commit/1cba9400a6d9ae2991eb5b32282e7572510656c6)
1. Fix the overflow css of code section. [View changes.](https://github.com/ankitskvmdam/clean-jsdoc-theme/commit/1cba9400a6d9ae2991eb5b32282e7572510656c6)
1. Fix the css of code block in dark theme.

### In version 3.2.4

### Bug Fix

1. When the codebase is large then search didn't works. [#68](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/68)

### In version 3.2.3

### Bug Fix

1. On mobile screen navbar, main content and footer are not as expected after applying resize.

### In version 3.2.1

### Feature

1. Now there is an option to make navbar resizeable.

### In version 3.2.0

### Bug Fix

1. When passing HTML as title then there is NPM Error. In this release that error is fixed.

### Others

1. Remove filter support.

### In version 3.1.2

### New

1. Change ham animation.

### Others

1. Update readme file.

### In version 3.1.0

### Bug fixes

1. fix unclosed <div> in method.tmpl [#63](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/63)

### New

1. Add brand new light and dark theme.
1. Add collapsible main section in navbar.

### Refactor

1. Refactor css and js to improve performance.

### In version 3.0.10

### Bug Fixes

1. Previously, we are enforcing below templates:

```js
// jsdoc config file
// ...other options.
  templates: {
    cleverLinks: true,
    monospaceLinks: false,
    default: {
        outputSourceFiles: false,
    }
  },
```

In this release we removed this template rule.

### In version 3.0.9

#### Bug Fixes

1. On Mobile screen the ham icon is not visible. That is solved in this release.
2. Fix: Tooltip copied text color.
3. Fix: When copied code, `JAVASCRIPT\nCopied!` also got attached with it.

### In version 3.0.8

#### Feature

1. Add support for `@see` documentation link. [#59](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/59)

## In version 3.0.7

### Feature

1. Now left panel classes and modules can be collapse. [Feature Request #57](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/57)

## In version 3.0.6

### Bug Fix

1. Fix body overflow.
1. Fix css for table.

## In version 3.0.4

### New

1. Update `search`. Now instead of boolean it accepts an object. This object is used to configure search. [fuse.js options](https://fusejs.io/api/options.html)

## In version 3.0.2

### Bug Fix

1. Simplify the meta/script/link declaration [Pull Request: [#56](https://github.com/ankitskvmdam/clean-jsdoc-theme/pull/56)] [Thanks to [GMartigny](https://github.com/GMartigny)]

## In version 3.0.0

### New

1. Add an option to include css files.
1. Add an option to add js.
1. Add an option to include static folder.
1. OverlayScrollbar are now supported by default. If you don't want to use it pass an option to disable it.

### Breaking changes

1. `add_script_path` previously you have to pass an array of string but now you have to pass an array of object where keys are the attributes of the script tag
1. `add_style_path` previously you have to pass an array of string but now you have to pass an array of object where keys are the attributes of the link tag
1. `meta` previously you have to pass an array of string but now you have to pass an array of object where keys are the attributes of the meta tag

## In version 2.2.15

### New

1. Scrollable code area

## In version 2.2.14

### Bug Fix

1.  Malformed HTML when parsing 'default' JSDoc tags [issue: [#48](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/48)]

## In version 2.2.13

### New

1.  Make the # before members and methods a clickable anchor. [pull request: [#44](https://github.com/ankitskvmdam/clean-jsdoc-theme/pull/44)] [Thanks to [GMartigny](https://github.com/GMartigny)]

### Other

1.  Change jsdoc into a peerDependency [pull request: [#45](https://github.com/ankitskvmdam/clean-jsdoc-theme/pull/45)][Thanks to [GMartigny](https://github.com/GMartigny)]

## In version 2.2.12

### New

1.  Add dark theme.

### Bug fix

1.  Fix typescript-eslint camelCase rule issue [issue: [#37](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/37)]
1.  Fix ordered list style [issue: [#40](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/40)]
1.  Fix code overflow issue.

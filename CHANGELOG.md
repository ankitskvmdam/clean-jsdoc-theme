## Change Log

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

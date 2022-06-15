# clean-jsdoc-theme

[![Stars](https://img.shields.io/github/stars/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme) [![Fork](https://img.shields.io/github/forks/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/fork) ![Version](https://img.shields.io/badge/version-4.0.5-005bff) [![Issues Open](https://img.shields.io/github/issues/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues) [![Contributors](https://img.shields.io/github/contributors/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/graphs/contributors) [![Build Status](https://travis-ci.org/ankitskvmdam/clean-jsdoc-theme.svg?branch=production)](https://travis-ci.org/ankitskvmdam/clean-jsdoc-theme) [![license](https://img.shields.io/github/license/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE)
<br>

clean-jsdoc-theme is a beautifully crafted theme for JSDoc 3. It is a clean and fully responsive theme with loads of customisation features.

Some salient features:

1. It supports most screens, i.e., desktops, laptops, iPad and mobile devices.
1. It has a premium-looking dark and light theme.
1. It minifies all the output HTML files (this helps in saving a few KBs).
1. It has search support. The search feature doesn't increase the size of output HTML files.
1. It updates regularly.
1. It is highly performant. [Check lighthouse report here](https://googlechrome.github.io/lighthouse/viewer/?psiurl=https%3A%2F%2Fankdev.me%2Fclean-jsdoc-theme%2Fv4%2Findex.html&strategy=desktop&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa&utm_source=lh-chrome-ext).

We know that no library is perfect. That's why we are open to hearing from the community about the theme. For any suggestions, questions or bugs, feel free to create an <a href="https://github.com/ankitskvmdam/clean-jsdoc-theme/issues">issue</a>.

## Demo

1. To view this theme, visit [https://ankdev.me/clean-jsdoc-theme/v4](https://ankdev.me/clean-jsdoc-theme/v4).

1. If you want to see a demo repo to set up this theme, visit [https://github.com/ankitskvmdam/clean-jsdoc-theme-example](https://github.com/ankitskvmdam/clean-jsdoc-theme-example). This repo will guide you step by step on how to setup jsdoc and clean-jsdoc-theme in your existing repo.

## Screenshots

![Dark theme](./example/screen-1.png)
![Light theme](./example/screen-2.png)
![Mobile View](./example/screen-3.png)
![Search view](./example/screen-4.png)
![Class page](./example/screen-5.png)
![Code page](./example/screen-6.png)

## Installation

> Note you must have `node` and `npm` installed on your machine.

On your command line type

```bash
npm install clean-jsdoc-theme --save-dev
# or
yarn add clean-jsdoc-theme -D
```

In your projects `package.json` file add a generate script. You need to run this script when you want to generate documentation.

```json
"script": {
  "generate-docs": "jsdoc --configure jsdoc.json --verbose"
}
```

In your `jsdoc.json` file, add a template option.

```json
"opts": {
  "template": "node_modules/clean-jsdoc-theme"
}
```

> Heads Up! In the `generate_docs` script, there is a configure option. The value of that option is `jsdoc.json`. Make sure the `jsdoc.json` file exists. `jsdoc.json` contains configurations for JSDoc. If you have your JSDoc config in a different file, replace `jsdoc.json` with the name of the file in which you have your JSDoc config.

Now to generate docs run

```bash
npm run generate-docs
```

For more information look at [https://github.com/ankitskvmdam/clean-jsdoc-theme-example](https://github.com/ankitskvmdam/clean-jsdoc-theme-example)

## Example JSDoc Config

```json
{
    "source": {
        "include": ["lib", "package.json", "README.md"],
        "includePattern": ".js$",
        "excludePattern": "(node_modules/|docs)"
    },

    "plugins": ["plugins/markdown"],

    "opts": {
        "encoding": "utf8",
        "readme": "./README.md",
        "destination": "docs/",
        "recurse": true,
        "verbose": true,
        "template": "./node_modules/clean-jsdoc-theme",
        "theme_opts": {
            "default_theme": "dark"
        },
        "markdown": {
            "hardwrap": false,
            "idInHeadings": true // This is important for clean-jsdoc-theme, otherwise some features might not work.
        }
    }
}
```

## Options

### Set a default theme

To set the default theme add the following in your jsodc config file:

```json
"theme_opts": {
  "default_theme": "dark" // or "light"
}
```

### Set base url

If you want to set the base url:

```json
"theme_opts": {
  "base_url": "https://ankdev.me/v4/"
}
```

> Make sure to add the ending forward slash (`/`).

If you are using search feature then make sure to add `base_url`, otherwise your search query might fail.

### Add favicon

To set favicon add the following in your jsodc config files.

```json
"theme_opts": {
 "favion": "path/to/img"
}

```

You can use [`static_dir`](#add-static-dir) option to copy all you static files to output dir and use that path in place of `path/to/img`.

### Add title

Both strings and HTML are accepted; use HTML to overwrite the default HTML, and a string to set a plaintext title. One example of this is below:

```json
"theme_opts": {
  "title": "<img src='path/to/img' class='my-custom-class'/>" // or "title": "clean-jsodc-theme"
}
```

You can use [`static_dir`](#add-static-dir) option to copy all you static files to output dir and use that path in place of `path/to/img`.

### Add navbar menu

To render extra link(s) in navbar. It accepts an array of objects:

```json
"theme_opts": {
  "menu" : [
    {
      "title": "Website",
      "link": "https://ankdev.me/clean-jsdoc-theme/dark/",
      "target": "_blank",
      "class": "some-class",
      "id": "some-id"
    },
    {
      // more if you want to.
    }
  ]
}
```

`menu` is an array of object. Each object has five properties, out of which two are required (`title` and `link`). If any object doesn't have the required properties then you might expect an error.

<b>Properties</b>

| name     | type     | required |
| -------- | -------- | -------- |
| `title`  | `string` | required |
| `link`   | `string` | required |
| `target` | `string` | optional |
| `class`  | `string` | optional |
| `id`     | `string` | optional |

### Sections

There is an option to order the occurrence of sections in the sidebar. You can use this option to hide/remove any section.

```json
"theme_opts": {
  "sections": ["Classes", "Modules", "Global"] // Only three members will be in the sidebar.
}
```

```js
// SECTION_TYPE
[
    'Classes',
    'Modules',
    'Externals',
    'Events',
    'Namespaces',
    'Mixins',
    'Tutorials',
    'Interfaces',
    'Global',
];
```

### Meta

There is also an option to add meta tag to every generated HTML file. You can use `meta` option to include a list of `meta` tags into `head`.

```json
"theme_opts": {
  "meta" : [
    {
      "name": "author",
      "content": "Ankit Kumar"
    },
    {
      "name": "description",
      "content": "Best Clean and minimal JSDoc 3 Template/Theme"
    }
  ]
}
```

`meta` is an array of object. Each objects can have any valid combination of [HTML metadata attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#Attributes).

### Search

By default, the search feature is available in the theme. If you don't want the search feature, you can do the following:

```json
"theme_opts": {
  "search": false
}
```

> Make sure you have added the `base_url` option as well, otherwise your search query might fail.

How does the search work?
If the search feature is enabled, you'll see a `data` folder in the output. This `data` folder contains a JSON called `search.json`. There is a fetch request when user types anything in the search box. That means search data is only loaded if user wants to search anything.

### CodePen

> Note: Currently this feature is only enabled for the examples section.

```json
"theme_opts": {
  "codepen": {
    "enable_for": ["examples"],
    "options": {
      "js_external": "https://code.jquery.com/jquery-3.6.0.min.js",
      "js_pre_processor": "babel"
    }
  }
}
```

`options` can be any valid CodePen options. For more visit: [Codepen Prefill options](https://blog.codepen.io/documentation/prefill/#all-the-json-options-0)

### Add static dir

To include static files:

```json
"theme_opts": {
  "static_dir": ["./static"],
}
```

### Add styles

To create custom style rules. Example:

```json
"theme_opts" {
  "create_style": ".sidebar-title { font-size: 2rem }"
}
```

### Add style paths

Use this option to add third party css library. If you want to add your own custom css file then consider using [Add custom css files](#add-custom-css-files)

> Note: You have to pass an array of object, and object keys are actually the attributes which you want in you link tag.

Example:

```json
"add_style_path": [
  {
    "href": "https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/css/bootstrap.min.css",
    "integrity": "sha384-giJF6kkoqNQ00vy+HMDP7azOuL0xtbfIcaT9wjKHr8RbDVddVHyTfAAsrekwKmP1",
    "crossorigin": "anonymous"
  }
],
```

### Add custom css files

To include css files. Example:

```json
"theme_opts" {
  "include_css": ["./static/index.css", "./src/docs/index.css"]
}
```

> Note: You are not required to manually copy file to output dir

It will include the css files to the output dir and also attach a link tag to the html pointing to the included css file.

### Add scripts

To create custom scripts. Example:

```json
"theme_opts": {
  "add_scripts": "function foo(){console.log('foo')} function bar() {console.log('bar')}"
}
```

### Add script paths

Use this option to add third party js library. If you want to add your own custom script file then consider using [Add custom script files](#add-custom-script-files)

> Note: You have to pass an array of object, and object keys are actually the attributes which you want in you script tag.

Example:

```json
"add_script_path": [
  {
    "href": "https://code.jquery.com/jquery-3.5.1.js",
    "integrity": "sha256-QWo7LDvxbWT2tbbQ97B53yJnYU3WhH/C8ycbRAkjPDc=",
    "crossorigin": "anonymous"
  }
],
```

This will copy the static folder to the output dir.

> Note: If the directory doesn't exists then you may get an error. Also directory is relative to your jsdoc config file.

This will not flatten the directory it keep the directory structure as it is.

### Add custom script files

To include js files. Example:

```json
"theme_opts": {
  "include_js": ["./static/index.js", "./src/docs/index.js"]
}
```

> Note: You are not required to manually copy file to output dir

It will include the js files to the output dir and also attach a script tag to the html pointing to the included js file.

### Footer

```json
"theme_opts": {

  "footer": "This is footer" // or <div class="footer-wrapper">This is a footer </div>
}
```

### To exclude inherited

To exclude inherited symbols. Example:

```json
"exclude_inherited": true
```

This will remove all symbols (members, methods ...) that come from inherited parents.

## Cheat sheet

| name                | default                                                                                                      | use case                                                                   | expected value(s)     |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------- |
| `default_theme`     | `"dark"`                                                                                                     | To set the default theme                                                   | `"light" or "dark"`   |
| `title`             | `null`                                                                                                       | To set the title                                                           | `HTML` or `string`    |
| `menu`              | `null`                                                                                                       | To render extra link in navbar                                             | Array of Object(s)    |
| `meta`              | `null`                                                                                                       | Meta tag attributes                                                        | Array of Object(s)    |
| `search`            | `true`                                                                                                       | To render search or not                                                    | `true` or `false`     |
| `codepen`           | `{}`                                                                                                         | To open code in codepen                                                    | `Object`              |
| `static_dir`        | `null`                                                                                                       | To include static dir                                                      | Array of string       |
| `create_style`      | `null`                                                                                                       | To create custom style rules                                               | `string`              |
| `add_style_path`    | `null`                                                                                                       | To add external css libraries/files                                        | Array of Object(s)    |
| `include_css`       | `null`                                                                                                       | To include css files                                                       | Array of string       |
| `add_scripts`       | `null`                                                                                                       | To create custom script                                                    | `string`              |
| `add_script_path`   | `null`                                                                                                       | To add external js libraries/files                                         | Array of Object(s)    |
| `include_js`        | `null`                                                                                                       | To include js files                                                        | `string`              |
| `footer`            | `null`                                                                                                       | To render footer                                                           | `HTML` or `string`    |
| `exclude_inherited` | `false`                                                                                                      | To exclude inherited symbols                                               | `boolean`             |
| `sections`          | `["Modules", "Classes", "Externals", "Events", "Namespaces", "Mixins", "Tutorials", "Interfaces", "Global"]` | To order navbar/sidebar sections or to hide/remove navbar/sidebar sections | `Array<SECTION_TYPE>` |

## Changelog

Changelog is moved to [https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/CHANGELOG.md](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/CHANGELOG.md)

## Developing

Before starting please go through our [contributing guide](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/CONTRIBUTING.md).

```bash
git clone https://github.com/ankitskvmdam/clean-jsdoc-theme.git
cd clean-jsdoc-theme
npm install
npm install jsdoc --no-save
npm run build
```

`npm run build` will generate files in output folder.

## Contributors

<a href="https://github.com/ankitskvmdam/clean-jsdoc-theme/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ankitskvmdam/clean-jsdoc-theme" alt="clean-jsdoc-contributors" />
</a>

## Thanks

Thanks to [fuse.js](https://fusejs.io/), [hljs](https://highlightjs.org/),[tippy.js](https://tippyjs.bootcss.com/), and all awesome contributors.

## Contact

If you like my work, then give me a <a href="https://github.com/ankitskvmdam/clean-jsdoc-theme" data-icon="octicon-star" aria-label="Star ankitskvmdam/clean-jsdoc-theme on GitHub">star</a>.

Mail me at: <a href="mailto:hello@ankdev.me">hello@ankdev.me</a> <br>

## License

Licensed under the MIT license.

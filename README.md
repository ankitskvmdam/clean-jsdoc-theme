# clean-jsdoc-theme
[![Stars](https://img.shields.io/github/stars/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme) [![Fork](https://img.shields.io/github/forks/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/fork) ![Version](https://img.shields.io/badge/version-2.2.7-%23007bff) [![Issues Open](https://img.shields.io/github/issues/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues) [![Isses Closed](https://img.shields.io/github/issues-closed/ankitskvmdam/clean-jsdoc-theme?color=%234caf50)](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues?q=is%3Aissue+is%3Aclosed) [![Contributors](https://img.shields.io/github/contributors/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/graphs/contributors) [![npm downloads](https://img.shields.io/npm/dt/clean-jsdoc-theme)](https://www.npmjs.com/package/clean-jsdoc-theme) [![Build Status](https://travis-ci.org/ankitskvmdam/clean-jsdoc-theme.svg?branch=production)](https://travis-ci.org/ankitskvmdam/clean-jsdoc-theme) [![lisence](https://img.shields.io/github/license/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE) [![Website Official](https://img.shields.io/website?up_message=official&url=https%3A%2F%2Fankdev.me%2Fclean-jsdoc-theme)](https://ankdev.me/clean-jsdoc-theme/index.html) [![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-hindi-%23007bff)](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/CODE_OF_CONDUCT_HINDI.md) [![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-english-%234caf50)](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/CODE_OF_CONDUCT.md)

<!--
[![Build Status](https://travis-ci.org/ankitskvmdam/clean-jsdoc-theme.svg?branch=production)](https://travis-ci.org/ankitskvmdam/clean-jsdoc-theme) 
<a class="github-button" href="https://github.com/ankitskvmdam/clean-jsdoc-theme" data-icon="octicon-star" aria-label="Star ankitskvmdam/clean-jsdoc-theme on GitHub">Star</a> <a class="github-button" href="https://github.com/ankitskvmdam/clean-jsdoc-theme/fork" data-icon="octicon-repo-forked" aria-label="Fork ankitskvmdam/clean-jsdoc-theme on GitHub">Fork</a> <a class="github-button" href="https://github.com/ankitskvmdam" aria-label="Follow @ankitskvmdam on GitHub">Follow @ankitskvmdam</a> <a class="github-button" href="https://github.com/sponsors/ankitskvmdam" data-icon="octicon-heart" aria-label="Sponsor @ankitskvmdam on GitHub">Sponsor</a> <a class="github-button" href="https://github.com/ankitskvmdam/clean-jsdoc-theme/archive/master.zip" data-icon="octicon-cloud-download" aria-label="Download ankitskvmdam/clean-jsdoc-theme on GitHub">Download</a>
-->
<br>


A beautifully crafted theme/template for JSDoc 3. We have built this theme/template to bring the best user experience. This theme/template looks and feels like a premium theme/template. This is a fully mobile responsive theme and also fully customizable theme (for more look below in <a href="#features">feature section</a>).<br>

We give extra care on every part of this theme/template, like instead of using a simple search mechanism we have used one of the most advance search technology <a href="https://fusejs.io/">Fuse.js</a>.<br>

Although, we have given extra care on every part, we know that there might be some part that we didn't cover in our documentation or there might be some bug in our code or there might some feature missing. Feel free to raise <a href="https://github.com/ankitskvmdam/clean-jsdoc-theme/issues">issues</a>, we have a very proactive community ready to solve issues as soon as possible. <br>
Live demo: https://ankdev.me/clean-jsdoc-theme/index.html

### Demo screen
![Screen-1](./example/screen-1.png)
![Screen-2](./example/screen-2.png)
![Screen-3](./example/screen-3.png)
![Screen-4](./example/screen-4.jpg)

## Install
> Note you must have `npm` installed on your machine.

On your command line type
```bash
npm install clean-jsdoc-theme
```

## Usage
Clone repository to your designated jsdoc template directory, then

```bash
jsdoc entry-file.js -t path/to/clean-jsdoc-theme
```

## Node.js Dependency
In your projects package.json file add a generate script
```json
"script": {
  "generate-docs": "node_modules/.bin/jsdoc --configure .jsdoc.json --verbose"
}
```

In your `jsdoc.json` file, add a template option.

```json
"opts": {
  "template": "node_modules/clean-jsdoc-theme"
}
```


## Example JSDoc Config
```json
{
    "source": {
        "include": ["lib", "package.json", "README.md"],
        "includePattern": ".js$",
        "excludePattern": "(node_modules/|docs)"
    },

    "plugins": [
        "plugins/markdown"
    ],

    "opts": {
        "encoding": "utf8",
        "readme": "./README.md",
        "destination": "docs/",
        "recurse": true,
        "verbose": true,
        "template": "./node_modules/clean-jsdoc-theme"
    }
}
```

## Features
We believe in giving freedom to the developer, that's why we have given many options to 
the developer to customize this theme according to their needs.
You can pass an object called `theme_opts` under `opts` for more options like:
```javascript
"opts":{
  /*
    Default options
  */
  "theme_opts":{
    "title": "clean-jsdoc-theme", 
    /* 
      Instead of only string you can pass html element like 
      <img src="src to your img relative to the output path" class="my-custom-class"/>
      Path must be relative to the output file (relative to generated html files.) you 
      can use the absolute path.
      Note: If you use html the default overwrite. Also for custom class you have to create 
      a class using create_style.This is shown below.
    */

   "filter": false, /*  The default value is true. This will turn the color of image white. 
      If you did not want any
      filter set it to false.
   */

  // Adding additional menu.
  "menu": [
    {
      "title": "Website", //You have to give title otherwise you get error.
      "link": "https://ankdev.me/clean-jsdoc-theme/index.html", // You have to give link otherwise you get error.
      // Below properties are optional.
      "target": "_blank",
      "class": "some-class",
      "id": "some-id"
    },
    {
      "title": "Github",
      "link": "https://github.com/ankitskvmdam/clean-jsdoc-theme/",
      "target": "_blank",
      "class": "some-class",
      "id": "some-id"
    }
  ]
  
  // You can pass meta options also
  "meta": [
      "<meta name=\"author\" content=\"Ankit Kumar\">", 
      "<meta name=\"description\" content=\"Best Clean and minimal JSDoc 3 Template / Theme\">"
    ],
  // You can create custom style which will overwrite the exisiting class property.
  "create_style": "nav{background: yellow}" +     // This will change the background color of sidebar.
                  ".my-custom-class{ filter: brightness(10) grayscale(100%)}", // This will apply filter to my-custom-class
  
  //You can add path of your style file. Note it must be relative to your output file. (relative to generated html files.)
  "add_style_path": ["../custom.css"], // Pass array of path or url

  // You can add custom script to html
  "add_scripts": "function foo(){console.log('foo')}",

  // You can add path of your script file. Note it must be relative to your output file. (relative to generated html files.)
  "add_script_path": ["../custom.js"], // Pass array of path or url
  
  "footer": "This is footer",   // Here again you can pass html element 
  }
}
```

## Developing
```bash 
git clone https://github.com/ankitskvmdam/clean-jsdoc-theme.git
cd clean-jsdoc-theme
npm install
npm run test
```
`npm run test` will generate files in output folder.

## Contact
If you like our work, then give us a <a href="https://github.com/ankitskvmdam/clean-jsdoc-theme" data-icon="octicon-star" aria-label="Star ankitskvmdam/clean-jsdoc-theme on GitHub">star</a>. This will act as a driving force to add new feature more frequently. <br>
Mail us at: hello@ankdev.me <br>


## License
Licensed under the MIT license.

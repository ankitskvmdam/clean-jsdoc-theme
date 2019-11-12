# clean-jsdoc-theme
A clean, responsive template / theme for JSDoc 3. This is created for those who love design. <br>
You can also search in your documenation. This theme / template include search. It uses fuse.js for search.<br/>
live demo: https://ankdev.me/clean-jsdoc-theme/index.html
### Demo screen
![Global](./example/global.png)
![code](./example/code.png)

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
You can pass an object called `theme_opts` under `opts` for more options like:
```javascript
"opts":{
  /*
    Default options
  */
  "theme_opts":{
    "title": "Ankdev", 
    /* 
      Instead of only string you can pass html element like <img src="src to your img relative to the output path" class="my-custom-class"/>
      Path must be relative to the output path of the generated file or you can use the absolute path.
      Note: If you use html the default overwrite. Also for custom class you have to create a class using create_style. This is shown below.
    */

   "filter": false, /*  The default value is true. This will turn the color of image white. If you did not want any
     filter set it to false.
   */
  
  /*
    You can create custom style which will overwrite the exisiting class property.
  */ 
  "create_style": "nav{background: yellow}" +     // This will change the background color of sidebar.
                  ".my-custom-class{ filter: brightness(10) grayscale(100%)}", // This will apply filter to my-custom-class
  
  "footer": "This is footer",   // Here again you can pass html element 
  }
}
```
If this documentation is not enough feel free to create an issue.

## Developing
```bash 
git clone https://github.com/ankitskvmdam/clean-jsdoc-theme.git
cd clean-jsdoc-theme.git
npm install
npm run test
```
`npm run test` will generate files in output folder.
You can change the code and then run `npm run test` to see the output.

## Contact
Mail me at: hello@ankdev.me <br>
If you find any bug or need any feature in the future build feel free to open an issue at github: https://github.com/ankitskvmdam/clean-jsdoc-theme/issues


## License
Licensed under the MIT license.

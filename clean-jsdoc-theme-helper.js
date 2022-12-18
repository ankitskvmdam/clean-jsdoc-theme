const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')

function copyToOutputFolder(filePath, outdir) {
    var filePathNormalized = path.normalize(filePath);

    fs.copyFileSync(filePathNormalized, outdir);
}

function copyToOutputFolderFromArray(filePathArray, outdir) {
    var i = 0;
    var outputList = [];

    if (Array.isArray(filePathArray)) {
        for (; i < filePathArray.length; i++) {
            copyToOutputFolder(filePathArray[i], outdir);
            outputList.push(path.basename(filePathArray[i]));
        }
    }

    return outputList;
}

function buildFooter(themeOpts) {
    var footer = themeOpts.footer;

    return footer;
}

function moduleHeader(themeOpts) {
    var displayModuleHeader = themeOpts.displayModuleHeader || false;

    return displayModuleHeader;
}

function getFavicon(themeOpts) {
    var favicon = themeOpts.favicon || undefined;

    return favicon;
}

// function copy
function createDynamicStyleSheet(themeOpts) {
    var styleClass = themeOpts.create_style || undefined;
    /* prettier-ignore-start */

    return styleClass;
}

function createDynamicsScripts(themeOpts) {
    var scripts = themeOpts.add_scripts || undefined;

    return scripts;
}

function returnPathOfScriptScr(themeOpts) {
    var scriptPath = themeOpts.add_script_path || undefined;

    return scriptPath;
}

function returnPathOfStyleSrc(themeOpts) {
    var stylePath = themeOpts.add_style_path || undefined;

    return stylePath;
}

function includeCss(themeOpts, outdir) {
    var stylePath = themeOpts.include_css || undefined;

    if (stylePath) {
        stylePath = copyToOutputFolderFromArray(stylePath, outdir);
    }

    return stylePath;
}

function resizeable(themeOpts) {
    var resizeOpts = themeOpts.resizeable || {};

    return resizeOpts;
}

function codepen(themeOpts) {
    var codepenOpts = themeOpts.codepen || {};

    return codepenOpts;
}

function includeScript(themeOpts, outdir) {
    var scriptPath = themeOpts.include_js || undefined;

    if (scriptPath) {
        scriptPath = copyToOutputFolderFromArray(scriptPath, outdir);
    }

    return scriptPath;
}

function getMetaTagData(themeOpts) {
    var meta = themeOpts.meta || undefined;

    return meta;
}

function getTheme(themeOpts) {
    var theme = themeOpts.default_theme || 'dark';

    return theme;
}

function getBaseURL(themeOpts) {
    return themeOpts.base_url;
}

function copyStaticFolder(themeOpts, outdir) {
    var staticDir = themeOpts.static_dir || undefined;

    if (staticDir) {
        for (var i = 0; i < staticDir.length; i++) {
            var output = path.join(outdir, staticDir[i]);

            fse.copySync(staticDir[i], output);
        }
    }
}


module.exports = {
    buildFooter,
    moduleHeader,
    codepen,
    createDynamicStyleSheet,
    createDynamicsScripts,
    getBaseURL,
    getFavicon,
    getMetaTagData,
    getTheme,
    includeCss,
    includeScript,
    resizeable,
    returnPathOfScriptScr,
    returnPathOfStyleSrc,
    copyStaticFolder
}
'use strict';

// JSDoc resolves templates via require(templateDir + '/publish'), bypassing
// package.json main/exports. This file proxies to the compiled output.
module.exports = require('./dist/publish.js');

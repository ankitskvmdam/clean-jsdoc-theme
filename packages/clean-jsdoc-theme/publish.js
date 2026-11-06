'use strict';

// JSDoc loads a template with `require(<opts.template>/publish)`, so pointing
// `template` at the package root (`node_modules/clean-jsdoc-theme`, the v4 path
// most configs already use) needs a `publish.js` here. The real entry is the
// built `dist/publish.js`; it locates its dependencies from its own module path,
// not from JSDoc's `env.templatePath`, so re-exporting it is all that's needed
// and `node_modules/clean-jsdoc-theme/dist` keeps working too.
module.exports = require('./dist/publish.js');

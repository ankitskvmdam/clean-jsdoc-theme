---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

List global functions under "Functions" on the Globals page (#375).

The Globals page reused the class page's section titles, so every global
function sat under "Instance Methods" and every global variable under
"Instance Fields". They are now headed "Functions" and "Members", and global
constants, which used to fall under "Other", are listed under "Members" too.
This also covers methods of a class expression passed as an argument or used
as an object property value, which JSDoc reports as global functions. The
Globals page's section links change accordingly: `#instance-methods` becomes
`#functions` and `#instance-fields` becomes `#members`. Class, module and
namespace pages are unchanged, and so is the TypeDoc flavour.

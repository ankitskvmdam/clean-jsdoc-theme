/**
 * Real JSDoc 4.0.5 `-X` output (meta trimmed, `comment` dropped) for the
 * source files below — `a.js`, then `cjs.js` from `/** @module cjsmod *∕` on
 * (both files' records carry `meta.filename: 'c.js'`; the line numbers restart
 * at the `cjs.js` ones), then the files named further down
 * (`*∕` stands for a comment close):
 *
 * /** Exported class desc. *∕
 * export class Exp {
 *   /**
 *    * Exp ctor.
 *    * @private
 *    * @since 9.9.9
 *    * @see SecretSee
 *    * @param {number} x the x
 *    *∕
 *   constructor(x) {}
 *   /** Public method. *∕
 *   pub() {}
 *   /**
 *    * Private method.
 *    * @private
 *    *∕
 *   hid() {}
 * }
 *
 * /** Plain class desc. *∕
 * class CtorPriv {
 *   /**
 *    * Plain ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * /** Sub desc. *∕
 * class SubPriv extends CtorPriv {
 *   /**
 *    * Sub ctor.
 *    * @private
 *    *∕
 *   constructor() { super(); }
 *   /** s *∕
 *   s() {}
 * }
 *
 * /**
 *  * Secret class.
 *  * @private
 *  *∕
 * class Sec {
 *   /** ctor *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * /**
 *  * ES5 private class.
 *  * @class
 *  * @private
 *  *∕
 * function Es5Priv() {}
 *
 * /**
 *  * ES5 private ctor.
 *  * @constructor
 *  * @private
 *  *∕
 * function Es5Ctor() {}
 *
 * /** Expr desc. *∕
 * const ExprCls = class {
 *   /**
 *    * Expr ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** e *∕
 *   e() {}
 * };
 *
 * /**
 *  * Both private.
 *  * @private
 *  *∕
 * export class Both {
 *   /** @private *∕
 *   constructor() {}
 *   /** b *∕
 *   b() {}
 * }
 * /** @module cjsmod *∕
 *
 * /** Cjs class desc. *∕
 * class CjsCls {
 *   /**
 *    * Cjs ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** c *∕
 *   c() {}
 * }
 * module.exports = CjsCls;
 *
 * Then the shapes whose constructor record longname is neither the class
 * longname nor longname + '#' + name, one file after another:
 *
 * nested.js:
 *
 * /**
 *  * Outer namespace.
 *  * @namespace
 *  *∕
 * const Outer = {};
 *
 * /** Inner class desc. *∕
 * Outer.Inner = class {
 *   /**
 *    * Inner ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** im *∕
 *   im() {}
 * };
 *
 * /** Host class desc. *∕
 * class Host {
 *   /** hm *∕
 *   hm() {}
 * }
 *
 * /** Nested class desc. *∕
 * Host.Nested = class {
 *   /**
 *    * Nested ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** nm *∕
 *   nm() {}
 * };
 *
 * /**
 *  * Hidden nested class.
 *  * @private
 *  *∕
 * Outer.HiddenInner = class {
 *   /** HiddenInner ctor. *∕
 *   constructor() {}
 *   /** hi *∕
 *   hi() {}
 * };
 *
 * defexp.js:
 *
 * /** @module defmod *∕
 *
 * /** Default class desc. *∕
 * export default class DefExp {
 *   /**
 *    * DefExp ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** d *∕
 *   d() {}
 * }
 *
 * anon.js:
 *
 * /** @module anonmod *∕
 *
 * /** Anonymous class desc. *∕
 * module.exports = class {
 *   /**
 *    * Anon ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** an *∕
 *   an() {}
 * };
 *
 * defexp-nomod.js:
 *
 * /** Default class desc. *∕
 * export default class DefExp {
 *   /**
 *    * DefExp ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** d *∕
 *   d() {}
 * }
 *
 * Then the `@alias` shapes: JSDoc renames the merged class doclet (and the
 * class-comment record) to the alias, but the constructor record keeps the
 * source name:
 *
 * alias.js:
 *
 * /**
 *  * Aliased class desc.
 *  * @alias Bar
 *  *∕
 * class Foo {
 *   /**
 *    * Aliased ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * alias-memberof.js:
 *
 * /** @namespace *∕
 * const Ns = {};
 * /**
 *  * Alias+memberof desc.
 *  * @alias Ns.Bar
 *  *∕
 * class Foo {
 *   /**
 *    * Alias+memberof ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * alias-export.js:
 *
 * /**
 *  * Exported aliased desc.
 *  * @alias Baz
 *  *∕
 * export class Foo {
 *   /**
 *    * Exported aliased ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 */
export const PRIVATE_CTOR_DOCLETS: unknown[] = [
  {
    meta: {
      filename: 'c.js',
      lineno: 2,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.Exp',
        type: 'ClassDeclaration',
      },
    },
    classdesc: '<p>Exported class desc.</p>',
    name: 'Exp',
    longname: 'Exp',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 2,
      columnno: 7,
      path: '/src',
      code: {
        name: 'Exp',
        type: 'ClassDeclaration',
        paramnames: ['x'],
      },
    },
    undocumented: true,
    name: 'Exp',
    longname: 'Exp',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'exports.Exp',
        type: 'MethodDefinition',
        paramnames: ['x'],
      },
    },
    description: '<p>Exp ctor.</p>',
    access: 'private',
    since: '9.9.9',
    see: ['SecretSee'],
    params: [
      {
        type: {
          names: ['number'],
        },
        description: '<p>the x</p>',
        name: 'x',
      },
    ],
    name: 'Exp',
    longname: 'Exp#Exp',
    kind: 'class',
    memberof: 'Exp',
    scope: 'instance',
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 2,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.Exp',
        type: 'ClassDeclaration',
      },
    },
    name: 'Exp',
    longname: 'Exp',
    kind: 'class',
    classdesc: '<p>Exported class desc.</p>',
    scope: 'global',
    description: '<p>Exp ctor.</p>',
    access: 'private',
    since: '9.9.9',
    see: ['SecretSee'],
    memberof: 'Exp',
    params: [
      {
        type: {
          names: ['number'],
        },
        description: '<p>the x</p>',
        name: 'x',
      },
    ],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 12,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Exp#pub',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Public method.</p>',
    name: 'pub',
    longname: 'Exp#pub',
    kind: 'function',
    memberof: 'Exp',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 17,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Exp#hid',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Private method.</p>',
    access: 'private',
    name: 'hid',
    longname: 'Exp#hid',
    kind: 'function',
    memberof: 'Exp',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 21,
      columnno: 0,
      path: '/src',
      code: {
        name: 'CtorPriv',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Plain class desc.</p>',
    name: 'CtorPriv',
    longname: 'CtorPriv',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 26,
      columnno: 2,
      path: '/src',
      code: {
        name: 'CtorPriv',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Plain ctor.</p>',
    access: 'private',
    name: 'CtorPriv',
    longname: 'CtorPriv',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 21,
      columnno: 0,
      path: '/src',
      code: {
        name: 'CtorPriv',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'CtorPriv',
    longname: 'CtorPriv',
    kind: 'class',
    classdesc: '<p>Plain class desc.</p>',
    scope: 'global',
    description: '<p>Plain ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 28,
      columnno: 2,
      path: '/src',
      code: {
        name: 'CtorPriv#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'CtorPriv#m',
    kind: 'function',
    memberof: 'CtorPriv',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 32,
      columnno: 0,
      path: '/src',
      code: {
        name: 'SubPriv',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Sub desc.</p>',
    name: 'SubPriv',
    longname: 'SubPriv',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 37,
      columnno: 2,
      path: '/src',
      code: {
        name: 'SubPriv',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Sub ctor.</p>',
    access: 'private',
    name: 'SubPriv',
    longname: 'SubPriv',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 32,
      columnno: 0,
      path: '/src',
      code: {
        name: 'SubPriv',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'SubPriv',
    longname: 'SubPriv',
    kind: 'class',
    classdesc: '<p>Sub desc.</p>',
    scope: 'global',
    description: '<p>Sub ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 39,
      columnno: 2,
      path: '/src',
      code: {
        name: 'SubPriv#s',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>s</p>',
    name: 's',
    longname: 'SubPriv#s',
    kind: 'function',
    memberof: 'SubPriv',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 46,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Sec',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Secret class.</p>',
    access: 'private',
    name: 'Sec',
    longname: 'Sec',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 48,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Sec',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>ctor</p>',
    name: 'Sec',
    longname: 'Sec',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 46,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Sec',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Sec',
    longname: 'Sec',
    kind: 'class',
    classdesc: '<p>Secret class.</p>',
    access: 'private',
    scope: 'global',
    description: '<p>ctor</p>',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 50,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Sec#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Sec#m',
    kind: 'function',
    memberof: 'Sec',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 58,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Es5Priv',
        type: 'FunctionDeclaration',
        paramnames: [],
      },
    },
    description: '<p>ES5 private class.</p>',
    kind: 'class',
    access: 'private',
    name: 'Es5Priv',
    longname: 'Es5Priv',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 65,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Es5Ctor',
        type: 'FunctionDeclaration',
        paramnames: [],
      },
    },
    description: '<p>ES5 private ctor.</p>',
    kind: 'class',
    access: 'private',
    name: 'Es5Ctor',
    longname: 'Es5Ctor',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 68,
      columnno: 6,
      path: '/src',
      code: {
        name: 'ExprCls',
        type: 'ClassExpression',
      },
    },
    classdesc: '<p>Expr desc.</p>',
    name: 'ExprCls',
    longname: 'ExprCls',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 73,
      columnno: 2,
      path: '/src',
      code: {
        name: 'ExprCls',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Expr ctor.</p>',
    access: 'private',
    name: 'ExprCls',
    longname: 'ExprCls',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 68,
      columnno: 6,
      path: '/src',
      code: {
        name: 'ExprCls',
        type: 'ClassExpression',
      },
    },
    name: 'ExprCls',
    longname: 'ExprCls',
    kind: 'class',
    classdesc: '<p>Expr desc.</p>',
    scope: 'global',
    description: '<p>Expr ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 75,
      columnno: 2,
      path: '/src',
      code: {
        name: 'ExprCls#e',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>e</p>',
    name: 'e',
    longname: 'ExprCls#e',
    kind: 'function',
    memberof: 'ExprCls',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 82,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.Both',
        type: 'ClassDeclaration',
      },
    },
    classdesc: '<p>Both private.</p>',
    access: 'private',
    name: 'Both',
    longname: 'Both',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 82,
      columnno: 7,
      path: '/src',
      code: {
        name: 'Both',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    undocumented: true,
    name: 'Both',
    longname: 'Both',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 84,
      columnno: 2,
      path: '/src',
      code: {
        name: 'exports.Both',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    access: 'private',
    name: 'Both',
    longname: 'Both#Both',
    kind: 'class',
    memberof: 'Both',
    scope: 'instance',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 82,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.Both',
        type: 'ClassDeclaration',
      },
    },
    name: 'Both',
    longname: 'Both',
    kind: 'class',
    classdesc: '<p>Both private.</p>',
    access: 'private',
    scope: 'global',
    memberof: 'Both',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 86,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Both#b',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>b</p>',
    name: 'b',
    longname: 'Both#b',
    kind: 'function',
    memberof: 'Both',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 1,
      columnno: 0,
      path: '/src',
      code: {},
    },
    kind: 'module',
    name: 'cjsmod',
    longname: 'module:cjsmod',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 4,
      columnno: 0,
      path: '/src',
      code: {
        name: 'CjsCls',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Cjs class desc.</p>',
    name: 'CjsCls',
    longname: 'module:cjsmod~CjsCls',
    kind: 'class',
    scope: 'inner',
    memberof: 'module:cjsmod',
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 9,
      columnno: 2,
      path: '/src',
      code: {
        name: 'CjsCls',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Cjs ctor.</p>',
    access: 'private',
    name: 'CjsCls',
    longname: 'module:cjsmod~CjsCls',
    kind: 'class',
    memberof: 'module:cjsmod',
    scope: 'inner',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 4,
      columnno: 0,
      path: '/src',
      code: {
        name: 'CjsCls',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'CjsCls',
    longname: 'module:cjsmod~CjsCls',
    kind: 'class',
    classdesc: '<p>Cjs class desc.</p>',
    scope: 'inner',
    memberof: 'module:cjsmod',
    description: '<p>Cjs ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 11,
      columnno: 2,
      path: '/src',
      code: {
        name: 'CjsCls#c',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>c</p>',
    name: 'c',
    longname: 'module:cjsmod~CjsCls#c',
    kind: 'function',
    memberof: 'module:cjsmod~CjsCls',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 13,
      columnno: 0,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'Identifier',
        paramnames: [],
      },
    },
    undocumented: true,
    name: 'module:cjsmod',
    longname: 'module:cjsmod',
    kind: 'member',
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 5,
      columnno: 6,
      path: '/src',
      code: {
        name: 'Outer',
        type: 'ObjectExpression',
      },
    },
    description: '<p>Outer namespace.</p>',
    kind: 'namespace',
    name: 'Outer',
    longname: 'Outer',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 8,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Outer.Inner',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: '<p>Inner class desc.</p>',
    name: 'Inner',
    longname: 'Outer.Inner',
    kind: 'class',
    memberof: 'Outer',
    scope: 'static',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 13,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Outer.Inner',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Inner ctor.</p>',
    access: 'private',
    name: 'Inner',
    longname: 'Outer~Outer.Inner',
    kind: 'class',
    memberof: 'Outer~Outer',
    scope: 'static',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 8,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Outer.Inner',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    name: 'Inner',
    longname: 'Outer.Inner',
    kind: 'class',
    classdesc: '<p>Inner class desc.</p>',
    memberof: 'Outer',
    scope: 'static',
    description: '<p>Inner ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 15,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Outer.Inner#im',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>im</p>',
    name: 'im',
    longname: 'Outer.Inner#im',
    kind: 'function',
    memberof: 'Outer.Inner',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 19,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Host',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Host class desc.</p>',
    name: 'Host',
    longname: 'Host',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 21,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Host#hm',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>hm</p>',
    name: 'hm',
    longname: 'Host#hm',
    kind: 'function',
    memberof: 'Host',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 25,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Host.Nested',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: '<p>Nested class desc.</p>',
    name: 'Nested',
    longname: 'Host.Nested',
    kind: 'class',
    memberof: 'Host',
    scope: 'static',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 30,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Host.Nested',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Nested ctor.</p>',
    access: 'private',
    name: 'Nested',
    longname: 'Host~Host.Nested',
    kind: 'class',
    memberof: 'Host~Host',
    scope: 'static',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 25,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Host.Nested',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    name: 'Nested',
    longname: 'Host.Nested',
    kind: 'class',
    classdesc: '<p>Nested class desc.</p>',
    memberof: 'Host',
    scope: 'static',
    description: '<p>Nested ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 32,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Host.Nested#nm',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>nm</p>',
    name: 'nm',
    longname: 'Host.Nested#nm',
    kind: 'function',
    memberof: 'Host.Nested',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 39,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Outer.HiddenInner',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: '<p>Hidden nested class.</p>',
    access: 'private',
    name: 'HiddenInner',
    longname: 'Outer.HiddenInner',
    kind: 'class',
    memberof: 'Outer',
    scope: 'static',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 41,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Outer.HiddenInner',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>HiddenInner ctor.</p>',
    name: 'HiddenInner',
    longname: 'Outer~Outer.HiddenInner',
    kind: 'class',
    memberof: 'Outer~Outer',
    scope: 'static',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 39,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Outer.HiddenInner',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    name: 'HiddenInner',
    longname: 'Outer.HiddenInner',
    kind: 'class',
    classdesc: '<p>Hidden nested class.</p>',
    access: 'private',
    memberof: 'Outer',
    scope: 'static',
    description: '<p>HiddenInner ctor.</p>',
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 43,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Outer.HiddenInner#hi',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>hi</p>',
    name: 'hi',
    longname: 'Outer.HiddenInner#hi',
    kind: 'function',
    memberof: 'Outer.HiddenInner',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'defexp.js',
      lineno: 1,
      columnno: 0,
      path: '/src',
      code: {},
    },
    kind: 'module',
    name: 'defmod',
    longname: 'module:defmod',
  },
  {
    meta: {
      filename: 'defexp.js',
      lineno: 4,
      columnno: 0,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'ClassDeclaration',
      },
    },
    undocumented: true,
    name: 'module:defmod',
    longname: 'module:defmod',
    kind: 'class',
  },
  {
    meta: {
      filename: 'defexp.js',
      lineno: 4,
      columnno: 15,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Default class desc.</p>',
    name: 'module:defmod',
    longname: 'module:defmod',
    kind: 'class',
    undocumented: true,
  },
  {
    meta: {
      filename: 'defexp.js',
      lineno: 9,
      columnno: 2,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>DefExp ctor.</p>',
    access: 'private',
    name: 'module:defmod',
    longname: 'module:defmod',
    kind: 'class',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'defexp.js',
      lineno: 4,
      columnno: 15,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'module:defmod',
    longname: 'module:defmod',
    kind: 'class',
    classdesc: '<p>Default class desc.</p>',
    description: '<p>DefExp ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'defexp.js',
      lineno: 11,
      columnno: 2,
      path: '/src',
      code: {
        name: 'd',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>d</p>',
    name: 'd',
    longname: 'module:defmod#d',
    kind: 'function',
    scope: 'instance',
    memberof: 'module:defmod',
    params: [],
  },
  {
    meta: {
      filename: 'anon.js',
      lineno: 1,
      columnno: 0,
      path: '/src',
      code: {},
    },
    kind: 'module',
    name: 'anonmod',
    longname: 'module:anonmod',
  },
  {
    meta: {
      filename: 'anon.js',
      lineno: 4,
      columnno: 0,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: '<p>Anonymous class desc.</p>',
    name: 'module:anonmod',
    longname: 'module:anonmod',
    kind: 'class',
    undocumented: true,
  },
  {
    meta: {
      filename: 'anon.js',
      lineno: 9,
      columnno: 2,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Anon ctor.</p>',
    access: 'private',
    name: 'module:anonmod',
    longname: 'module:anonmod',
    kind: 'class',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'anon.js',
      lineno: 4,
      columnno: 0,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    name: 'module:anonmod',
    longname: 'module:anonmod',
    kind: 'class',
    classdesc: '<p>Anonymous class desc.</p>',
    description: '<p>Anon ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'anon.js',
      lineno: 11,
      columnno: 2,
      path: '/src',
      code: {
        name: 'module.exports#an',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>an</p>',
    name: 'an',
    longname: 'module:anonmod#module.exports#an',
    kind: 'function',
    scope: 'instance',
    memberof: 'module:anonmod#module.exports',
    params: [],
  },
  {
    meta: {
      filename: 'defexp-nomod.js',
      lineno: 2,
      columnno: 0,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'ClassDeclaration',
      },
    },
    undocumented: true,
    name: 'exports',
    longname: 'module.exports',
    kind: 'class',
    memberof: 'module',
    scope: 'static',
  },
  {
    meta: {
      filename: 'defexp-nomod.js',
      lineno: 2,
      columnno: 15,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Default class desc.</p>',
    name: 'exports',
    longname: 'module.exports',
    kind: 'class',
    memberof: 'module',
    scope: 'static',
    undocumented: true,
  },
  {
    meta: {
      filename: 'defexp-nomod.js',
      lineno: 7,
      columnno: 2,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>DefExp ctor.</p>',
    access: 'private',
    name: 'exports',
    longname: 'module.exports#module.exports',
    kind: 'class',
    memberof: 'module.exports#module',
    scope: 'static',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'defexp-nomod.js',
      lineno: 2,
      columnno: 15,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'exports',
    longname: 'module.exports',
    kind: 'class',
    classdesc: '<p>Default class desc.</p>',
    memberof: 'module',
    scope: 'static',
    description: '<p>DefExp ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'defexp-nomod.js',
      lineno: 9,
      columnno: 2,
      path: '/src',
      code: {
        name: 'd',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>d</p>',
    name: 'd',
    longname: 'd',
    kind: 'function',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'alias.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Aliased class desc.</p>',
    alias: 'Bar',
    name: 'Bar',
    longname: 'Bar',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'alias.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Aliased ctor.</p>',
    access: 'private',
    name: 'Foo',
    longname: 'Foo',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'alias.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Bar',
    longname: 'Bar',
    kind: 'class',
    classdesc: '<p>Aliased class desc.</p>',
    alias: 'Bar',
    scope: 'global',
    description: '<p>Aliased ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'alias.js',
      lineno: 12,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Bar#m',
    kind: 'function',
    memberof: 'Bar',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'alias-memberof.js',
      lineno: 2,
      columnno: 6,
      path: '/src',
      code: {
        name: 'Ns',
        type: 'ObjectExpression',
      },
    },
    kind: 'namespace',
    name: 'Ns',
    longname: 'Ns',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'alias-memberof.js',
      lineno: 7,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Alias+memberof desc.</p>',
    alias: 'Ns.Bar',
    name: 'Bar',
    longname: 'Ns.Bar',
    kind: 'class',
    memberof: 'Ns',
    scope: 'static',
    undocumented: true,
  },
  {
    meta: {
      filename: 'alias-memberof.js',
      lineno: 12,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Alias+memberof ctor.</p>',
    access: 'private',
    name: 'Foo',
    longname: 'Ns~Foo',
    kind: 'class',
    memberof: 'Ns',
    scope: 'inner',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'alias-memberof.js',
      lineno: 7,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Bar',
    longname: 'Ns.Bar',
    kind: 'class',
    classdesc: '<p>Alias+memberof desc.</p>',
    alias: 'Ns.Bar',
    memberof: 'Ns',
    scope: 'static',
    description: '<p>Alias+memberof ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'alias-memberof.js',
      lineno: 14,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Ns.Bar#m',
    kind: 'function',
    memberof: 'Ns.Bar',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'alias-export.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.Foo',
        type: 'ClassDeclaration',
      },
    },
    classdesc: '<p>Exported aliased desc.</p>',
    alias: 'Baz',
    name: 'Baz',
    longname: 'Baz',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'alias-export.js',
      lineno: 5,
      columnno: 7,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    undocumented: true,
    name: 'Foo',
    longname: 'Foo',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'alias-export.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'exports.Foo',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Exported aliased ctor.</p>',
    access: 'private',
    name: 'Foo',
    longname: 'Foo#Foo',
    kind: 'class',
    memberof: 'Foo',
    scope: 'instance',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'alias-export.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.Foo',
        type: 'ClassDeclaration',
      },
    },
    name: 'Baz',
    longname: 'Baz',
    kind: 'class',
    classdesc: '<p>Exported aliased desc.</p>',
    alias: 'Baz',
    scope: 'global',
    description: '<p>Exported aliased ctor.</p>',
    access: 'private',
    memberof: 'Foo',
  },
  {
    meta: {
      filename: 'alias-export.js',
      lineno: 12,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Foo#m',
    kind: 'function',
    memberof: 'Foo',
    scope: 'instance',
    params: [],
  },
];

/**
 * Real JSDoc 4.0.5 `-X` output, trimmed the same way, for one more file. Kept
 * apart from {@link PRIVATE_CTOR_DOCLETS}: its class gets the same
 * `module.exports` longname as `defexp-nomod.js`'s, and two classes sharing a
 * longname would share a page.
 *
 * anon-nomod.js:
 *
 * /** Anonymous class desc. *∕
 * module.exports = class {
 *   /**
 *    * Anon ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** an *∕
 *   an() {}
 * };
 */
export const PRIVATE_CTOR_ANON_DOCLETS: unknown[] = [
  {
    meta: {
      filename: 'anon-nomod.js',
      lineno: 2,
      columnno: 0,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: '<p>Anonymous class desc.</p>',
    name: 'exports',
    longname: 'module.exports',
    kind: 'class',
    memberof: 'module',
    scope: 'static',
    undocumented: true,
  },
  {
    meta: {
      filename: 'anon-nomod.js',
      lineno: 7,
      columnno: 2,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Anon ctor.</p>',
    access: 'private',
    name: 'exports',
    longname: 'module.exports#module.exports',
    kind: 'class',
    memberof: 'module.exports#module',
    scope: 'static',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'anon-nomod.js',
      lineno: 2,
      columnno: 0,
      path: '/src',
      code: {
        name: 'module.exports',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    name: 'exports',
    longname: 'module.exports',
    kind: 'class',
    classdesc: '<p>Anonymous class desc.</p>',
    memberof: 'module',
    scope: 'static',
    description: '<p>Anon ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'anon-nomod.js',
      lineno: 9,
      columnno: 2,
      path: '/src',
      code: {
        name: 'module.exports#an',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>an</p>',
    name: 'an',
    longname: 'module.exports#an',
    kind: 'function',
    memberof: 'module.exports',
    scope: 'instance',
    params: [],
  },
];

/**
 * Real JSDoc 4.0.5 `-X` output, trimmed the same way, for two classes JSDoc
 * gives the same longname (`Foo`) and source identity: a top-level class and a
 * function-scoped one, each with a `@private` constructor carrying its own
 * tags. Kept apart: the two share a page.
 *
 * twoclasses.js:
 *
 * /** Top Foo desc. *∕
 * class Foo {
 *   /**
 *    * Top Foo ctor.
 *    * @private
 *    * @see TopSecretSee
 *    *∕
 *   constructor() {}
 *   /** a *∕
 *   a() {}
 * }
 *
 * function mk() {
 *   /** Inner Foo desc. *∕
 *   class Foo {
 *     /**
 *      * Inner Foo ctor.
 *      * @private
 *      * @since 7.7.7
 *      *∕
 *     constructor() {}
 *     /** b *∕
 *     b() {}
 *   }
 *   return Foo;
 * }
 */
export const PRIVATE_CTOR_SAME_NAME_DOCLETS: unknown[] = [
  {
    meta: {
      filename: 'twoclasses.js',
      lineno: 2,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Top Foo desc.</p>',
    name: 'Foo',
    longname: 'Foo',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'twoclasses.js',
      lineno: 8,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Top Foo ctor.</p>',
    access: 'private',
    see: ['TopSecretSee'],
    name: 'Foo',
    longname: 'Foo',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'twoclasses.js',
      lineno: 2,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Foo',
    longname: 'Foo',
    kind: 'class',
    classdesc: '<p>Top Foo desc.</p>',
    scope: 'global',
    description: '<p>Top Foo ctor.</p>',
    access: 'private',
    see: ['TopSecretSee'],
  },
  {
    meta: {
      filename: 'twoclasses.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo#a',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>a</p>',
    name: 'a',
    longname: 'Foo#a',
    kind: 'function',
    memberof: 'Foo',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'twoclasses.js',
      lineno: 13,
      columnno: 0,
      path: '/src',
      code: {
        name: 'mk',
        type: 'FunctionDeclaration',
        paramnames: [],
      },
    },
    undocumented: true,
    name: 'mk',
    longname: 'mk',
    kind: 'function',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'twoclasses.js',
      lineno: 15,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Inner Foo desc.</p>',
    name: 'Foo',
    longname: 'Foo',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'twoclasses.js',
      lineno: 21,
      columnno: 4,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Inner Foo ctor.</p>',
    access: 'private',
    since: '7.7.7',
    name: 'Foo',
    longname: 'Foo',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'twoclasses.js',
      lineno: 15,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Foo',
    longname: 'Foo',
    kind: 'class',
    classdesc: '<p>Inner Foo desc.</p>',
    scope: 'global',
    description: '<p>Inner Foo ctor.</p>',
    access: 'private',
    since: '7.7.7',
  },
  {
    meta: {
      filename: 'twoclasses.js',
      lineno: 23,
      columnno: 4,
      path: '/src',
      code: {
        name: 'Foo#b',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>b</p>',
    name: 'b',
    longname: 'Foo#b',
    kind: 'function',
    memberof: 'Foo',
    scope: 'instance',
    params: [],
  },
];

/**
 * Real JSDoc 4.0.5 `-X` output, trimmed the same way, for an ES5 `@class`
 * function marked `@private` that shares its longname (`Foo`) with a
 * function-scoped ES6 class whose only private part is its constructor, plus
 * an unrelated ES5 class and ES6 class in the same file. Kept apart: `Foo`
 * would clash with {@link PRIVATE_CTOR_SAME_NAME_DOCLETS}.
 *
 * es5es6.js:
 *
 * /**
 *  * ES5 private class.
 *  * @class
 *  * @private
 *  *∕
 * function Foo() {}
 *
 * function mk() {
 *   /** Inner Foo desc. *∕
 *   class Foo {
 *     /**
 *      * Inner Foo ctor.
 *      * @private
 *      *∕
 *     constructor() {}
 *     /** b *∕
 *     b() {}
 *   }
 *   return Foo;
 * }
 *
 * /** ES5 public class. *∕
 * function Pub() {}
 * Pub.prototype.go = function () {};
 *
 * /** ES6 class in the same file. *∕
 * class Mixed {
 *   /**
 *    * Mixed ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 */
export const PRIVATE_CTOR_ES5_ES6_DOCLETS: unknown[] = [
  {
    meta: {
      filename: 'es5es6.js',
      lineno: 6,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'FunctionDeclaration',
        paramnames: [],
      },
    },
    description: '<p>ES5 private class.</p>',
    kind: 'class',
    access: 'private',
    name: 'Foo',
    longname: 'Foo',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'es5es6.js',
      lineno: 8,
      columnno: 0,
      path: '/src',
      code: {
        name: 'mk',
        type: 'FunctionDeclaration',
        paramnames: [],
      },
    },
    undocumented: true,
    name: 'mk',
    longname: 'mk',
    kind: 'function',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'es5es6.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Inner Foo desc.</p>',
    name: 'Foo',
    longname: 'Foo',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'es5es6.js',
      lineno: 15,
      columnno: 4,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Inner Foo ctor.</p>',
    access: 'private',
    name: 'Foo',
    longname: 'Foo',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'es5es6.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Foo',
    longname: 'Foo',
    kind: 'class',
    classdesc: '<p>Inner Foo desc.</p>',
    scope: 'global',
    description: '<p>Inner Foo ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'es5es6.js',
      lineno: 17,
      columnno: 4,
      path: '/src',
      code: {
        name: 'Foo#b',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>b</p>',
    name: 'b',
    longname: 'Foo#b',
    kind: 'function',
    memberof: 'Foo',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'es5es6.js',
      lineno: 23,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Pub',
        type: 'FunctionDeclaration',
        paramnames: [],
      },
    },
    description: '<p>ES5 public class.</p>',
    name: 'Pub',
    longname: 'Pub',
    kind: 'function',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'es5es6.js',
      lineno: 24,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Pub.prototype.go',
        type: 'FunctionExpression',
        paramnames: [],
      },
    },
    undocumented: true,
    name: 'go',
    longname: 'Pub#go',
    kind: 'function',
    memberof: 'Pub',
    scope: 'instance',
  },
  {
    meta: {
      filename: 'es5es6.js',
      lineno: 27,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Mixed',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>ES6 class in the same file.</p>',
    name: 'Mixed',
    longname: 'Mixed',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'es5es6.js',
      lineno: 32,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Mixed',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Mixed ctor.</p>',
    access: 'private',
    name: 'Mixed',
    longname: 'Mixed',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'es5es6.js',
      lineno: 27,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Mixed',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Mixed',
    longname: 'Mixed',
    kind: 'class',
    classdesc: '<p>ES6 class in the same file.</p>',
    scope: 'global',
    description: '<p>Mixed ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'es5es6.js',
      lineno: 34,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Mixed#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Mixed#m',
    kind: 'function',
    memberof: 'Mixed',
    scope: 'instance',
    params: [],
  },
];

/**
 * Real JSDoc 4.0.5 `-X` output, trimmed the same way, for classes whose comment
 * carries an explicit access tag (`@protected`, `@public`, `@package`,
 * `@access …`) and whose ES6 constructor is `@private` (#373), plus controls
 * (a public or `@protected` constructor, `@hideconstructor`, a `@private` class)
 * and same-named nested classes whose private constructor is not the outer
 * class's. One file after another:
 *
 * protected-class.js:
 *
 * /**
 *  * Prot class desc.
 *  * @protected
 *  *∕
 * class Prot {
 *   /**
 *    * Prot ctor.
 *    * @private
 *    * @since 9.9.9
 *    * @see SecretSee
 *    * @param {number} x the x
 *    *∕
 *   constructor(x) {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * public-class.js:
 *
 * /**
 *  * Pub class desc.
 *  * @public
 *  *∕
 * class Pub {
 *   /**
 *    * Pub ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * package-class.js:
 *
 * /**
 *  * Pkg class desc.
 *  * @package
 *  *∕
 * class Pkg {
 *   /**
 *    * Pkg ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * access-tag.js:
 *
 * /**
 *  * AccTag class desc.
 *  * @access protected
 *  *∕
 * class AccTag {
 *   /**
 *    * AccTag ctor.
 *    * @access private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * bare-private-ctor.js:
 *
 * /**
 *  * ProtNoDesc class desc.
 *  * @protected
 *  *∕
 * class ProtNoDesc {
 *   /** @private *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * protected-export.js:
 *
 * /**
 *  * ExpProt class desc.
 *  * @protected
 *  *∕
 * export class ExpProt {
 *   /**
 *    * ExpProt ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * protected-expr.js:
 *
 * /**
 *  * ExprProt class desc.
 *  * @protected
 *  *∕
 * const ExprProt = class {
 *   /**
 *    * ExprProt ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * };
 *
 * /** @namespace *∕
 * const Ns = {};
 *
 * /**
 *  * NsProt class desc.
 *  * @protected
 *  *∕
 * Ns.NsProt = class {
 *   /**
 *    * NsProt ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * };
 *
 * protected-alias.js:
 *
 * /** @namespace *∕
 * const Ns2 = {};
 *
 * /**
 *  * Other class desc.
 *  * @protected
 *  * @alias Other
 *  *∕
 * Ns2.Foo = class {
 *   /**
 *    * Other ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** am *∕
 *   am() {}
 * };
 *
 * controls.js:
 *
 * /**
 *  * ProtPubCtor class desc.
 *  * @protected
 *  *∕
 * class ProtPubCtor {
 *   /**
 *    * ProtPubCtor ctor.
 *    * @param {number} y the y
 *    *∕
 *   constructor(y) {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * /** CtorProt class desc. *∕
 * class CtorProt {
 *   /**
 *    * CtorProt ctor.
 *    * @protected
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * /**
 *  * ProtHide class desc.
 *  * @protected
 *  * @hideconstructor
 *  *∕
 * class ProtHide {
 *   /**
 *    * ProtHide ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * /**
 *  * PrivBoth class desc.
 *  * @private
 *  *∕
 * class PrivBoth {
 *   /**
 *    * PrivBoth ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * nested-trap.js:
 *
 * /**
 *  * Trap class desc.
 *  * @protected
 *  *∕
 * class Trap {
 *   /**
 *    * Trap public ctor.
 *    * @param {number} a the a
 *    *∕
 *   constructor(a) {
 *     /** Inner Trap desc. *∕
 *     class Trap {
 *       /**
 *        * Inner Trap ctor.
 *        * @private
 *        *∕
 *       constructor() {}
 *     }
 *   }
 *   /** m *∕
 *   m() {}
 * }
 *
 * nested-trap-variants.js:
 *
 * /**
 *  * Trap2 class desc.
 *  * @protected
 *  *∕
 * class Trap2 {
 *   constructor() {
 *     /** Inner Trap2 desc. *∕
 *     class Trap2 {
 *       /**
 *        * Inner Trap2 ctor.
 *        * @private
 *        *∕
 *       constructor() {}
 *     }
 *   }
 *   /** m *∕
 *   m() {}
 * }
 *
 * /**
 *  * Trap3 class desc.
 *  * @protected
 *  *∕
 * class Trap3 {
 *   /** m *∕
 *   m() {
 *     /** Inner Trap3 desc. *∕
 *     class Trap3 {
 *       /**
 *        * Inner Trap3 ctor.
 *        * @private
 *        *∕
 *       constructor() {}
 *     }
 *   }
 * }
 *
 * /**
 *  * Trap4 class desc.
 *  * @protected
 *  *∕
 * class Trap4 {
 *   /** m *∕
 *   m() {
 *     /** Inner Trap4 desc. *∕
 *     class Trap4 {
 *       /**
 *        * Inner Trap4 ctor.
 *        * @private
 *        *∕
 *       constructor() {}
 *     }
 *   }
 *   /**
 *    * Trap4 public ctor.
 *    * @param {number} b the b
 *    *∕
 *   constructor(b) {}
 * }
 */
export const PRIVATE_CTOR_CLASS_ACCESS_DOCLETS: unknown[] = [
  {
    meta: {
      filename: 'protected-class.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Prot',
        type: 'ClassDeclaration',
        paramnames: ['x'],
      },
    },
    classdesc: '<p>Prot class desc.</p>',
    access: 'protected',
    name: 'Prot',
    longname: 'Prot',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'protected-class.js',
      lineno: 13,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Prot',
        type: 'MethodDefinition',
        paramnames: ['x'],
      },
    },
    description: '<p>Prot ctor.</p>',
    access: 'private',
    since: '9.9.9',
    see: ['SecretSee'],
    params: [
      {
        type: {
          names: ['number'],
        },
        description: '<p>the x</p>',
        name: 'x',
      },
    ],
    name: 'Prot',
    longname: 'Prot',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'protected-class.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Prot',
        type: 'ClassDeclaration',
        paramnames: ['x'],
      },
    },
    name: 'Prot',
    longname: 'Prot',
    kind: 'class',
    classdesc: '<p>Prot class desc.</p>',
    access: 'protected',
    scope: 'global',
    description: '<p>Prot ctor.</p>',
    since: '9.9.9',
    see: ['SecretSee'],
    params: [
      {
        type: {
          names: ['number'],
        },
        description: '<p>the x</p>',
        name: 'x',
      },
    ],
  },
  {
    meta: {
      filename: 'protected-class.js',
      lineno: 15,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Prot#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Prot#m',
    kind: 'function',
    memberof: 'Prot',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'public-class.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Pub',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Pub class desc.</p>',
    access: 'public',
    name: 'Pub',
    longname: 'Pub',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'public-class.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Pub',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Pub ctor.</p>',
    access: 'private',
    name: 'Pub',
    longname: 'Pub',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'public-class.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Pub',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Pub',
    longname: 'Pub',
    kind: 'class',
    classdesc: '<p>Pub class desc.</p>',
    access: 'public',
    scope: 'global',
    description: '<p>Pub ctor.</p>',
  },
  {
    meta: {
      filename: 'public-class.js',
      lineno: 12,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Pub#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Pub#m',
    kind: 'function',
    memberof: 'Pub',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'package-class.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Pkg',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Pkg class desc.</p>',
    access: 'package',
    name: 'Pkg',
    longname: 'Pkg',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'package-class.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Pkg',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Pkg ctor.</p>',
    access: 'private',
    name: 'Pkg',
    longname: 'Pkg',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'package-class.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Pkg',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Pkg',
    longname: 'Pkg',
    kind: 'class',
    classdesc: '<p>Pkg class desc.</p>',
    access: 'package',
    scope: 'global',
    description: '<p>Pkg ctor.</p>',
  },
  {
    meta: {
      filename: 'package-class.js',
      lineno: 12,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Pkg#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Pkg#m',
    kind: 'function',
    memberof: 'Pkg',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'access-tag.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'AccTag',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>AccTag class desc.</p>',
    access: 'protected',
    name: 'AccTag',
    longname: 'AccTag',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'access-tag.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'AccTag',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>AccTag ctor.</p>',
    access: 'private',
    name: 'AccTag',
    longname: 'AccTag',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'access-tag.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'AccTag',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'AccTag',
    longname: 'AccTag',
    kind: 'class',
    classdesc: '<p>AccTag class desc.</p>',
    access: 'protected',
    scope: 'global',
    description: '<p>AccTag ctor.</p>',
  },
  {
    meta: {
      filename: 'access-tag.js',
      lineno: 12,
      columnno: 2,
      path: '/src',
      code: {
        name: 'AccTag#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'AccTag#m',
    kind: 'function',
    memberof: 'AccTag',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'bare-private-ctor.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'ProtNoDesc',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>ProtNoDesc class desc.</p>',
    access: 'protected',
    name: 'ProtNoDesc',
    longname: 'ProtNoDesc',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'bare-private-ctor.js',
      lineno: 7,
      columnno: 2,
      path: '/src',
      code: {
        name: 'ProtNoDesc',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    access: 'private',
    name: 'ProtNoDesc',
    longname: 'ProtNoDesc',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'bare-private-ctor.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'ProtNoDesc',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'ProtNoDesc',
    longname: 'ProtNoDesc',
    kind: 'class',
    classdesc: '<p>ProtNoDesc class desc.</p>',
    access: 'protected',
    scope: 'global',
  },
  {
    meta: {
      filename: 'bare-private-ctor.js',
      lineno: 9,
      columnno: 2,
      path: '/src',
      code: {
        name: 'ProtNoDesc#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'ProtNoDesc#m',
    kind: 'function',
    memberof: 'ProtNoDesc',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'protected-export.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.ExpProt',
        type: 'ClassDeclaration',
      },
    },
    classdesc: '<p>ExpProt class desc.</p>',
    access: 'protected',
    name: 'ExpProt',
    longname: 'ExpProt',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'protected-export.js',
      lineno: 5,
      columnno: 7,
      path: '/src',
      code: {
        name: 'ExpProt',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    undocumented: true,
    name: 'ExpProt',
    longname: 'ExpProt',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'protected-export.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'exports.ExpProt',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>ExpProt ctor.</p>',
    access: 'private',
    name: 'ExpProt',
    longname: 'ExpProt#ExpProt',
    kind: 'class',
    memberof: 'ExpProt',
    scope: 'instance',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'protected-export.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.ExpProt',
        type: 'ClassDeclaration',
      },
    },
    name: 'ExpProt',
    longname: 'ExpProt',
    kind: 'class',
    classdesc: '<p>ExpProt class desc.</p>',
    access: 'protected',
    scope: 'global',
    description: '<p>ExpProt ctor.</p>',
    memberof: 'ExpProt',
  },
  {
    meta: {
      filename: 'protected-export.js',
      lineno: 12,
      columnno: 2,
      path: '/src',
      code: {
        name: 'ExpProt#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'ExpProt#m',
    kind: 'function',
    memberof: 'ExpProt',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'protected-expr.js',
      lineno: 5,
      columnno: 6,
      path: '/src',
      code: {
        name: 'ExprProt',
        type: 'ClassExpression',
      },
    },
    classdesc: '<p>ExprProt class desc.</p>',
    access: 'protected',
    name: 'ExprProt',
    longname: 'ExprProt',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'protected-expr.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'ExprProt',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>ExprProt ctor.</p>',
    access: 'private',
    name: 'ExprProt',
    longname: 'ExprProt',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'protected-expr.js',
      lineno: 5,
      columnno: 6,
      path: '/src',
      code: {
        name: 'ExprProt',
        type: 'ClassExpression',
      },
    },
    name: 'ExprProt',
    longname: 'ExprProt',
    kind: 'class',
    classdesc: '<p>ExprProt class desc.</p>',
    access: 'protected',
    scope: 'global',
    description: '<p>ExprProt ctor.</p>',
  },
  {
    meta: {
      filename: 'protected-expr.js',
      lineno: 12,
      columnno: 2,
      path: '/src',
      code: {
        name: 'ExprProt#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'ExprProt#m',
    kind: 'function',
    memberof: 'ExprProt',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'protected-expr.js',
      lineno: 16,
      columnno: 6,
      path: '/src',
      code: {
        name: 'Ns',
        type: 'ObjectExpression',
      },
    },
    kind: 'namespace',
    name: 'Ns',
    longname: 'Ns',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'protected-expr.js',
      lineno: 22,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.NsProt',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: '<p>NsProt class desc.</p>',
    access: 'protected',
    name: 'NsProt',
    longname: 'Ns.NsProt',
    kind: 'class',
    memberof: 'Ns',
    scope: 'static',
    undocumented: true,
  },
  {
    meta: {
      filename: 'protected-expr.js',
      lineno: 27,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.NsProt',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>NsProt ctor.</p>',
    access: 'private',
    name: 'NsProt',
    longname: 'Ns~Ns.NsProt',
    kind: 'class',
    memberof: 'Ns~Ns',
    scope: 'static',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'protected-expr.js',
      lineno: 22,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.NsProt',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    name: 'NsProt',
    longname: 'Ns.NsProt',
    kind: 'class',
    classdesc: '<p>NsProt class desc.</p>',
    access: 'protected',
    memberof: 'Ns',
    scope: 'static',
    description: '<p>NsProt ctor.</p>',
  },
  {
    meta: {
      filename: 'protected-expr.js',
      lineno: 29,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.NsProt#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Ns.NsProt#m',
    kind: 'function',
    memberof: 'Ns.NsProt',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'protected-alias.js',
      lineno: 2,
      columnno: 6,
      path: '/src',
      code: {
        name: 'Ns2',
        type: 'ObjectExpression',
      },
    },
    kind: 'namespace',
    name: 'Ns2',
    longname: 'Ns2',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'protected-alias.js',
      lineno: 9,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns2.Foo',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: '<p>Other class desc.</p>',
    access: 'protected',
    alias: 'Other',
    name: 'Other',
    longname: 'Other',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'protected-alias.js',
      lineno: 14,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns2.Foo',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Other ctor.</p>',
    access: 'private',
    name: 'Foo',
    longname: 'Ns2.Foo',
    kind: 'class',
    memberof: 'Ns2',
    scope: 'static',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'protected-alias.js',
      lineno: 9,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns2.Foo',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    name: 'Other',
    longname: 'Other',
    kind: 'class',
    classdesc: '<p>Other class desc.</p>',
    access: 'protected',
    alias: 'Other',
    scope: 'global',
    description: '<p>Other ctor.</p>',
    memberof: 'Ns2',
  },
  {
    meta: {
      filename: 'protected-alias.js',
      lineno: 16,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns2.Foo#am',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>am</p>',
    name: 'am',
    longname: 'Ns2.Foo#am',
    kind: 'function',
    memberof: 'Ns2.Foo',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'ProtPubCtor',
        type: 'ClassDeclaration',
        paramnames: ['y'],
      },
    },
    classdesc: '<p>ProtPubCtor class desc.</p>',
    access: 'protected',
    name: 'ProtPubCtor',
    longname: 'ProtPubCtor',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'ProtPubCtor',
        type: 'MethodDefinition',
        paramnames: ['y'],
      },
    },
    description: '<p>ProtPubCtor ctor.</p>',
    params: [
      {
        type: {
          names: ['number'],
        },
        description: '<p>the y</p>',
        name: 'y',
      },
    ],
    name: 'ProtPubCtor',
    longname: 'ProtPubCtor',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'ProtPubCtor',
        type: 'ClassDeclaration',
        paramnames: ['y'],
      },
    },
    name: 'ProtPubCtor',
    longname: 'ProtPubCtor',
    kind: 'class',
    classdesc: '<p>ProtPubCtor class desc.</p>',
    access: 'protected',
    scope: 'global',
    description: '<p>ProtPubCtor ctor.</p>',
    params: [
      {
        type: {
          names: ['number'],
        },
        description: '<p>the y</p>',
        name: 'y',
      },
    ],
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 12,
      columnno: 2,
      path: '/src',
      code: {
        name: 'ProtPubCtor#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'ProtPubCtor#m',
    kind: 'function',
    memberof: 'ProtPubCtor',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 16,
      columnno: 0,
      path: '/src',
      code: {
        name: 'CtorProt',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>CtorProt class desc.</p>',
    name: 'CtorProt',
    longname: 'CtorProt',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 21,
      columnno: 2,
      path: '/src',
      code: {
        name: 'CtorProt',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>CtorProt ctor.</p>',
    access: 'protected',
    name: 'CtorProt',
    longname: 'CtorProt',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 16,
      columnno: 0,
      path: '/src',
      code: {
        name: 'CtorProt',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'CtorProt',
    longname: 'CtorProt',
    kind: 'class',
    classdesc: '<p>CtorProt class desc.</p>',
    scope: 'global',
    description: '<p>CtorProt ctor.</p>',
    access: 'protected',
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 23,
      columnno: 2,
      path: '/src',
      code: {
        name: 'CtorProt#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'CtorProt#m',
    kind: 'function',
    memberof: 'CtorProt',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 31,
      columnno: 0,
      path: '/src',
      code: {
        name: 'ProtHide',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>ProtHide class desc.</p>',
    access: 'protected',
    hideconstructor: true,
    name: 'ProtHide',
    longname: 'ProtHide',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 36,
      columnno: 2,
      path: '/src',
      code: {
        name: 'ProtHide',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>ProtHide ctor.</p>',
    access: 'private',
    name: 'ProtHide',
    longname: 'ProtHide',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 31,
      columnno: 0,
      path: '/src',
      code: {
        name: 'ProtHide',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'ProtHide',
    longname: 'ProtHide',
    kind: 'class',
    classdesc: '<p>ProtHide class desc.</p>',
    access: 'protected',
    hideconstructor: true,
    scope: 'global',
    description: '<p>ProtHide ctor.</p>',
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 38,
      columnno: 2,
      path: '/src',
      code: {
        name: 'ProtHide#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'ProtHide#m',
    kind: 'function',
    memberof: 'ProtHide',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 45,
      columnno: 0,
      path: '/src',
      code: {
        name: 'PrivBoth',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>PrivBoth class desc.</p>',
    access: 'private',
    name: 'PrivBoth',
    longname: 'PrivBoth',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 50,
      columnno: 2,
      path: '/src',
      code: {
        name: 'PrivBoth',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>PrivBoth ctor.</p>',
    access: 'private',
    name: 'PrivBoth',
    longname: 'PrivBoth',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 45,
      columnno: 0,
      path: '/src',
      code: {
        name: 'PrivBoth',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'PrivBoth',
    longname: 'PrivBoth',
    kind: 'class',
    classdesc: '<p>PrivBoth class desc.</p>',
    access: 'private',
    scope: 'global',
    description: '<p>PrivBoth ctor.</p>',
  },
  {
    meta: {
      filename: 'controls.js',
      lineno: 52,
      columnno: 2,
      path: '/src',
      code: {
        name: 'PrivBoth#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'PrivBoth#m',
    kind: 'function',
    memberof: 'PrivBoth',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'nested-trap.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Trap',
        type: 'ClassDeclaration',
        paramnames: ['a'],
      },
    },
    classdesc: '<p>Trap class desc.</p>',
    access: 'protected',
    name: 'Trap',
    longname: 'Trap',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Trap',
        type: 'MethodDefinition',
        paramnames: ['a'],
      },
    },
    description: '<p>Trap public ctor.</p>',
    params: [
      {
        type: {
          names: ['number'],
        },
        description: '<p>the a</p>',
        name: 'a',
      },
    ],
    name: 'Trap',
    longname: 'Trap',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Trap',
        type: 'ClassDeclaration',
        paramnames: ['a'],
      },
    },
    name: 'Trap',
    longname: 'Trap',
    kind: 'class',
    classdesc: '<p>Trap class desc.</p>',
    access: 'protected',
    scope: 'global',
    description: '<p>Trap public ctor.</p>',
    params: [
      {
        type: {
          names: ['number'],
        },
        description: '<p>the a</p>',
        name: 'a',
      },
    ],
  },
  {
    meta: {
      filename: 'nested-trap.js',
      lineno: 12,
      columnno: 4,
      path: '/src',
      code: {
        name: 'Trap',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Inner Trap desc.</p>',
    name: 'Trap',
    longname: 'Trap',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap.js',
      lineno: 17,
      columnno: 6,
      path: '/src',
      code: {
        name: 'Trap',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Inner Trap ctor.</p>',
    access: 'private',
    name: 'Trap',
    longname: 'Trap',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap.js',
      lineno: 12,
      columnno: 4,
      path: '/src',
      code: {
        name: 'Trap',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Trap',
    longname: 'Trap',
    kind: 'class',
    classdesc: '<p>Inner Trap desc.</p>',
    scope: 'global',
    description: '<p>Inner Trap ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'nested-trap.js',
      lineno: 21,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Trap#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Trap#m',
    kind: 'function',
    memberof: 'Trap',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Trap2',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Trap2 class desc.</p>',
    access: 'protected',
    name: 'Trap2',
    longname: 'Trap2',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 6,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Trap2',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    undocumented: true,
    name: 'Trap2',
    longname: 'Trap2',
    kind: 'class',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Trap2',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Trap2',
    longname: 'Trap2',
    kind: 'class',
    classdesc: '<p>Trap2 class desc.</p>',
    access: 'protected',
    scope: 'global',
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 8,
      columnno: 4,
      path: '/src',
      code: {
        name: 'Trap2',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Inner Trap2 desc.</p>',
    name: 'Trap2',
    longname: 'Trap2',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 13,
      columnno: 6,
      path: '/src',
      code: {
        name: 'Trap2',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Inner Trap2 ctor.</p>',
    access: 'private',
    name: 'Trap2',
    longname: 'Trap2',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 8,
      columnno: 4,
      path: '/src',
      code: {
        name: 'Trap2',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Trap2',
    longname: 'Trap2',
    kind: 'class',
    classdesc: '<p>Inner Trap2 desc.</p>',
    scope: 'global',
    description: '<p>Inner Trap2 ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 17,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Trap2#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Trap2#m',
    kind: 'function',
    memberof: 'Trap2',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 24,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Trap3',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Trap3 class desc.</p>',
    access: 'protected',
    name: 'Trap3',
    longname: 'Trap3',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 26,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Trap3#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Trap3#m',
    kind: 'function',
    memberof: 'Trap3',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 28,
      columnno: 4,
      path: '/src',
      code: {
        name: 'Trap3',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Inner Trap3 desc.</p>',
    name: 'Trap3',
    longname: 'Trap3',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 33,
      columnno: 6,
      path: '/src',
      code: {
        name: 'Trap3',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Inner Trap3 ctor.</p>',
    access: 'private',
    name: 'Trap3',
    longname: 'Trap3',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 28,
      columnno: 4,
      path: '/src',
      code: {
        name: 'Trap3',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Trap3',
    longname: 'Trap3',
    kind: 'class',
    classdesc: '<p>Inner Trap3 desc.</p>',
    scope: 'global',
    description: '<p>Inner Trap3 ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 42,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Trap4',
        type: 'ClassDeclaration',
        paramnames: ['b'],
      },
    },
    classdesc: '<p>Trap4 class desc.</p>',
    access: 'protected',
    name: 'Trap4',
    longname: 'Trap4',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 44,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Trap4#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Trap4#m',
    kind: 'function',
    memberof: 'Trap4',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 46,
      columnno: 4,
      path: '/src',
      code: {
        name: 'Trap4',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: '<p>Inner Trap4 desc.</p>',
    name: 'Trap4',
    longname: 'Trap4',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 51,
      columnno: 6,
      path: '/src',
      code: {
        name: 'Trap4',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Inner Trap4 ctor.</p>',
    access: 'private',
    name: 'Trap4',
    longname: 'Trap4',
    kind: 'class',
    scope: 'global',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 46,
      columnno: 4,
      path: '/src',
      code: {
        name: 'Trap4',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    name: 'Trap4',
    longname: 'Trap4',
    kind: 'class',
    classdesc: '<p>Inner Trap4 desc.</p>',
    scope: 'global',
    description: '<p>Inner Trap4 ctor.</p>',
    access: 'private',
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 58,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Trap4',
        type: 'MethodDefinition',
        paramnames: ['b'],
      },
    },
    description: '<p>Trap4 public ctor.</p>',
    params: [
      {
        type: {
          names: ['number'],
        },
        description: '<p>the b</p>',
        name: 'b',
      },
    ],
    name: 'Trap4',
    longname: 'Trap4',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested-trap-variants.js',
      lineno: 42,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Trap4',
        type: 'ClassDeclaration',
        paramnames: ['b'],
      },
    },
    name: 'Trap4',
    longname: 'Trap4',
    kind: 'class',
    classdesc: '<p>Trap4 class desc.</p>',
    access: 'protected',
    scope: 'global',
    description: '<p>Trap4 public ctor.</p>',
    params: [
      {
        type: {
          names: ['number'],
        },
        description: '<p>the b</p>',
        name: 'b',
      },
    ],
  },
];

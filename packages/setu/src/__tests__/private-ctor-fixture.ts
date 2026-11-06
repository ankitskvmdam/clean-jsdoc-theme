/**
 * Real JSDoc 4.0.5 `-X` output (meta trimmed, `comment` dropped) for the
 * source files below — `a.js`, then `cjs.js` from `/** @module cjsmod *∕` on,
 * then the files named further down
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

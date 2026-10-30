/**
 * Real JSDoc 4.0.5 `-X` output (meta trimmed, `comment` dropped) for the two
 * source files below — `a.js`, then `cjs.js` from `/** @module cjsmod *∕` on
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
];

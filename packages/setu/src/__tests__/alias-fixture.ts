/**
 * Real JSDoc 4.0.5 `-X` output (meta trimmed, `comment` dropped, `meta.path`
 * normalised to `/src`; undocumented records KEPT) for classes renamed with
 * `@alias` (#374). `*∕` stands for a comment close.
 *
 * JSDoc names the merged class doclet after the alias, but leaves the methods
 * of an aliased `Ns.Foo = class {…}` (and an ES5 `Ns.Old = function`, an
 * `exports.Foo = class` / `export class Foo` in a `@module`) under the
 * ORIGINAL name: `memberof: 'Ns.Foo'`, `longname: 'Ns.Foo#m'`. Only
 * `this.x` fields follow the alias. A global-scope alias also keeps a stale
 * `memberof: 'Ns'` from the constructor comment.
 *
 * ALIAS_DOCLETS — one run over these files, in order:
 *
 * nested.js:
 *
 * /**
 *  * Namespace.
 *  * @namespace
 *  *∕
 * const Ns = {};
 *
 * /**
 *  * Other class.
 *  * @alias Other
 *  *∕
 * Ns.Foo = class {
 *   /**
 *    * Make one.
 *    * @param {number} x the x
 *    *∕
 *   constructor(x) {
 *     /** f field. *∕
 *     this.f = x;
 *   }
 *
 *   /**
 *    * ev event.
 *    * @event Ns.Foo#ev
 *    * @type {object}
 *    *∕
 *
 *   /** m method. See {@link Ns.Foo#m} and {@link Other.s}. *∕
 *   m() {}
 *
 *   /** s static. *∕
 *   static s() {}
 *
 *   /** g getter. *∕
 *   get g() {
 *     return 1;
 *   }
 * };
 *
 * /** late static. *∕
 * Ns.Foo.late = function () {};
 *
 * /**
 *  * Options.
 *  * @typedef {object} Ns.Foo.Opts
 *  * @property {number} a the a
 *  *∕
 *
 * /**
 *  * Sub class.
 *  * @extends Other
 *  *∕
 * class Sub extends Ns.Foo {}
 *
 * dotted.js:
 *
 * /**
 *  * Inner namespace.
 *  * @namespace
 *  *∕
 * Ns.In = {};
 *
 * /**
 *  * Pub class.
 *  * @alias Ns.Pub
 *  *∕
 * Ns.In.Foo = class {
 *   /** m method. *∕
 *   m() {}
 * };
 *
 * /** Inner class. *∕
 * Ns.In.Foo.Inner = class {
 *   /** im method. *∕
 *   im() {}
 * };
 *
 * es5.js:
 *
 * /**
 *  * Es class.
 *  * @class
 *  * @alias Es
 *  *∕
 * Ns.Old = function () {
 *   /** tp field. *∕
 *   this.tp = 1;
 * };
 *
 * /** pm prototype method. *∕
 * Ns.Old.prototype.pm = function () {};
 *
 * /** sm static. *∕
 * Ns.Old.sm = function () {};
 *
 * decl.js:
 *
 * /**
 *  * Bar class.
 *  * @alias Bar
 *  *∕
 * class Foo {
 *   /** bm method. *∕
 *   bm() {}
 * }
 *
 * priv.js:
 *
 * /**
 *  * Pc class.
 *  * @alias Pc
 *  *∕
 * Ns.Pv = class {
 *   /**
 *    * Secret ctor.
 *    * @private
 *    *∕
 *   constructor() {}
 *
 *   /** pcm method. *∕
 *   pcm() {}
 * };
 *
 * /**
 *  * Hidden class.
 *  * @alias Hid
 *  * @private
 *  *∕
 * Ns.Hd = class {
 *   /** hm method. *∕
 *   hm() {}
 * };
 */
export const ALIAS_DOCLETS: unknown[] = [
  {
    meta: {
      filename: 'nested.js',
      lineno: 5,
      columnno: 6,
      path: '/src',
      code: {
        name: 'Ns',
        type: 'ObjectExpression',
      },
    },
    description: 'Namespace.',
    kind: 'namespace',
    name: 'Ns',
    longname: 'Ns',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 11,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Foo',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: 'Other class.',
    alias: 'Other',
    name: 'Other',
    longname: 'Other',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 16,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.Foo',
        type: 'MethodDefinition',
        paramnames: ['x'],
      },
    },
    description: 'Make one.',
    params: [
      {
        type: {
          names: ['number'],
        },
        description: 'the x',
        name: 'x',
      },
    ],
    name: 'Foo',
    longname: 'Ns.Foo',
    kind: 'class',
    memberof: 'Ns',
    scope: 'static',
    undocumented: true,
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 11,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Foo',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    name: 'Other',
    longname: 'Other',
    kind: 'class',
    classdesc: 'Other class.',
    alias: 'Other',
    scope: 'global',
    description: 'Make one.',
    memberof: 'Ns',
    params: [
      {
        type: {
          names: ['number'],
        },
        description: 'the x',
        name: 'x',
      },
    ],
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 18,
      columnno: 4,
      path: '/src',
      code: {
        name: 'this.f',
        type: 'Identifier',
        paramnames: [],
      },
    },
    description: 'f field.',
    name: 'f',
    longname: 'Other#f',
    kind: 'member',
    memberof: 'Other',
    scope: 'instance',
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 21,
      columnno: 2,
      path: '/src',
      code: {},
    },
    description: 'ev event.',
    kind: 'event',
    name: 'ev',
    type: {
      names: ['object'],
    },
    memberof: 'Ns.Foo',
    longname: 'Ns.Foo#event:ev',
    scope: 'instance',
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 28,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.Foo#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'm method. See {@link Ns.Foo#m} and {@link Other.s}.',
    name: 'm',
    longname: 'Ns.Foo#m',
    kind: 'function',
    memberof: 'Ns.Foo',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 31,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.Foo.s',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 's static.',
    name: 's',
    longname: 'Ns.Foo.s',
    kind: 'function',
    memberof: 'Ns.Foo',
    scope: 'static',
    params: [],
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 34,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.Foo#g',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'g getter.',
    name: 'g',
    longname: 'Ns.Foo#g',
    kind: 'member',
    memberof: 'Ns.Foo',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 40,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Foo.late',
        type: 'FunctionExpression',
        paramnames: [],
      },
    },
    description: 'late static.',
    name: 'late',
    longname: 'Ns.Foo.late',
    kind: 'function',
    memberof: 'Ns.Foo',
    scope: 'static',
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 42,
      columnno: 0,
      path: '/src',
      code: {},
    },
    description: 'Options.',
    kind: 'typedef',
    name: 'Opts',
    type: {
      names: ['object'],
    },
    properties: [
      {
        type: {
          names: ['number'],
        },
        description: 'the a',
        name: 'a',
      },
    ],
    memberof: 'Ns.Foo',
    longname: 'Ns.Foo.Opts',
    scope: 'static',
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 52,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Sub',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: 'Sub class.',
    augments: ['Other'],
    name: 'Sub',
    longname: 'Sub',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'dotted.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.In',
        type: 'ObjectExpression',
        paramnames: [],
      },
    },
    description: 'Inner namespace.',
    kind: 'namespace',
    name: 'In',
    longname: 'Ns.In',
    memberof: 'Ns',
    scope: 'static',
  },
  {
    meta: {
      filename: 'dotted.js',
      lineno: 11,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.In.Foo',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: 'Pub class.',
    alias: 'Ns.Pub',
    name: 'Pub',
    longname: 'Ns.Pub',
    kind: 'class',
    memberof: 'Ns',
    scope: 'static',
  },
  {
    meta: {
      filename: 'dotted.js',
      lineno: 13,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.In.Foo#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'm method.',
    name: 'm',
    longname: 'Ns.In.Foo#m',
    kind: 'function',
    memberof: 'Ns.In.Foo',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'dotted.js',
      lineno: 17,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.In.Foo.Inner',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: 'Inner class.',
    name: 'Inner',
    longname: 'Ns.In.Foo.Inner',
    kind: 'class',
    memberof: 'Ns.In.Foo',
    scope: 'static',
  },
  {
    meta: {
      filename: 'dotted.js',
      lineno: 19,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.In.Foo.Inner#im',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'im method.',
    name: 'im',
    longname: 'Ns.In.Foo.Inner#im',
    kind: 'function',
    memberof: 'Ns.In.Foo.Inner',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'es5.js',
      lineno: 6,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Old',
        type: 'FunctionExpression',
        paramnames: [],
      },
    },
    description: 'Es class.',
    kind: 'class',
    alias: 'Es',
    name: 'Es',
    longname: 'Es',
    scope: 'global',
  },
  {
    meta: {
      filename: 'es5.js',
      lineno: 8,
      columnno: 2,
      path: '/src',
      code: {
        name: 'this.tp',
        type: 'Literal',
        paramnames: [],
      },
    },
    description: 'tp field.',
    name: 'tp',
    longname: 'Es#tp',
    kind: 'member',
    memberof: 'Es',
    scope: 'instance',
  },
  {
    meta: {
      filename: 'es5.js',
      lineno: 12,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Old.prototype.pm',
        type: 'FunctionExpression',
        paramnames: [],
      },
    },
    description: 'pm prototype method.',
    name: 'pm',
    longname: 'Ns.Old#pm',
    kind: 'function',
    memberof: 'Ns.Old',
    scope: 'instance',
  },
  {
    meta: {
      filename: 'es5.js',
      lineno: 15,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Old.sm',
        type: 'FunctionExpression',
        paramnames: [],
      },
    },
    description: 'sm static.',
    name: 'sm',
    longname: 'Ns.Old.sm',
    kind: 'function',
    memberof: 'Ns.Old',
    scope: 'static',
  },
  {
    meta: {
      filename: 'decl.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    classdesc: 'Bar class.',
    alias: 'Bar',
    name: 'Bar',
    longname: 'Bar',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'decl.js',
      lineno: 7,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo#bm',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'bm method.',
    name: 'bm',
    longname: 'Bar#bm',
    kind: 'function',
    memberof: 'Bar',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'priv.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Pv',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: 'Pc class.',
    alias: 'Pc',
    name: 'Pc',
    longname: 'Pc',
    kind: 'class',
    scope: 'global',
    undocumented: true,
  },
  {
    meta: {
      filename: 'priv.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.Pv',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'Secret ctor.',
    access: 'private',
    name: 'Pv',
    longname: 'Ns.Pv',
    kind: 'class',
    memberof: 'Ns',
    scope: 'static',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'priv.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Pv',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    name: 'Pc',
    longname: 'Pc',
    kind: 'class',
    classdesc: 'Pc class.',
    alias: 'Pc',
    scope: 'global',
    description: 'Secret ctor.',
    access: 'private',
    memberof: 'Ns',
  },
  {
    meta: {
      filename: 'priv.js',
      lineno: 13,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.Pv#pcm',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'pcm method.',
    name: 'pcm',
    longname: 'Ns.Pv#pcm',
    kind: 'function',
    memberof: 'Ns.Pv',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'priv.js',
      lineno: 21,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Hd',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: 'Hidden class.',
    alias: 'Hid',
    access: 'private',
    name: 'Hid',
    longname: 'Hid',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'priv.js',
      lineno: 23,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.Hd#hm',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'hm method.',
    name: 'hm',
    longname: 'Ns.Hd#hm',
    kind: 'function',
    memberof: 'Ns.Hd',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'nested.js',
      lineno: 18,
      columnno: 4,
      path: '/src',
      code: {
        name: 'this.f',
        type: 'Identifier',
        paramnames: [],
      },
    },
    name: 'f',
    longname: 'Sub#f',
    kind: 'member',
    description: 'f field.',
    memberof: 'Sub',
    scope: 'instance',
    inherits: 'Other#f',
    inherited: true,
  },
];

/**
 * Two aliased classes claiming one original name, one run over:
 *
 * collide.js:
 *
 * /**
 *  * Namespace.
 *  * @namespace
 *  *∕
 * const Ns = {};
 *
 * /**
 *  * Aliased class.
 *  * @alias Other
 *  *∕
 * Ns.Foo = class {
 *   /** m method. *∕
 *   m() {}
 * };
 *
 * /** Real Foo. *∕
 * Ns.Foo = class {
 *   /** m2 method. *∕
 *   m2() {}
 * };
 *
 * twice.js:
 *
 * /**
 *  * A class.
 *  * @alias A
 *  *∕
 * Ns.Dup = class {
 *   /** am method. *∕
 *   am() {}
 * };
 *
 * /**
 *  * B class.
 *  * @alias B
 *  *∕
 * Ns.Dup = class {
 *   /** bm method. *∕
 *   bm() {}
 * };
 */
export const ALIAS_COLLISION_DOCLETS: unknown[] = [
  {
    meta: {
      filename: 'collide.js',
      lineno: 5,
      columnno: 6,
      path: '/src',
      code: {
        name: 'Ns',
        type: 'ObjectExpression',
      },
    },
    description: 'Namespace.',
    kind: 'namespace',
    name: 'Ns',
    longname: 'Ns',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'collide.js',
      lineno: 11,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Foo',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: 'Aliased class.',
    alias: 'Other',
    name: 'Other',
    longname: 'Other',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'collide.js',
      lineno: 13,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.Foo#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'm method.',
    name: 'm',
    longname: 'Ns.Foo#m',
    kind: 'function',
    memberof: 'Ns.Foo',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'collide.js',
      lineno: 17,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Foo',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: 'Real Foo.',
    name: 'Foo',
    longname: 'Ns.Foo',
    kind: 'class',
    memberof: 'Ns',
    scope: 'static',
  },
  {
    meta: {
      filename: 'collide.js',
      lineno: 19,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.Foo#m2',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'm2 method.',
    name: 'm2',
    longname: 'Ns.Foo#m2',
    kind: 'function',
    memberof: 'Ns.Foo',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'twice.js',
      lineno: 5,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Dup',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: 'A class.',
    alias: 'A',
    name: 'A',
    longname: 'A',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'twice.js',
      lineno: 7,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.Dup#am',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'am method.',
    name: 'am',
    longname: 'Ns.Dup#am',
    kind: 'function',
    memberof: 'Ns.Dup',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'twice.js',
      lineno: 14,
      columnno: 0,
      path: '/src',
      code: {
        name: 'Ns.Dup',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: 'B class.',
    alias: 'B',
    name: 'B',
    longname: 'B',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'twice.js',
      lineno: 16,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Ns.Dup#bm',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'bm method.',
    name: 'bm',
    longname: 'Ns.Dup#bm',
    kind: 'function',
    memberof: 'Ns.Dup',
    scope: 'instance',
    params: [],
  },
];

/**
 * Aliased classes exported from a `@module`, one run over:
 *
 * esm.js:
 *
 * /** @module m *∕
 *
 * /**
 *  * Bar class.
 *  * @alias module:m.Bar
 *  *∕
 * export class Foo {
 *   /** m method. *∕
 *   m() {}
 * }
 *
 * cjs.js:
 *
 * /** @module c *∕
 *
 * /**
 *  * Baz class.
 *  * @alias module:c.Baz
 *  *∕
 * exports.Foo = class {
 *   /** cm method. *∕
 *   cm() {}
 * };
 */
export const ALIAS_MODULE_DOCLETS: unknown[] = [
  {
    meta: {
      filename: 'esm.js',
      lineno: 1,
      columnno: 0,
      path: '/src',
      code: {},
    },
    kind: 'module',
    name: 'm',
    longname: 'module:m',
  },
  {
    meta: {
      filename: 'esm.js',
      lineno: 7,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.Foo',
        type: 'ClassDeclaration',
      },
    },
    classdesc: 'Bar class.',
    alias: 'module:m.Bar',
    name: 'Bar',
    longname: 'module:m.Bar',
    kind: 'class',
    memberof: 'module:m',
    scope: 'static',
  },
  {
    meta: {
      filename: 'esm.js',
      lineno: 7,
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
    longname: 'module:m.Foo',
    kind: 'class',
    scope: 'static',
    memberof: 'module:m',
  },
  {
    meta: {
      filename: 'esm.js',
      lineno: 9,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'm method.',
    name: 'm',
    longname: 'module:m.Foo#m',
    kind: 'function',
    memberof: 'module:m.Foo',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'cjs.js',
      lineno: 1,
      columnno: 0,
      path: '/src',
      code: {},
    },
    kind: 'module',
    name: 'c',
    longname: 'module:c',
  },
  {
    meta: {
      filename: 'cjs.js',
      lineno: 7,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.Foo',
        type: 'ClassExpression',
        paramnames: [],
      },
    },
    classdesc: 'Baz class.',
    alias: 'module:c.Baz',
    name: 'Baz',
    longname: 'module:c.Baz',
    kind: 'class',
    memberof: 'module:c',
    scope: 'static',
  },
  {
    meta: {
      filename: 'cjs.js',
      lineno: 9,
      columnno: 2,
      path: '/src',
      code: {
        name: 'exports.Foo#cm',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'cm method.',
    name: 'cm',
    longname: 'module:c.Foo#cm',
    kind: 'function',
    memberof: 'module:c.Foo',
    scope: 'instance',
    params: [],
  },
];

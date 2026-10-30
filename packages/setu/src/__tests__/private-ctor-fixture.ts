/**
 * Real JSDoc 4 `-X` output (meta trimmed, `comment` dropped) for the source
 * below (`*∕` stands for a comment close):
 *
 * /** Foo class desc. *∕
 * export class Foo {
 *   /**
 *    * Ctor desc.
 *    * @private
 *    * @param {number} x the x
 *    *∕
 *   constructor(x) {}
 *   /** Public method. *∕
 *   bar() {}
 *   /**
 *    * Private method.
 *    * @private
 *    *∕
 *   baz() {}
 * }
 *
 * /**
 *  * Secret class.
 *  * @private
 *  *∕
 * export class Sec {
 *   /** ctor *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * /**
 *  * Both private.
 *  * @private
 *  *∕
 * export class Both {
 *   /** @private *∕
 *   constructor() {}
 *   /** m *∕
 *   m() {}
 * }
 *
 * export class NoComment {
 *   /**
 *    * Only the constructor is documented.
 *    * @private
 *    *∕
 *   constructor() {}
 *   /** Public n. *∕
 *   n() {}
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
        name: 'exports.Foo',
        type: 'ClassDeclaration',
      },
    },
    classdesc: '<p>Foo class desc.</p>',
    name: 'Foo',
    longname: 'Foo',
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
        name: 'Foo',
        type: 'ClassDeclaration',
        paramnames: ['x'],
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
      filename: 'c.js',
      lineno: 8,
      columnno: 2,
      path: '/src',
      code: {
        name: 'exports.Foo',
        type: 'MethodDefinition',
        paramnames: ['x'],
      },
    },
    description: '<p>Ctor desc.</p>',
    access: 'private',
    params: [
      {
        type: {
          names: ['number'],
        },
        description: '<p>the x</p>',
        name: 'x',
      },
    ],
    name: 'Foo',
    longname: 'Foo#Foo',
    kind: 'class',
    memberof: 'Foo',
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
        name: 'exports.Foo',
        type: 'ClassDeclaration',
      },
    },
    name: 'Foo',
    longname: 'Foo',
    kind: 'class',
    classdesc: '<p>Foo class desc.</p>',
    scope: 'global',
    description: '<p>Ctor desc.</p>',
    access: 'private',
    memberof: 'Foo',
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
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo#bar',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Public method.</p>',
    name: 'bar',
    longname: 'Foo#bar',
    kind: 'function',
    memberof: 'Foo',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 15,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Foo#baz',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Private method.</p>',
    access: 'private',
    name: 'baz',
    longname: 'Foo#baz',
    kind: 'function',
    memberof: 'Foo',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 22,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.Sec',
        type: 'ClassDeclaration',
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
      lineno: 22,
      columnno: 7,
      path: '/src',
      code: {
        name: 'Sec',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    undocumented: true,
    name: 'Sec',
    longname: 'Sec',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 24,
      columnno: 2,
      path: '/src',
      code: {
        name: 'exports.Sec',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>ctor</p>',
    name: 'Sec',
    longname: 'Sec#Sec',
    kind: 'class',
    memberof: 'Sec',
    scope: 'instance',
    params: [],
    undocumented: true,
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 22,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.Sec',
        type: 'ClassDeclaration',
      },
    },
    name: 'Sec',
    longname: 'Sec',
    kind: 'class',
    classdesc: '<p>Secret class.</p>',
    access: 'private',
    scope: 'global',
    description: '<p>ctor</p>',
    memberof: 'Sec',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 26,
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
      lineno: 33,
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
      lineno: 33,
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
      lineno: 35,
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
      lineno: 33,
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
      lineno: 37,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Both#m',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>m</p>',
    name: 'm',
    longname: 'Both#m',
    kind: 'function',
    memberof: 'Both',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 40,
      columnno: 0,
      path: '/src',
      code: {
        name: 'exports.NoComment',
        type: 'ClassDeclaration',
      },
    },
    undocumented: true,
    name: 'NoComment',
    longname: 'NoComment',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 40,
      columnno: 7,
      path: '/src',
      code: {
        name: 'NoComment',
        type: 'ClassDeclaration',
        paramnames: [],
      },
    },
    undocumented: true,
    name: 'NoComment',
    longname: 'NoComment',
    kind: 'class',
    scope: 'global',
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 45,
      columnno: 2,
      path: '/src',
      code: {
        name: 'exports.NoComment',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Only the constructor is documented.</p>',
    access: 'private',
    name: 'NoComment',
    longname: 'NoComment#NoComment',
    kind: 'class',
    memberof: 'NoComment',
    scope: 'instance',
    params: [],
  },
  {
    meta: {
      filename: 'c.js',
      lineno: 47,
      columnno: 2,
      path: '/src',
      code: {
        name: 'NoComment#n',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: '<p>Public n.</p>',
    name: 'n',
    longname: 'NoComment#n',
    kind: 'function',
    memberof: 'NoComment',
    scope: 'instance',
    params: [],
  },
];

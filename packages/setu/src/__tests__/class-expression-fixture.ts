/**
 * Real JSDoc 4.0.5 `-X` output (meta trimmed, `comment` dropped) for the
 * three files below (`*∕` stands for a comment close). JSDoc reports the
 * methods of a class expression passed as an argument or used as an object
 * property value as GLOBAL functions (`longname` = bare name, `scope:
 * 'global'`, no `memberof`): `r`, the static `sr`, `q` and the static `sq`
 * all come out that way, indistinguishable from `register` and `plain` (#375).
 * There is no class doclet for `Reg`; `o.Obj` gets only an undocumented one.
 *
 * arg.js:
 *
 * /** Registers. *∕
 * function register(c) {}
 *
 * register(class Reg {
 *   /** @private *∕
 *   constructor() {}
 *   /** r. *∕
 *   r() {}
 *   /** sr. *∕
 *   static sr() {}
 * });
 *
 * obj.js:
 *
 * const o = {
 *   Obj: class {
 *     /** q. *∕
 *     q() {}
 *     /** sq. *∕
 *     static sq() {}
 *   },
 * };
 *
 * plain.js:
 *
 * /** Plain fn. *∕
 * function plain(a) {}
 *
 * /** counter. *∕
 * let counter = 0;
 */
export const CLASS_EXPRESSION_DOCLETS: unknown[] = [
  {
    meta: {
      filename: 'arg.js',
      lineno: 2,
      columnno: 0,
      path: '/src',
      code: {
        name: 'register',
        type: 'FunctionDeclaration',
        paramnames: ['c'],
      },
    },
    description: 'Registers.',
    name: 'register',
    longname: 'register',
    kind: 'function',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'arg.js',
      lineno: 8,
      columnno: 2,
      path: '/src',
      code: {
        name: 'r',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'r.',
    name: 'r',
    longname: 'r',
    kind: 'function',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'arg.js',
      lineno: 10,
      columnno: 2,
      path: '/src',
      code: {
        name: 'sr',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'sr.',
    name: 'sr',
    longname: 'sr',
    kind: 'function',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'obj.js',
      lineno: 1,
      columnno: 6,
      path: '/src',
      code: {
        name: 'o',
        type: 'ObjectExpression',
        value: '{"Obj":""}',
      },
    },
    undocumented: true,
    name: 'o',
    longname: 'o',
    kind: 'constant',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'obj.js',
      lineno: 2,
      columnno: 2,
      path: '/src',
      code: {
        name: 'Obj',
        type: 'ClassExpression',
        value: '',
      },
    },
    undocumented: true,
    name: 'Obj',
    longname: 'o.Obj',
    kind: 'class',
    memberof: 'o',
    scope: 'static',
  },
  {
    meta: {
      filename: 'obj.js',
      lineno: 4,
      columnno: 4,
      path: '/src',
      code: {
        name: 'q',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'q.',
    name: 'q',
    longname: 'q',
    kind: 'function',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'obj.js',
      lineno: 6,
      columnno: 4,
      path: '/src',
      code: {
        name: 'sq',
        type: 'MethodDefinition',
        paramnames: [],
      },
    },
    description: 'sq.',
    name: 'sq',
    longname: 'sq',
    kind: 'function',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'plain.js',
      lineno: 2,
      columnno: 0,
      path: '/src',
      code: {
        name: 'plain',
        type: 'FunctionDeclaration',
        paramnames: ['a'],
      },
    },
    description: 'Plain fn.',
    name: 'plain',
    longname: 'plain',
    kind: 'function',
    scope: 'global',
    params: [],
  },
  {
    meta: {
      filename: 'plain.js',
      lineno: 5,
      columnno: 4,
      path: '/src',
      code: {
        name: 'counter',
        type: 'Literal',
        value: 0,
      },
    },
    description: 'counter.',
    name: 'counter',
    longname: 'counter',
    kind: 'member',
    scope: 'global',
    params: [],
  },
];

/**
 * Synthesize JSDoc-style `longname` / `memberof` / `scope` from a TypeDoc
 * reflection, using the separators setu queries against:
 *
 *   - `#` — instance member  (`Foo#bar`)
 *   - `.` — static member    (`Foo.baz`)
 *   - `~` — inner symbol     (`Foo~Inner`)
 *   - `module:` — module / namespace container prefix (`module:foo`)
 *
 * These MUST match setu's conventions, because setu finds a container's members
 * with `collection({ memberof: longname })` and builds slugs/anchors from
 * longnames by splitting on exactly these separators (see
 * `setu/src/generate-site.ts` `splitLongnameForSlug` and `utils/.../slug-rules.ts`).
 *
 * ## Module-nesting convention chosen (and why)
 *
 * TypeDoc models each entry point as a `Module` reflection, and `namespace`s as
 * `Namespace` reflections. We mirror JSDoc's `module:`-prefixed convention:
 *
 *   - A module `m`            → `longname: "module:m"`, `scope: "global"`.
 *   - A namespace `N`         → `longname: "module:N"` when top-level, else nested.
 *   - A class `Foo` exported
 *     from module `m`         → `longname: "module:m.Foo"`, `memberof: "module:m"`.
 *
 * However TypeDoc frequently collapses a single entry point so its declarations
 * sit DIRECTLY on the `ProjectReflection` (no intermediate module). In that
 * common case a top-level class is simply `Foo` (no `module:` prefix), exactly
 * like the JSDoc global scope — which produces the cleanest slugs. We therefore
 * derive names from the reflection's parent chain rather than hard-coding a
 * module prefix: a container nested under a module/namespace gets the
 * `module:`-qualified parent; a container sitting on the project root does not.
 *
 * The scope separator between a member and its parent depends on the member, not
 * the parent: instance → `#`, static → `.`. Members of a module/namespace (which
 * have no instances) are treated as static (`.`), matching JSDoc; enum members
 * are likewise static (`Roles.ADMIN`).
 */
import { ReflectionKind } from 'typedoc';
import type { DeclarationReflection, Reflection } from 'typedoc';
import type { TDocletScope } from '@clean-jsdoc-theme/utils';

/** A reflection's place in the JSDoc longname namespace. */
export interface SynthesizedName {
  /** Bare symbol name (`bar`). */
  name: string;
  /** Fully-qualified JSDoc longname (`Foo#bar`). */
  longname: string;
  /** Owning container longname, or `undefined` for a top-level symbol. */
  memberof: string | undefined;
  /** JSDoc scope. */
  scope: TDocletScope;
}

/** Kinds that act as a JSDoc `module:`-prefixed container. */
const MODULE_LIKE = ReflectionKind.Module | ReflectionKind.Namespace | ReflectionKind.Project;

function isModuleLike(reflection: Reflection): boolean {
  return reflection.kindOf(MODULE_LIKE);
}

/**
 * The longname of a reflection's *containing* symbol — i.e. the value its
 * children should use as `memberof`. Returns `undefined` for the project root
 * and for symbols whose only ancestor is the project (top-level / global).
 */
function containerLongname(reflection: Reflection): string | undefined {
  const parent = reflection.parent;
  if (!parent || parent.isProject()) return undefined;
  return longnameOf(parent);
}

/**
 * The scope of `reflection` relative to its container.
 *
 * - Static (`flags.isStatic`) → `static`.
 * - A member with a real container that is NOT module-like → `instance`.
 * - A top-level symbol (no container, or container is module-like) → for a
 *   module-like container it is `static` (modules have no instance scope);
 *   with no container at all it is `global`.
 */
function scopeOf(reflection: Reflection): TDocletScope {
  if (reflection.flags?.isStatic) return 'static';

  const parent = reflection.parent;
  if (!parent || parent.isProject()) return 'global';

  // Members of a module/namespace are static-scoped in JSDoc (`module:m.Foo`).
  if (isModuleLike(parent)) return 'static';

  // Enum members are static-scoped in JSDoc (`Roles.ADMIN`) — they read as
  // constants on the enum, not instance fields.
  if (parent.kindOf(ReflectionKind.Enum)) return 'static';

  // Inner (locals / non-exported) symbols use `~`; TypeDoc rarely surfaces them
  // as documented children, but honor the flag if present.
  return 'instance';
}

/** The separator that joins a member of `scope` to its container longname. */
function separatorFor(scope: TDocletScope): string {
  switch (scope) {
    case 'instance':
      return '#';
    case 'inner':
      return '~';
    case 'static':
    default:
      return '.';
  }
}

/**
 * Build the fully-qualified longname for any reflection. Memoizes nothing —
 * cheap, and reflection trees are small.
 */
export function longnameOf(reflection: Reflection): string {
  if (reflection.isProject()) {
    // The project root has no longname of its own; its children are top-level.
    return '';
  }

  const name = reflection.name;
  const parent = reflection.parent;

  // Top-level symbol: name only, optionally `module:`-prefixed for a module/ns.
  if (!parent || parent.isProject()) {
    return isModuleLike(reflection) ? `module:${name}` : name;
  }

  const parentLongname = longnameOf(parent);

  // A module/namespace nested under another container keeps the `module:` shape.
  if (isModuleLike(reflection)) {
    // `module:` only appears once, at the front of the chain.
    const base = parentLongname.startsWith('module:') ? parentLongname : `module:${parentLongname}`;
    return `${base}.${name}`;
  }

  const scope = scopeOf(reflection);
  return `${parentLongname}${separatorFor(scope)}${name}`;
}

/**
 * Synthesize the full name triple for a declaration reflection. Guarantees
 * `longname !== memberof` (the self-reference bug): a top-level symbol has
 * `memberof: undefined`, and a member's longname is always
 * `<container><sep><name>`, strictly longer than the container.
 */
export function synthesizeName(reflection: DeclarationReflection): SynthesizedName {
  const longname = longnameOf(reflection);
  const memberof = containerLongname(reflection);
  const scope = scopeOf(reflection);

  return {
    name: reflection.name,
    longname,
    memberof,
    scope,
  };
}

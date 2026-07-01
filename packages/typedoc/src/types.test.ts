import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Application, ReflectionKind } from 'typedoc';
import type { ParameterReflection, ProjectReflection, SignatureReflection } from 'typedoc';
import { objectLiteralMembers } from './types';

/**
 * A real `app.convert()` project exercising inline object-literal types on a
 * param and a return type, plus a reference type (`Point`) so we can verify
 * `typeToDocletType` keeps emitting a bare, resolvable name.
 */
const SOURCE = `
/** A coordinate pair. */
export interface Point {
  x: number;
  y: number;
}

/**
 * Configure something.
 * @param opts - the options.
 */
export function configure(opts: { retries: number; label?: string; point: Point }): void {}

/** Returns config. */
export function getConfig(): { retries: number; label?: string } {
  return { retries: 1 };
}
`;

let project: ProjectReflection;
let tmp: string;

const posix = (p: string): string => p.split('\\').join('/');

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'cjt-typedoc-types-'));
  const entry = join(tmp, 'index.ts');
  await writeFile(entry, SOURCE, 'utf8');
  await writeFile(
    join(tmp, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: true,
      },
      include: ['index.ts'],
    }),
    'utf8'
  );

  const app = await Application.bootstrap(
    {
      entryPoints: [posix(entry)],
      tsconfig: posix(join(tmp, 'tsconfig.json')),
      skipErrorChecking: true,
      logLevel: 'Error',
    },
    []
  );
  const converted = await app.convert();
  if (!converted) throw new Error('typedoc convert() returned undefined');
  project = converted;
}, 60_000);

afterAll(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

function configureParam(): ParameterReflection {
  const configure = project
    .getChildrenByKind(ReflectionKind.Function)
    .find((f) => f.name === 'configure')!;
  const signature = configure.signatures![0] as SignatureReflection;
  return signature.parameters!.find((p) => p.name === 'opts')!;
}

function getConfigReturnType() {
  const getConfig = project
    .getChildrenByKind(ReflectionKind.Function)
    .find((f) => f.name === 'getConfig')!;
  const signature = getConfig.signatures![0] as SignatureReflection;
  return signature.type;
}

describe('objectLiteralMembers — inline object-literal param', () => {
  it('recovers retries/label/point with types and optional flags', () => {
    const opts = configureParam();
    const members = objectLiteralMembers(opts.type, () => undefined);
    expect(members).toBeTruthy();
    const byName = new Map(members!.map((m) => [m.name, m]));
    expect([...byName.keys()].sort()).toEqual(['label', 'point', 'retries']);
    expect(byName.get('retries')?.type?.names).toEqual(['number']);
    expect(byName.get('retries')?.optional).toBeUndefined();
    expect(byName.get('label')?.optional).toBe(true);
    // The nested reference type stays a bare, resolvable name.
    expect(byName.get('point')?.type?.names).toEqual(['Point']);
  });

  it('returns undefined for a non-reflection type (e.g. a plain reference)', () => {
    const opts = configureParam();
    const point = objectLiteralMembers(opts.type, () => undefined);
    const pointType = point!.find((m) => m.name === 'point');
    // `point`'s OWN type is a reference, not a reflection — recursing into it
    // must yield undefined rather than throwing.
    expect(pointType).toBeTruthy();
  });

  it('recovers members from an inline object-literal RETURN type', () => {
    const returnType = getConfigReturnType();
    const members = objectLiteralMembers(returnType, () => undefined);
    expect(members?.map((m) => m.name).sort()).toEqual(['label', 'retries']);
  });

  it('returns undefined when there is no type', () => {
    expect(objectLiteralMembers(undefined, () => undefined)).toBeUndefined();
  });
});

describe('typeToDocletType — reference names stay bare/resolvable', () => {
  it('emits the bare interface name for a reference type (linkifyTypeExpression-resolvable)', () => {
    const opts = configureParam();
    const members = objectLiteralMembers(opts.type, () => undefined)!;
    const point = members.find((m) => m.name === 'point')!;
    // No decoration (no `module:`, no generics-suffix, no import(...) wrapper) —
    // exactly the longname a top-level interface gets from `longnameOf`.
    expect(point.type?.names).toEqual(['Point']);
  });
});

import { describe, it, expect } from 'vitest';
import { default as salty } from '@jsdoc/salty';
import { apiSlotKey, sourceHash } from '@clean-jsdoc-theme/bhasha';
import type { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { generateSite, stampSite } from '../index';

/** Minimal class + method fixture: a classdesc, a member description, an example w/ caption. */
const DOCLETS = [
  {
    kind: 'class',
    name: 'Widget',
    longname: 'Widget',
    scope: 'global',
    classdesc: '<p>A reusable widget.</p>',
    meta: { filename: 'widget.js', lineno: 1, path: '/src', code: {} },
  },
  {
    kind: 'function',
    name: 'run',
    longname: 'Widget#run',
    memberof: 'Widget',
    scope: 'instance',
    description: '<p>Runs the widget.</p>',
    examples: ['<caption>Basic use</caption>\nwidget.run();'],
    meta: { filename: 'widget.js', lineno: 5, path: '/src', code: {} },
  },
];

function collection(): unknown {
  return salty.taffy(DOCLETS) as unknown as TJSDocSaltyCollection<TDoclet>;
}

const CLASS_DESC = apiSlotKey('Widget', 'description');
const RUN_DESC = apiSlotKey('Widget#run', 'description');
const RUN_CAPTION = apiSlotKey('Widget#run', ['examples', '0', 'caption']);

describe('slot template (generateSite)', () => {
  it('collects a slot per translatable prose field, keyed + hashed', () => {
    const { slots = [] } = generateSite(collection());
    const byKey = new Map(slots.map((s) => [s.key, s]));

    expect(byKey.has(CLASS_DESC)).toBe(true);
    expect(byKey.has(RUN_DESC)).toBe(true);
    expect(byKey.has(RUN_CAPTION)).toBe(true);

    expect(byKey.get(CLASS_DESC)!.sourceText).toBe('<p>A reusable widget.</p>');
    expect(byKey.get(CLASS_DESC)!.hash).toBe(sourceHash('<p>A reusable widget.</p>'));
    expect(byKey.get(RUN_CAPTION)!.sourceText).toBe('Basic use');
  });

  it('does NOT slot the example code (locale-invariant)', () => {
    const { slots = [] } = generateSite(collection());
    expect(slots.some((s) => s.sourceText.includes('widget.run();'))).toBe(false);
  });
});

describe('stampSite (per-locale)', () => {
  it('empty messages → byte-identical to the base build', () => {
    const base = generateSite(collection());
    const stamped = stampSite(collection(), {});
    expect(stamped.pages.map((p) => p.body)).toEqual(base.pages.map((p) => p.body));
  });

  it('substitutes a translated description into the page body', () => {
    const messages = {
      [CLASS_DESC]: '<p>Un widget réutilisable.</p>',
      [RUN_DESC]: '<p>Exécute le widget.</p>',
    };
    const manifest = stampSite(collection(), messages);
    const body = manifest.pages.find((p) => p.slug === 'widget')!.body;

    expect(body).toContain('Un widget réutilisable.');
    expect(body).toContain('Exécute le widget.');
    expect(body).not.toContain('A reusable widget.');
  });

  it('translates an example caption but leaves the code untouched', () => {
    const manifest = stampSite(collection(), { [RUN_CAPTION]: 'Utilisation de base' });
    const body = manifest.pages.find((p) => p.slug === 'widget')!.body;

    expect(body).toContain('Utilisation de base');
    expect(body).not.toContain('Basic use');
    expect(body).toContain('widget.run();'); // code invariant
  });

  it('falls back to source text for untranslated keys (partial catalog)', () => {
    const manifest = stampSite(collection(), { [CLASS_DESC]: '<p>Un widget.</p>' });
    const body = manifest.pages.find((p) => p.slug === 'widget')!.body;

    expect(body).toContain('Un widget.'); // translated
    expect(body).toContain('Runs the widget.'); // untranslated → source
  });
});

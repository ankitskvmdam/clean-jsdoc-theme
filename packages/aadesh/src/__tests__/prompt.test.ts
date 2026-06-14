import { describe, it, expect } from 'vitest';
import { sourceHash } from '@clean-jsdoc-theme/bhasha';
import { buildPrompts, collectTranslatable, type PromptItem } from '../prompt';
import { emptyLocaleFile, toLocaleFile, type Template } from '../locale';

const t = (key: string, source: string) => ({ key, source, hash: sourceHash(source) });
const template: Template = [
  t('chrome.search.recent', 'Recent'),
  t('api.X#d', 'A'),
  t('api.Y#d', 'B'),
];

/** Build a locale file with given active entries (full key → {value, hash}). */
function fileWith(entries: Record<string, { value: string; hash: string }>) {
  const active = new Map(Object.entries(entries));
  return toLocaleFile(
    active,
    new Map(),
    template.map((e) => e.key)
  );
}

describe('collectTranslatable', () => {
  it('returns untranslated (new) and source-drifted (stale) entries, skips up-to-date', () => {
    const file = fileWith({
      'chrome.search.recent': { value: 'Récent', hash: sourceHash('Recent') }, // up-to-date → skip
      'api.X#d': { value: '', hash: sourceHash('A') }, // untranslated → new
      'api.Y#d': { value: 'Vieux', hash: sourceHash('OLD') }, // hash drift → stale
    });
    const items = collectTranslatable(template, file);
    const byKey = new Map(items.map((i) => [i.key, i]));

    expect(byKey.has('chrome.search.recent')).toBe(false);
    expect(byKey.get('api.X#d')).toMatchObject({ stale: false, source: 'A' });
    expect(byKey.get('api.Y#d')).toMatchObject({ stale: true, source: 'B', current: 'Vieux' });
  });

  it('treats a brand-new file as all-untranslated', () => {
    const items = collectTranslatable(template, emptyLocaleFile());
    expect(items).toHaveLength(template.length);
    expect(items.every((i) => !i.stale)).toBe(true);
  });
});

describe('buildPrompts', () => {
  const items: PromptItem[] = [
    { key: 'api.X#d', source: 'Has {count} items', stale: false },
    { key: 'api.Y#d', source: 'See {@link Foo}', current: 'Voir', stale: true },
  ];

  it('returns [] when there is nothing to translate', () => {
    expect(buildPrompts({ locale: 'fr', items: [] })).toEqual([]);
  });

  it('emits the contract (rules, return-shape) + the entries', () => {
    const [prompt] = buildPrompts({ locale: 'fr', name: 'Français', items });
    expect(prompt).toContain('Français (fr)');
    expect(prompt).toContain('{token}'); // the preserve-tokens rule
    expect(prompt).toContain('{@link');
    expect(prompt).toContain('"<key>": "<translation>"'); // return shape
    expect(prompt).toContain('"api.X#d"');
    expect(prompt).toContain('Has {count} items');
    expect(prompt).toContain('"current": "Voir"'); // stale revision context
  });

  it('chunks by chunkSize', () => {
    const chunks = buildPrompts({ locale: 'fr', items, chunkSize: 1 });
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toContain('chunk 1/2');
    expect(chunks[1]).toContain('chunk 2/2');
    // each chunk carries only its own entry
    expect(chunks[0]).toContain('api.X#d');
    expect(chunks[0]).not.toContain('api.Y#d');
  });
});

import { describe, it, expect } from 'vitest';
import { sourceHash } from '@clean-jsdoc-theme/bhasha';
import type { SlotEntry } from '@clean-jsdoc-theme/utils';
import {
  buildTemplate,
  coverageRatio,
  localeMessages,
  mergeLocale,
  parseLocaleFile,
  serializeLocaleFile,
  type Template,
} from '../locale';

const slot = (key: string, sourceText: string): SlotEntry => ({
  key,
  sourceText,
  hash: sourceHash(sourceText),
});

function template(...slots: SlotEntry[]): Template {
  // Use the api slots directly; tests assert against api keys (chrome is large).
  return slots.map((s) => ({ key: s.key, source: s.sourceText, hash: s.hash }));
}

describe('buildTemplate', () => {
  it('includes the chrome catalog keys plus the api slots', () => {
    const t = buildTemplate([slot('api.Widget#description', '<p>A widget.</p>')]);
    const keys = t.map((e) => e.key);
    expect(keys).toContain('chrome.search.recent'); // from EN_CHROME
    expect(keys).toContain('api.Widget#description');
    const api = t.find((e) => e.key === 'api.Widget#description')!;
    expect(api.source).toBe('<p>A widget.</p>');
    expect(api.hash).toBe(sourceHash('<p>A widget.</p>'));
  });

  it('dedupes repeated slot keys (first wins)', () => {
    const t = buildTemplate([slot('api.X#d', 'first'), slot('api.X#d', 'second')]);
    expect(t.filter((e) => e.key === 'api.X#d')).toHaveLength(1);
  });
});

describe('locale file round-trip + messages', () => {
  it('serializes deterministically and parses back', () => {
    const t = template(slot('api.X#d', 'A'));
    const { file } = mergeLocale(t, null, { locale: 'en', isDefault: true });
    const json = serializeLocaleFile(file);
    expect(json.endsWith('\n')).toBe(true);
    expect(serializeLocaleFile(parseLocaleFile(json))).toBe(json);
  });

  it('localeMessages splits non-empty translations into full chrome.* / api.* keys', () => {
    const t = [
      { key: 'chrome.search.recent', source: 'Recent', hash: sourceHash('Recent') },
      { key: 'api.X#d', source: 'A', hash: sourceHash('A') },
    ];
    const { file } = mergeLocale(t, null, { locale: 'fr' });
    // Fill one translation, leave the other empty.
    file.api['X#d'] = 'Traduit';
    const msgs = localeMessages(file);
    expect(msgs.api['api.X#d']).toBe('Traduit');
    expect(msgs.chrome['chrome.search.recent']).toBeUndefined(); // empty → omitted
  });
});

describe('mergeLocale — first run', () => {
  it('default locale is the skeleton (values = source, 100% covered, all added)', () => {
    const t = template(slot('api.X#d', 'A'), slot('api.Y#d', 'B'));
    const { file, report } = mergeLocale(t, null, { locale: 'en', isDefault: true });
    expect(file.api['X#d']).toBe('A');
    expect(report.added).toHaveLength(2);
    expect(report.translated).toBe(2);
    expect(coverageRatio(report)).toBe(1);
  });

  it('a non-default locale starts empty (0% covered, all added)', () => {
    const t = template(slot('api.X#d', 'A'));
    const { file, report } = mergeLocale(t, null, { locale: 'fr' });
    expect(file.api['X#d']).toBe('');
    expect(report.translated).toBe(0);
    expect(coverageRatio(report)).toBe(0);
  });
});

describe('mergeLocale — determinism', () => {
  it('a no-change re-merge is byte-identical (zero diff)', () => {
    const t = template(slot('api.X#d', 'A'), slot('api.Y#d', 'B'));
    const first = mergeLocale(t, null, { locale: 'fr' });
    const second = mergeLocale(t, first.file, { locale: 'fr' });
    expect(serializeLocaleFile(second.file)).toBe(serializeLocaleFile(first.file));
    expect(second.report.added).toHaveLength(0);
    expect(second.report.stale).toHaveLength(0);
    expect(second.report.obsolete).toHaveLength(0);
  });
});

describe('mergeLocale — staleness', () => {
  it('flags a translated value whose source changed, keeps the value AND the old hash', () => {
    const v1 = template(slot('api.X#d', 'A'));
    const fr = mergeLocale(v1, null, { locale: 'fr' });
    fr.file.api['X#d'] = 'Traduit'; // translator fills it (tracking source 'A')

    const v2 = template(slot('api.X#d', 'B')); // source changed
    const merged = mergeLocale(v2, fr.file, { locale: 'fr' });

    expect(merged.report.stale).toContain('api.X#d');
    expect(merged.file.api['X#d']).toBe('Traduit'); // work preserved
    // Hash stays at the pre-change source so the key remains flagged stale until
    // the translation is actually re-done (not silently cleared at extract time).
    expect(merged.file._hashes['api.X#d']).toBe(sourceHash('A'));
  });

  it('keeps reporting a stale key on repeated extracts (does not clear after one run)', () => {
    const v1 = template(slot('api.X#d', 'A'));
    const fr = mergeLocale(v1, null, { locale: 'fr' });
    fr.file.api['X#d'] = 'Traduit';

    const v2 = template(slot('api.X#d', 'B'));
    const once = mergeLocale(v2, fr.file, { locale: 'fr' });
    const twice = mergeLocale(v2, once.file, { locale: 'fr' });

    expect(once.report.stale).toContain('api.X#d');
    expect(twice.report.stale).toContain('api.X#d'); // still stale — prompt keeps surfacing it
  });

  it('the default locale is never stale (always re-synced to source)', () => {
    const v1 = template(slot('api.X#d', 'A'));
    const en = mergeLocale(v1, null, { locale: 'en', isDefault: true });
    const v2 = template(slot('api.X#d', 'B'));
    const merged = mergeLocale(v2, en.file, { locale: 'en', isDefault: true });
    expect(merged.report.stale).toHaveLength(0);
    expect(merged.file.api['X#d']).toBe('B');
  });

  it('an untranslated (empty) value is not stale on source change', () => {
    const v1 = template(slot('api.X#d', 'A'));
    const fr = mergeLocale(v1, null, { locale: 'fr' }); // value stays ''
    const v2 = template(slot('api.X#d', 'B'));
    const merged = mergeLocale(v2, fr.file, { locale: 'fr' });
    expect(merged.report.stale).toHaveLength(0);
  });
});

describe('mergeLocale — obsolete + prune + resurrect', () => {
  it('soft-deletes a removed key into _obsolete (not pruned)', () => {
    const v1 = template(slot('api.X#d', 'A'), slot('api.Y#d', 'B'));
    const fr = mergeLocale(v1, null, { locale: 'fr' });
    fr.file.api['Y#d'] = 'gardé';

    const v2 = template(slot('api.X#d', 'A')); // Y removed
    const merged = mergeLocale(v2, fr.file, { locale: 'fr' });

    expect(merged.report.obsolete).toContain('api.Y#d');
    expect(merged.report.pruned).toHaveLength(0);
    expect(merged.file.api['Y#d']).toBeUndefined();
    expect(merged.file._obsolete['api.Y#d']).toEqual({ value: 'gardé', hash: sourceHash('B') });
  });

  it('--prune drops obsolete entries for good', () => {
    const v1 = template(slot('api.X#d', 'A'), slot('api.Y#d', 'B'));
    const fr = mergeLocale(v1, null, { locale: 'fr' });
    const v2 = template(slot('api.X#d', 'A'));
    const merged = mergeLocale(v2, fr.file, { locale: 'fr', prune: true });
    expect(merged.report.pruned).toContain('api.Y#d');
    expect(merged.file._obsolete['api.Y#d']).toBeUndefined();
  });

  it('resurrects a translation from _obsolete when its symbol returns', () => {
    const v1 = template(slot('api.X#d', 'A'), slot('api.Y#d', 'B'));
    const fr = mergeLocale(v1, null, { locale: 'fr' });
    fr.file.api['Y#d'] = 'revenu';

    // Y removed → soft-deleted.
    const soft = mergeLocale(template(slot('api.X#d', 'A')), fr.file, { locale: 'fr' });
    expect(soft.file._obsolete['api.Y#d']).toBeDefined();

    // Y comes back → restored from _obsolete, not re-asked.
    const back = mergeLocale(v1, soft.file, { locale: 'fr' });
    expect(back.report.added).toContain('api.Y#d');
    expect(back.file.api['Y#d']).toBe('revenu');
    expect(back.file._obsolete['api.Y#d']).toBeUndefined();
  });
});

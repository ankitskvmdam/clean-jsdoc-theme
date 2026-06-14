import { describe, it, expect, afterEach } from 'vitest';
import { render as rtl, cleanup, fireEvent } from '@testing-library/preact';
import { render } from 'preact-render-to-string';
import { LanguageSwitcher, type LanguageOption } from '../components/LanguageSwitcher';

const locales: LanguageOption[] = [
  { code: 'en', label: 'English', href: '/page' },
  { code: 'fr', label: 'Français', href: '/fr/page' },
];

describe('LanguageSwitcher', () => {
  afterEach(() => cleanup());

  it('renders nothing with one (or zero) locales', () => {
    expect(render(<LanguageSwitcher locales={[locales[0]]} current="en" />)).toBe('');
    expect(render(<LanguageSwitcher locales={[]} current="en" />)).toBe('');
  });

  it('renders a globe trigger labelled "Language"', () => {
    const html = render(<LanguageSwitcher locales={locales} current="en" />);
    expect(html).toContain('aria-label="Language"');
    expect(html).toContain('aria-haspopup="menu"');
  });

  it('lists each locale as a navigation link to its per-locale URL', async () => {
    const { getByRole, findByRole } = rtl(<LanguageSwitcher locales={locales} current="en" />);
    fireEvent.click(getByRole('button', { name: 'Language' }));
    const fr = await findByRole('menuitem', { name: 'Français' });
    expect(fr.getAttribute('href')).toBe('/fr/page');
    const en = getByRole('menuitem', { name: 'English' });
    expect(en.getAttribute('href')).toBe('/page');
  });
});

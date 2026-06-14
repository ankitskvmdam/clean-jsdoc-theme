import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/preact';
import { LanguageProvider, useTranslation } from '../provider';
import { createI18n } from '../translate';

function Greeting() {
  const { t, locale } = useTranslation();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="text">{t('chrome.pager.next')}</span>
      <span data-testid="interp">{t('chrome.theme.switchTo', { mode: 'dark' })}</span>
    </div>
  );
}

describe('useTranslation', () => {
  it('with NO provider renders exact English chrome (byte-identical baseline)', () => {
    const { getByTestId } = render(<Greeting />);
    expect(getByTestId('locale').textContent).toBe('en');
    expect(getByTestId('text').textContent).toBe('Next');
    expect(getByTestId('interp').textContent).toBe('Switch to dark theme');
  });

  it('with a provider renders the active locale and translations', () => {
    const value = createI18n({
      locale: 'fr',
      messages: {
        'chrome.pager.next': 'Suivant',
        'chrome.theme.switchTo': 'Passer au thème {mode}',
      },
    });
    const { getByTestId } = render(
      <LanguageProvider value={value}>
        <Greeting />
      </LanguageProvider>
    );
    expect(getByTestId('locale').textContent).toBe('fr');
    expect(getByTestId('text').textContent).toBe('Suivant');
    expect(getByTestId('interp').textContent).toBe('Passer au thème dark');
  });

  it('falls back to English for keys the active locale lacks', () => {
    const value = createI18n({ locale: 'fr', messages: {} });
    const { getByTestId } = render(
      <LanguageProvider value={value}>
        <Greeting />
      </LanguageProvider>
    );
    // active locale is fr, but the key is absent → EN fallback baseline.
    expect(getByTestId('text').textContent).toBe('Next');
  });
});

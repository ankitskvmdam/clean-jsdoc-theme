import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import { Footer } from '../components/Footer';
import { Layout } from '../components/Layout';

describe('Footer — custom vs default', () => {
  it('renders the default footer chrome when no `custom` is given', () => {
    const html = render(<Footer pkg={{ name: 'acme', repository: 'https://github.com/x/y' }} />);
    expect(html).toContain('border-t border-(--clean-border)');
    expect(html).toContain('Repository');
  });

  it('renders author HTML verbatim and drops the default chrome when `custom` is set', () => {
    const html = render(<Footer custom='<div class="my-footer">Hello © 2026</div>' />);
    expect(html).toContain('<div class="my-footer">Hello © 2026</div>');
    expect(html).not.toContain('py-6 text-sm text-muted-foreground');
    expect(html).not.toContain('Repository');
  });
});

describe('Layout — footer slot', () => {
  it('passes its `footer` prop into the footer slot', () => {
    const html = render(
      <Layout pkg={{ name: 'acme' }} footer='<div class="my-footer">Custom</div>'>
        <p>body</p>
      </Layout>
    );
    expect(html).toContain('<div class="my-footer">Custom</div>');
    expect(html).not.toContain('py-6 text-sm text-muted-foreground');
  });

  it('renders the default footer when no `footer` prop is set', () => {
    const html = render(
      <Layout pkg={{ name: 'acme' }}>
        <p>body</p>
      </Layout>
    );
    expect(html).toContain('border-t border-(--clean-border)');
  });
});

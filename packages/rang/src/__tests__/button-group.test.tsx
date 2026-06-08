import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { ButtonGroup } from '../components/ButtonGroup';
import { Button } from '../components/Button';

describe('ButtonGroup', () => {
  afterEach(() => cleanup());

  it('renders a labelled group around its children', () => {
    const { getByRole } = render(
      <ButtonGroup label="Page actions">
        <Button>Copy page</Button>
        <Button size="icon">▾</Button>
      </ButtonGroup>,
    );
    const group = getByRole('group', { name: 'Page actions' });
    expect(group).toBeTruthy();
    expect(group.textContent).toContain('Copy page');
  });

  it('flattens inner corners and collapses the shared border (horizontal default)', () => {
    const { getByRole } = render(
      <ButtonGroup>
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>,
    );
    const group = getByRole('group');
    expect(group.getAttribute('data-orientation')).toBe('horizontal');
    // className is the unescaped class attribute (SSR escapes the `&` in `[&>*]`).
    expect(group.className).toContain('[&>*]:rounded-none');
    expect(group.className).toContain('[&>*:first-child]:rounded-l-md');
    expect(group.className).toContain('[&>*:not(:first-child)]:-ml-px');
  });

  it('joins vertically when orientation is vertical', () => {
    const { getByRole } = render(
      <ButtonGroup orientation="vertical">
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>,
    );
    const group = getByRole('group');
    expect(group.getAttribute('data-orientation')).toBe('vertical');
    expect(group.className).toContain('flex-col');
    expect(group.className).toContain('[&>*:not(:first-child)]:-mt-px');
  });
});

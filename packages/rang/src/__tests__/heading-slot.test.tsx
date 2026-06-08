import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import { MdxH1 } from '../components/mdx-tags';
import { HeaderSlotContext, type HeaderSlot } from '../components/mdx-utils';

const slot = (node: HeaderSlot['node']): HeaderSlot => ({ node, placed: false });
const Copy = () => <span data-slot>copy</span>;

describe('MdxH1 + HeaderSlotContext', () => {
  it('places the slot beside the heading in a space-between, wrapping row', () => {
    const html = render(
      <HeaderSlotContext.Provider value={slot(<Copy />)}>
        <MdxH1 id="title">Title</MdxH1>
      </HeaderSlotContext.Provider>,
    );
    expect(html).toContain('justify-between');
    expect(html).toContain('flex-wrap');
    expect(html).toContain('data-slot'); // the slot node rendered
    expect(html).toContain('Title');
  });

  it('only the first heading claims the slot', () => {
    const shared = slot(<Copy />);
    const html = render(
      <HeaderSlotContext.Provider value={shared}>
        <div>
          <MdxH1>First</MdxH1>
          <MdxH1>Second</MdxH1>
        </div>
      </HeaderSlotContext.Provider>,
    );
    expect((html.match(/data-slot/g) ?? []).length).toBe(1);
  });

  it('renders a plain heading when there is no slot', () => {
    const html = render(<MdxH1 id="x">Plain</MdxH1>);
    expect(html).not.toContain('justify-between');
    expect(html).toContain('Plain');
  });
});

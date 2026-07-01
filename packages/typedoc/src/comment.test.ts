import { describe, expect, it } from 'vitest';
import { Comment, CommentTag } from 'typedoc';
import { commentFields } from './comment';

/** Build a `Comment` with the given block tags (no summary/modifier tags needed here). */
function makeComment(
  tags: { tag: string; content: { kind: 'text'; text: string }[] }[]
): Comment {
  const blockTags = tags.map((t) => new CommentTag(t.tag as never, t.content));
  return new Comment([], blockTags);
}

describe('commentFields — @group / @category', () => {
  it('maps @group to a category tag', () => {
    const fields = commentFields(
      makeComment([{ tag: '@group', content: [{ kind: 'text', text: 'Widgets' }] }])
    );
    expect(fields.tags).toContainEqual({ title: 'category', text: 'Widgets' });
  });

  it('prefers @category over @group when both are present (category first)', () => {
    const fields = commentFields(
      makeComment([
        { tag: '@category', content: [{ kind: 'text', text: 'Core/Things' }] },
        { tag: '@group', content: [{ kind: 'text', text: 'Widgets' }] },
      ])
    );
    const categoryTags = fields.tags?.filter((t) => t.title === 'category') ?? [];
    expect(categoryTags).toEqual([{ title: 'category', text: 'Core/Things' }]);
  });

  it('prefers @category over @group when both are present (group first)', () => {
    const fields = commentFields(
      makeComment([
        { tag: '@group', content: [{ kind: 'text', text: 'Widgets' }] },
        { tag: '@category', content: [{ kind: 'text', text: 'Core/Things' }] },
      ])
    );
    const categoryTags = fields.tags?.filter((t) => t.title === 'category') ?? [];
    expect(categoryTags).toEqual([{ title: 'category', text: 'Core/Things' }]);
  });
});

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

describe('commentFields — unresolved @inheritDoc', () => {
  // TypeDoc's own converter resolves `@inheritDoc` (explicit target or bare)
  // during `app.convert()` — by the time `commentFields` runs, a RESOLVED
  // `@inheritDoc` has already been folded into `comment.summary`/`blockTags`
  // and the tag itself is gone (verified in NOTES.md §5a). The one shape that
  // survives into `commentFields` is an UNRESOLVABLE target: TypeDoc leaves a
  // residual `{ tag: '@inheritDoc', name: '<target>', content: [] }` block tag
  // and logs its own warning. `commentFields` must not surface that as a junk
  // generic tag (`{title:'inheritdoc', text:''}`).
  it('drops a residual (unresolved-target) @inheritDoc block tag instead of emitting a junk tag', () => {
    const inheritDocTag = new CommentTag('@inheritDoc' as never, []);
    inheritDocTag.name = 'DoesNotExist.toJSON';
    const comment = new Comment([], [inheritDocTag]);
    const fields = commentFields(comment);
    expect(fields.tags?.find((t) => t.title === 'inheritdoc')).toBeUndefined();
  });
});

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

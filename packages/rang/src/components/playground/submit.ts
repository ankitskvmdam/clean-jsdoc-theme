/**
 * POST a hidden form to `action` (new tab) with `fields` as hidden inputs. This
 * is how CodePen / JSFiddle / CodeSandbox prefill APIs receive a payload from
 * the browser with no backend. No-op under SSR (`document` absent). The pure
 * payload builders live in `codepen.ts` / `jsfiddle.ts` / `codesandbox.ts` so
 * they're testable without a DOM; this is the one impure bit.
 */
export function submitForm(action: string, fields: Record<string, string>): void {
  if (typeof document === 'undefined') return;
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.target = '_blank';
  form.rel = 'noopener noreferrer';
  form.style.display = 'none';
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

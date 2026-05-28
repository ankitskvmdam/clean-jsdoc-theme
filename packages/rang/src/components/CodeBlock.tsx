import { CopyBtn } from './CopyBtn';

export interface CodeBlockProps {
  code: string;
  lang?: string;
  showCopy?: boolean;
}

export function CodeBlock({ code, lang, showCopy = true }: CodeBlockProps) {
  return (
    <div class="group relative my-4 rounded border border-[var(--clean-border)] bg-[var(--clean-bg)]">
      {showCopy && (
        <div class="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyBtn text={code} />
        </div>
      )}
      <pre class="m-0 overflow-x-auto p-3 text-sm"><code class={lang ? `language-${lang}` : undefined}>{code}</code></pre>
    </div>
  );
}

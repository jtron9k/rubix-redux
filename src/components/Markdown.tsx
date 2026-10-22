import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const INLINE = ['strong', 'em', 'a', 'del', 'code', 'br'];

/** Inline copy with **bold**, _italic_ and links. Block elements are unwrapped. */
export function Inline({ children }: { children: string | undefined }) {
  if (!children) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      allowedElements={INLINE}
      unwrapDisallowed
      components={{ a: ({ href, children: c }) => <a href={href} className="underline underline-offset-2">{c}</a> }}
    >
      {children}
    </ReactMarkdown>
  );
}

/** Multi-paragraph copy (FAQ answers, success messages). */
export function Prose({ children, className = '' }: { children: string | undefined; className?: string }) {
  if (!children) return null;
  return (
    <div className={`space-y-3 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        allowedElements={[...INLINE, 'p', 'ul', 'ol', 'li']}
        unwrapDisallowed
        components={{
          ul: ({ children: c }) => <ul className="list-disc space-y-1 pl-5">{c}</ul>,
          ol: ({ children: c }) => <ol className="list-decimal space-y-1 pl-5">{c}</ol>,
          a: ({ href, children: c }) => <a href={href} className="underline underline-offset-2">{c}</a>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

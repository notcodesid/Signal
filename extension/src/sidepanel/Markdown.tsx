import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Same idea as the web component, sized down for the ~380px sidebar.
const components: Components = {
  a: ({ ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-300 underline underline-offset-2 hover:opacity-80 break-all"
    />
  ),
  code: ({ className, children, ...props }) => {
    const isBlock =
      typeof className === "string" && className.startsWith("language-");
    if (isBlock) {
      return (
        <pre className="my-2 overflow-x-auto rounded-md border border-white/10 bg-black/40 p-2">
          <code
            className="block font-mono text-[11px] leading-relaxed text-gray-100"
            {...props}
          >
            {children}
          </code>
        </pre>
      );
    }
    return (
      <code
        className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.88em] text-gray-100"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ ...props }) => (
    <div className="my-1.5 -mx-0.5 overflow-x-auto">
      <table
        className="min-w-full border-collapse text-[11px] tabular-nums"
        {...props}
      />
    </div>
  ),
  thead: ({ ...props }) => <thead className="text-left" {...props} />,
  th: ({ ...props }) => (
    <th
      className="border-b border-white/15 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400"
      {...props}
    />
  ),
  td: ({ ...props }) => (
    <td className="border-b border-white/5 px-1.5 py-1 align-top" {...props} />
  ),
  ul: ({ ...props }) => (
    <ul className="my-1 ml-4 list-disc space-y-0.5" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol className="my-1 ml-4 list-decimal space-y-0.5" {...props} />
  ),
  li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
  p: ({ ...props }) => <p className="my-1 leading-relaxed" {...props} />,
  h1: ({ ...props }) => (
    <h1 className="mt-2 mb-1.5 text-sm font-semibold text-white" {...props} />
  ),
  h2: ({ ...props }) => (
    <h2 className="mt-2 mb-1 text-[13px] font-semibold text-white" {...props} />
  ),
  h3: ({ ...props }) => (
    <h3 className="mt-1.5 mb-0.5 text-[12px] font-semibold text-white" {...props} />
  ),
  hr: () => <hr className="my-2 border-white/10" />,
  blockquote: ({ ...props }) => (
    <blockquote
      className="my-1 border-l-2 border-white/20 pl-2 italic text-gray-300"
      {...props}
    />
  ),
  strong: ({ ...props }) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  em: ({ ...props }) => <em className="italic" {...props} />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

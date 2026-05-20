"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  a: ({ ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline underline-offset-2 hover:opacity-80 break-all"
    />
  ),
  code: ({ className, children, ...props }) => {
    const isBlock =
      typeof className === "string" && className.startsWith("language-");
    if (isBlock) {
      return (
        <pre className="my-2 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
          <code
            className="block font-mono text-[12.5px] leading-relaxed text-gray-900"
            {...props}
          >
            {children}
          </code>
        </pre>
      );
    }
    return (
      <code
        className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.88em] text-gray-900"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ ...props }) => (
    <div className="my-2 -mx-1 overflow-x-auto">
      <table
        className="min-w-full border-collapse text-[13px] tabular-nums"
        {...props}
      />
    </div>
  ),
  thead: ({ ...props }) => <thead className="text-left" {...props} />,
  th: ({ ...props }) => (
    <th
      className="border-b border-gray-200 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
      {...props}
    />
  ),
  td: ({ ...props }) => (
    <td className="border-b border-gray-100 px-2 py-1.5 align-top text-gray-800" {...props} />
  ),
  ul: ({ ...props }) => (
    <ul className="my-1 ml-5 list-disc space-y-0.5" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol className="my-1 ml-5 list-decimal space-y-0.5" {...props} />
  ),
  li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
  p: ({ ...props }) => <p className="my-1 leading-relaxed" {...props} />,
  h1: ({ ...props }) => (
    <h1 className="mt-3 mb-2 text-lg font-semibold text-gray-900" {...props} />
  ),
  h2: ({ ...props }) => (
    <h2 className="mt-3 mb-1.5 text-base font-semibold text-gray-900" {...props} />
  ),
  h3: ({ ...props }) => (
    <h3 className="mt-2 mb-1 text-sm font-semibold text-gray-900" {...props} />
  ),
  hr: () => <hr className="my-3 border-gray-200" />,
  blockquote: ({ ...props }) => (
    <blockquote
      className="my-1 border-l-2 border-gray-300 pl-3 italic text-gray-600"
      {...props}
    />
  ),
  strong: ({ ...props }) => (
    <strong className="font-semibold text-gray-900" {...props} />
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

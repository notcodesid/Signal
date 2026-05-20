"use client";

import {
  ArrowUpIcon,
  MicIcon,
  PaperclipIcon,
  SearchIcon,
  ThinkIcon,
  TypingDots,
} from "./icons";

/**
 * Bottom composer bar.
 *
 * A single-line text field plus a row of controls. The DeepSearch / Think
 * pills, attach, and mic buttons are visual placeholders for now — only the
 * text field and send button are wired up. While a reply streams, the send
 * button shows a typing animation and input is disabled.
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  isStreaming,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
}) {
  const canSend = !isStreaming && value.trim().length > 0;

  return (
    <div className="flex-shrink-0 bg-white px-4 pb-5 pt-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="mx-auto flex w-full max-w-3xl items-center gap-2"
      >
        <div className="flex w-full items-center gap-2 rounded-full border border-gray-200 bg-white pl-5 pr-1.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-within:border-gray-300">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ask Anything"
            disabled={isStreaming}
            className="flex-1 bg-transparent py-1.5 text-[15px] font-normal text-gray-900 placeholder-gray-400 focus:outline-none"
          />

          <button
            type="submit"
            aria-label={isStreaming ? "Streaming" : "Send"}
            disabled={!canSend}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition active:scale-95 disabled:opacity-30"
          >
            {isStreaming ? <TypingDots /> : <ArrowUpIcon />}
          </button>
        </div>
      </form>
    </div>
  );
}

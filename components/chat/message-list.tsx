"use client";

import type { RefObject } from "react";
import type { UIMessage } from "ai";
import { MessageBubble } from "./message-bubble";

/**
 * Scrollable transcript of the active conversation. Renders each message as a
 * bubble, a transient error pill if the request failed, and an invisible
 * anchor (`bottomRef`) the parent scrolls into view as new content streams.
 */
export function MessageList({
  messages,
  onSend,
  error,
  bottomRef,
}: {
  messages: UIMessage[];
  onSend: (text: string) => void;
  error?: Error;
  bottomRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 pb-40">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onSend={onSend} />
      ))}

      {error && (
        <div className="flex justify-center">
          <div className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-[13px] text-red-700">
            {error.message}
          </div>
        </div>
      )}

      <div ref={bottomRef} aria-hidden />
    </div>
  );
}

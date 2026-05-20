"use client";

import { useSignalChat } from "./use-signal-chat";
import { ChatHeader } from "./chat-header";
import { ChatEmptyState } from "./chat-empty-state";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

/**
 * Top-level chat surface for the Signal web app.
 *
 * This component is intentionally thin: it wires the `useSignalChat` hook to
 * the presentational pieces (header, transcript / empty state, composer).
 * All conversation logic lives in the hook; all markup lives in the children.
 */
export function Chat() {
  const { messages, send, submit, input, setInput, isStreaming, error, bottomRef } =
    useSignalChat();

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full w-full bg-white text-gray-900">
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <ChatHeader />

        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
          {hasMessages ? (
            <MessageList
              messages={messages}
              onSend={send}
              error={error}
              bottomRef={bottomRef}
            />
          ) : (
            <ChatEmptyState onPick={send} />
          )}
        </div>

        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={submit}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}

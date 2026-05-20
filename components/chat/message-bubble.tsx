"use client";

import { isToolUIPart, type UIMessage } from "ai";
import { Markdown } from "@/components/markdown";
import { ToolMessagePart } from "./tool-message-part";

/**
 * A single chat message.
 *
 * User messages get a dark rounded bubble; assistant messages render as plain
 * text on the page (ChatGPT-style). Each message is a list of parts — text
 * parts render as Markdown, tool parts delegate to <ToolMessagePart>.
 */
export function MessageBubble({
  message,
  onSend,
}: {
  message: UIMessage;
  onSend: (text: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={
        "flex w-full animate-in fade-in slide-in-from-bottom-1 duration-300 " +
        (isUser ? "justify-end" : "justify-start")
      }
    >
      <div
        className={
          "min-w-0 max-w-[85%] space-y-2 break-words " +
          (isUser
            ? "rounded-3xl rounded-tr-md bg-gray-900 px-4 py-2.5 text-[15px] leading-relaxed text-white whitespace-pre-wrap"
            : "text-[15px] leading-relaxed text-gray-900")
        }
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <div key={i} className="block">
                <Markdown>{part.text}</Markdown>
              </div>
            );
          }
          if (isToolUIPart(part)) {
            return <ToolMessagePart key={i} part={part} onSend={onSend} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

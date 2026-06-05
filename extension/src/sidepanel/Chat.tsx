import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  getToolName,
  type UIMessage,
} from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  SwapApprovalCard,
  type SwapPreview,
} from "./SwapApprovalCard";
import {
  TransferApprovalCard,
  type TransferPreview,
} from "./TransferApprovalCard";
import { YieldLoopCard, type YieldLoopLink } from "./YieldLoopCard";
import {
  TokenLaunchApprovalCard,
  type TokenLaunchPreview,
} from "./TokenLaunchApprovalCard";
import { Markdown } from "./Markdown";
import {
  ArrowUpIcon,
  CheckIcon,
  ErrorIcon,
  SparkleIcon,
  Spinner,
  TypingDots,
} from "./icons";
import type { PageContext } from "@/lib/usePageContext";

const BACKEND_URL = "http://localhost:3000/api/chat";
const STORAGE_KEY = "signal-ext:chat:v1";

const DEFAULT_PROMPTS = [
  "what's my sol balance?",
  "highest stablecoin yields above $10m tvl",
  "best swap route for sol to usdc",
  "current marinade staking apy",
];

const PROMPTS_BY_PROTOCOL: Record<string, string[]> = {
  Jupiter: [
    "best swap route for sol to usdc",
    "what's my sol balance?",
    "quote 0.1 sol to usdc",
  ],
  Marinade: [
    "current marinade staking apy",
    "help me stake 0.1 sol to msol",
    "what's my sol balance?",
  ],
  "Pump.fun": [
    "what's my sol balance?",
    "launch a token called Halo with 1m supply",
  ],
  Kamino: [
    "what's my sol balance?",
    "highest stablecoin yields above $10m tvl",
  ],
};

type SwapToolOutput = { preview: SwapPreview; txBase64: string };
type TransferToolOutput = { preview: TransferPreview; txBase64: string };
type TokenLaunchToolOutput = {
  preview: TokenLaunchPreview;
  txBase64: string;
  mintSecret: number[];
};

function loadStored(): UIMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function suggestedPrompts(protocol: string | null): string[] {
  if (protocol && PROMPTS_BY_PROTOCOL[protocol]) {
    return PROMPTS_BY_PROTOCOL[protocol];
  }
  return DEFAULT_PROMPTS;
}

export function Chat({
  walletAddress,
  pageContext,
}: {
  walletAddress: string | null;
  pageContext: PageContext;
}) {
  const [input, setInput] = useState("");

  const walletAddressRef = useRef<string | null>(walletAddress);
  useEffect(() => {
    walletAddressRef.current = walletAddress;
  }, [walletAddress]);

  const pageContextRef = useRef<PageContext>(pageContext);
  useEffect(() => {
    pageContextRef.current = pageContext;
  }, [pageContext]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: BACKEND_URL,
        body: () => ({
          walletAddress: walletAddressRef.current,
          pageContext: pageContextRef.current,
        }),
      }),
    []
  );

  const initialMessages = useMemo(() => loadStored(), []);
  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
    messages: initialMessages,
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  const isStreaming = status === "submitted" || status === "streaming";
  const prompts = suggestedPrompts(pageContext.protocol);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  function send(text: string) {
    if (isStreaming) return;
    sendMessage({ text });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    send(text);
    setInput("");
  }

  function clearChat() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  const canSend = !isStreaming && input.trim().length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-4 py-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white">
                <SparkleIcon />
              </div>
              <div className="space-y-1">
                <h2 className="font-display text-[20px] font-semibold tracking-tight text-gray-900">
                  what can i help you with?
                </h2>
                <p className="text-[12px] text-gray-500">
                  {pageContext.protocol
                    ? `embedded on ${pageContext.protocol}.`
                    : "embedded ai for crypto protocols."}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2">
              {prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-left text-[12px] text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-4 py-5 pb-28">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  "flex w-full " + (m.role === "user" ? "justify-end" : "justify-start")
                }
              >
                <div
                  className={
                    "min-w-0 max-w-[92%] space-y-2 break-words " +
                    (m.role === "user"
                      ? "rounded-3xl rounded-tr-md bg-gray-900 px-3.5 py-2 text-[13px] leading-relaxed text-white whitespace-pre-wrap"
                      : "text-[13px] leading-relaxed text-gray-900")
                  }
                >
                  {m.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <div key={i} className="block">
                          <Markdown>{part.text}</Markdown>
                        </div>
                      );
                    }

                    if (isToolUIPart(part)) {
                      const name = getToolName(part);

                      if (part.state === "output-error") {
                        return (
                          <div
                            key={i}
                            className="my-2 inline-flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 font-mono text-[10px] text-red-700"
                          >
                            <ErrorIcon className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                            <span className="break-all">
                              {name} failed
                              {part.errorText ? `: ${part.errorText}` : ""}
                            </span>
                          </div>
                        );
                      }

                      if (
                        name === "prepareJupiterSwap" &&
                        part.state === "output-available"
                      ) {
                        const out = part.output as SwapToolOutput;
                        return (
                          <SwapApprovalCard
                            key={i}
                            preview={out.preview}
                            txBase64={out.txBase64}
                            onConfirmed={(sig) =>
                              sendMessage({ text: `Tx confirmed: ${sig}` })
                            }
                            onRejected={(reason) => sendMessage({ text: reason })}
                          />
                        );
                      }

                      if (
                        name === "prepareSolTransfer" &&
                        part.state === "output-available"
                      ) {
                        const out = part.output as TransferToolOutput;
                        return (
                          <TransferApprovalCard
                            key={i}
                            preview={out.preview}
                            txBase64={out.txBase64}
                            onConfirmed={(sig) =>
                              sendMessage({ text: `Tx confirmed: ${sig}` })
                            }
                            onRejected={(reason) => sendMessage({ text: reason })}
                          />
                        );
                      }

                      if (
                        name === "prepareYieldLoopLink" &&
                        part.state === "output-available"
                      ) {
                        return (
                          <YieldLoopCard
                            key={i}
                            link={part.output as YieldLoopLink}
                          />
                        );
                      }

                      if (
                        name === "prepareTokenLaunch" &&
                        part.state === "output-available"
                      ) {
                        const out = part.output as TokenLaunchToolOutput;
                        return (
                          <TokenLaunchApprovalCard
                            key={i}
                            preview={out.preview}
                            txBase64={out.txBase64}
                            mintSecret={out.mintSecret}
                            onConfirmed={(sig) =>
                              sendMessage({ text: `Token launched: ${sig}` })
                            }
                            onRejected={(reason) => sendMessage({ text: reason })}
                          />
                        );
                      }

                      const running =
                        part.state === "input-streaming" ||
                        part.state === "input-available";
                      return (
                        <div
                          key={i}
                          className="my-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1 font-mono text-[10px] text-gray-600"
                        >
                          {running ? (
                            <Spinner />
                          ) : (
                            <CheckIcon className="text-emerald-500" />
                          )}
                          <span>
                            {running ? "Running" : "Done"} ·{" "}
                            <span className="text-gray-900">{name}</span>
                          </span>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            ))}

            {error && (
              <div className="flex justify-center">
                <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-700">
                  {error.message}
                </div>
              </div>
            )}
            <div ref={bottomRef} aria-hidden />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-3 pb-3 pt-2">
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <div className="flex w-full min-w-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white pl-4 pr-1 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-within:border-gray-300">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything"
              disabled={isStreaming}
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <button
              type="submit"
              aria-label={isStreaming ? "Streaming" : "Send"}
              disabled={!canSend}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition active:scale-95 disabled:opacity-30"
            >
              {isStreaming ? <TypingDots /> : <ArrowUpIcon />}
            </button>
          </div>
        </form>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            disabled={isStreaming}
            className="mt-1.5 w-full text-center text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  );
}
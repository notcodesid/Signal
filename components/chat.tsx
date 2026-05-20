"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  getToolName,
  type UIMessage,
} from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  SwapApprovalCard,
  type SwapPreview,
} from "@/components/swap-approval-card";
import {
  TransferApprovalCard,
  type TransferPreview,
} from "@/components/transfer-approval-card";
import {
  YieldLoopCard,
  type YieldLoopLink,
} from "@/components/yield-loop-card";
import {
  TokenLaunchApprovalCard,
  type TokenLaunchPreview,
} from "@/components/token-launch-approval-card";
import { Markdown } from "@/components/markdown";

type SwapToolOutput = { preview: SwapPreview; txBase64: string };
type TransferToolOutput = { preview: TransferPreview; txBase64: string };
type TokenLaunchToolOutput = {
  preview: TokenLaunchPreview;
  txBase64: string;
  mintSecret: number[];
};

const STORAGE_KEY = "signal:chat:v1";

type ModeId = "trade" | "yield" | "launch" | "watch" | "learn";

const MODES: Array<{
  id: ModeId;
  label: string;
  icon: React.ReactNode;
  prompts: string[];
}> = [
  {
    id: "trade",
    label: "Trade",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M7 7 H 20 L 17 4" />
        <path d="M17 17 H 4 L 7 20" />
      </svg>
    ),
    prompts: [
      "Quote 0.1 SOL to USDC",
      "What's my SOL balance?",
      "Swap 0.05 SOL to mSOL",
    ],
  },
  {
    id: "yield",
    label: "Yield",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M12 2v20" />
        <path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
      </svg>
    ),
    prompts: [
      "Top stablecoin yields above $10M TVL",
      "Current Marinade staking rate",
      "Leverage loops on Solana",
    ],
  },
  {
    id: "launch",
    label: "Launch",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      </svg>
    ),
    prompts: [
      "Launch a token called Halo with 1M supply",
      "Create an SPL token with 6 decimals",
    ],
  },
  {
    id: "watch",
    label: "Watch",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    prompts: [
      "Alert me if my SOL balance changes",
      "What tokens do I hold?",
    ],
  },
  {
    id: "learn",
    label: "Learn",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M22 10v6M2 10l10-5 10 5-10 5Z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    prompts: [
      "Explain liquid staking on Solana",
      "What is a yield loop?",
      "How do Jupiter swaps work?",
    ],
  },
];

function loadStoredMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function truncateAddr(s: string): string {
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function Chat() {
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [input, setInput] = useState("");
  const [activeMode, setActiveMode] = useState<ModeId>("trade");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setIsDropdownOpen(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsDropdownOpen(false);
  };

  const walletAddressRef = useRef<string | null>(publicKey?.toBase58() ?? null);
  useEffect(() => {
    walletAddressRef.current = publicKey?.toBase58() ?? null;
  }, [publicKey]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          walletAddress: walletAddressRef.current,
        }),
      }),
    []
  );

  const initialMessages = useMemo(() => loadStoredMessages(), []);

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
    messages: initialMessages,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  const isStreaming = status === "submitted" || status === "streaming";

  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput("");
  }

  function onSuggestion(text: string) {
    if (isStreaming) return;
    sendMessage({ text });
  }

  function newChat() {
    setMessages([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  const currentMode = MODES.find((m) => m.id === activeMode)!;
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full w-full flex-col bg-white text-gray-900">
      {/* ─── Slim header ──────────────────────────────────────────────────── */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-100 px-4">
        <div className="flex items-center gap-2">
          <button
            aria-label="Menu"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <button
            aria-label="New chat"
            onClick={newChat}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          <span className="font-display text-[15px] font-semibold tracking-tight text-gray-900 ml-1">
            Signal
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => {
              if (!publicKey) setVisible(true);
              else setIsDropdownOpen(!isDropdownOpen);
            }}
            className="group flex items-center gap-2 rounded-full px-3 py-1.5 hover:bg-gray-100"
          >
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (publicKey ? "bg-emerald-500" : "bg-gray-300")
              }
              aria-hidden
            />
            {publicKey ? (
              <span className="font-mono text-[11px] text-gray-500">
                {truncateAddr(publicKey.toBase58())}
              </span>
            ) : (
              <span className="text-[12px] text-gray-400">connect</span>
            )}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-gray-300 group-hover:text-gray-500">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {isDropdownOpen && publicKey && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-100 bg-white p-1 shadow-lg z-50">
              <button
                onClick={handleCopyAddress}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                Copy Address
              </button>
              <button
                onClick={handleDisconnect}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ─── Mode picker (only when no messages yet) ─────────────────────── */}
      {!hasMessages && (
        <div className="flex flex-shrink-0 justify-center pt-6">
          <div className="flex gap-2 px-4">
            {MODES.map((m) => {
              const active = m.id === activeMode;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMode(m.id)}
                  className="flex w-[78px] flex-col items-center gap-1.5 transition active:scale-95"
                >
                  <div
                    className={
                      "flex h-[60px] w-[60px] items-center justify-center rounded-2xl border transition " +
                      (active
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50")
                    }
                  >
                    {m.icon}
                  </div>
                  <span
                    className={
                      "text-[12px] font-medium tracking-tight " +
                      (active ? "text-gray-900" : "text-gray-500")
                    }
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Chat / empty state area ─────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
        {!hasMessages ? (
          <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 pt-8 pb-32 text-center">
            <div className="space-y-1.5">
              <h1 className="font-display text-[26px] font-semibold tracking-tight text-gray-900">
                What can I help you do?
              </h1>
              <p className="text-[14px] text-gray-500">
                You&apos;re in <span className="font-medium text-gray-900">{currentMode.label}</span> mode. Pick a prompt or type your own.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              {currentMode.prompts.map((p) => (
                <button
                  key={p}
                  onClick={() => onSuggestion(p)}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-[14px] text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 pb-40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  "flex w-full animate-in fade-in slide-in-from-bottom-1 duration-300 " +
                  (m.role === "user" ? "justify-end" : "justify-start")
                }
              >
                <div
                  className={
                    "min-w-0 max-w-[85%] space-y-2 break-words " +
                    (m.role === "user"
                      ? "rounded-3xl rounded-tr-md bg-gray-900 px-4 py-2.5 text-[15px] leading-relaxed text-white whitespace-pre-wrap"
                      : "text-[15px] leading-relaxed text-gray-900")
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

                      if (name === "prepareJupiterSwap" && part.state === "output-available") {
                        const out = part.output as SwapToolOutput;
                        return (
                          <div key={i} className="mt-3">
                            <SwapApprovalCard
                              preview={out.preview}
                              txBase64={out.txBase64}
                              onConfirmed={(sig) => sendMessage({ text: `Tx confirmed: ${sig}` })}
                              onRejected={(reason) => sendMessage({ text: reason })}
                            />
                          </div>
                        );
                      }

                      if (name === "prepareSolTransfer" && part.state === "output-available") {
                        const out = part.output as TransferToolOutput;
                        return (
                          <div key={i} className="mt-3">
                            <TransferApprovalCard
                              preview={out.preview}
                              txBase64={out.txBase64}
                              onConfirmed={(sig) => sendMessage({ text: `Tx confirmed: ${sig}` })}
                              onRejected={(reason) => sendMessage({ text: reason })}
                            />
                          </div>
                        );
                      }

                      if (name === "prepareYieldLoopLink" && part.state === "output-available") {
                        const link = part.output as YieldLoopLink;
                        return (
                          <div key={i} className="mt-3">
                            <YieldLoopCard link={link} />
                          </div>
                        );
                      }

                      if (name === "prepareTokenLaunch" && part.state === "output-available") {
                        const out = part.output as TokenLaunchToolOutput;
                        return (
                          <div key={i} className="mt-3">
                            <TokenLaunchApprovalCard
                              preview={out.preview}
                              txBase64={out.txBase64}
                              mintSecret={out.mintSecret}
                              onConfirmed={(sig) => sendMessage({ text: `Token launched: ${sig}` })}
                              onRejected={(reason) => sendMessage({ text: reason })}
                            />
                          </div>
                        );
                      }

                      if (part.state === "output-error") {
                        return (
                          <div
                            key={i}
                            className="my-2 inline-flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 font-mono text-xs text-red-700"
                          >
                            <svg className="h-4 w-4 flex-shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="15" y1="9" x2="9" y2="15" />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            <span className="break-all">{name} failed{part.errorText ? `: ${part.errorText}` : ""}</span>
                          </div>
                        );
                      }

                      const running =
                        part.state === "input-streaming" ||
                        part.state === "input-available";
                      return (
                        <div
                          key={i}
                          className="my-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 font-mono text-[11px] text-gray-600"
                        >
                          {running ? (
                            <div className="h-3 w-3 rounded-full border-2 border-gray-900 border-t-transparent animate-spin" />
                          ) : (
                            <svg className="h-3 w-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          <span>
                            {running ? "Running" : "Done"} · <span className="text-gray-900">{name}</span>
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
                <div className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-[13px] text-red-700">
                  {error.message}
                </div>
              </div>
            )}

            <div ref={bottomRef} aria-hidden />
          </div>
        )}
      </div>

      {/* ─── Bottom input bar (fixed as flex child, not absolute) ────────── */}
      <div className="flex-shrink-0 bg-white px-4 pb-5 pt-3">
        <form
          onSubmit={onSubmit}
          className="mx-auto flex w-full max-w-3xl items-center gap-2"
        >
          <div className="flex w-full flex-col gap-1.5 rounded-3xl border border-gray-200 bg-white px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-within:border-gray-300">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Anything"
              className="w-full bg-transparent px-2 py-2 text-[15px] font-normal text-gray-900 placeholder-gray-400 focus:outline-none"
              disabled={isStreaming}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Attach"
                  className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  DeepSearch
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                    <path d="M2 9a10 10 0 1 1 20 0c0 5-3 6.5-3 9H5c0-2.5-3-4-3-9z" />
                  </svg>
                  Think
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Voice input"
                  className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                  </svg>
                </button>
                <button
                  type="submit"
                  aria-label={isStreaming ? "Stop" : "Send"}
                  disabled={isStreaming || !input.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white transition active:scale-95 disabled:opacity-30"
                >
                  {isStreaming ? (
                    <div className="flex gap-0.5">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-white" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-white" style={{ animationDelay: "0.15s" }} />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-white" style={{ animationDelay: "0.3s" }} />
                    </div>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

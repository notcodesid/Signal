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

// ─── In-memory chat history ────────────────────────────────────────────────
// Chats are kept only for the lifetime of the session (no localStorage), so
// the sidebar lists this session's conversations but nothing survives a
// refresh.

type ChatRecord = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
};

// A cheap, STABLE signature of the conversation. `useChat` hands back a new
// `messages` array reference on every render (it rebuilds from streaming
// parts), so we can't rely on reference identity to know when to persist.
// This signature only changes when content actually changes — message count,
// the last message's id, and the serialized last message (which grows as
// tokens stream and flips when a tool result lands).
function messagesSignature(messages: UIMessage[]): string {
  if (messages.length === 0) return "0";
  const last = messages[messages.length - 1];
  return `${messages.length}:${last.id}:${JSON.stringify(last.parts)}`;
}

function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const text = firstUser.parts
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join(" ")
    .trim();
  return text.length > 0 ? text.slice(0, 50) : "New chat";
}

function groupByRecency(
  chats: ChatRecord[]
): Array<{ label: string; items: ChatRecord[] }> {
  const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
  const day = 86_400_000;
  const startOfToday = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const startOfYesterday = startOfToday - day;
  const startOfWeek = startOfToday - 6 * day;

  const today: ChatRecord[] = [];
  const yesterday: ChatRecord[] = [];
  const week: ChatRecord[] = [];
  const older: ChatRecord[] = [];

  for (const c of sorted) {
    if (c.updatedAt >= startOfToday) today.push(c);
    else if (c.updatedAt >= startOfYesterday) yesterday.push(c);
    else if (c.updatedAt >= startOfWeek) week.push(c);
    else older.push(c);
  }

  return [
    { label: "Today", items: today },
    { label: "Yesterday", items: yesterday },
    { label: "Previous 7 days", items: week },
    { label: "Older", items: older },
  ].filter((g) => g.items.length > 0);
}

function truncateAddr(s: string): string {
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function Chat() {
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [input, setInput] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // ─── Sidebar / chat-history state ──────────────────────────────────────
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Mirror of activeChatId read INSIDE the sync effect. Keeping it in a ref
  // (rather than the effect's dep array) is what prevents the infinite loop:
  // the effect calls setActiveChatId, and if activeChatId were a dependency
  // that would re-trigger the effect endlessly.
  const activeChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);
  // Last conversation signature we persisted. Used to skip redundant syncs
  // when `messages` gets a new reference but identical content.
  const lastSyncedSigRef = useRef<string>("");

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

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
  });

  const isStreaming = status === "submitted" || status === "streaming";

  // ─── Sync useChat's messages into the in-memory chat list ──────────────
  // Chats live only for the session — nothing is persisted to localStorage.
  // Depends ONLY on `messages`; activeChatId is read from a ref so the
  // setActiveChatId() call below can't re-trigger this effect. The signature
  // guard breaks the render loop: `messages` changes reference every render,
  // but we only do work when its CONTENT changes.
  useEffect(() => {
    if (messages.length === 0) return;

    const sig = messagesSignature(messages);
    if (sig === lastSyncedSigRef.current) return; // content unchanged — skip
    lastSyncedSigRef.current = sig;

    let id = activeChatIdRef.current;
    if (!id) {
      // Bootstrap a brand-new chat from the first message.
      id = crypto.randomUUID();
      activeChatIdRef.current = id;
      setActiveChatId(id);
    }
    const chatId = id;

    setChats((prev) => {
      const idx = prev.findIndex((c) => c.id === chatId);
      const title = deriveTitle(messages);
      const now = Date.now();
      if (idx === -1) {
        return [
          {
            id: chatId,
            title,
            createdAt: now,
            updatedAt: now,
            messages,
          },
          ...prev,
        ];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], title, updatedAt: now, messages };
      return next;
    });
  }, [messages]);

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

  function newChat() {
    setMessages([]);
    setActiveChatId(null);
    activeChatIdRef.current = null;
    lastSyncedSigRef.current = "";
    setSidebarOpen(false);
  }

  function switchChat(id: string) {
    const target = chats.find((c) => c.id === id);
    if (!target) return;
    // Pre-set the synced signature so loading these messages doesn't trigger
    // a redundant write back to the same chat.
    lastSyncedSigRef.current = messagesSignature(target.messages);
    setMessages(target.messages);
    setActiveChatId(id);
    activeChatIdRef.current = id;
    setSidebarOpen(false);
  }

  function deleteChat(id: string) {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      setMessages([]);
      setActiveChatId(null);
      activeChatIdRef.current = null;
      lastSyncedSigRef.current = "";
    }
  }

  const hasMessages = messages.length > 0;
  const grouped = groupByRecency(chats);

  return (
    <div className="flex h-full w-full bg-white text-gray-900">


      {/* ─── Main column ────────────────────────────────────────────────── */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-gray-900">
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

        {/* Chat / empty state */}
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
          {!hasMessages ? (
            <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 pt-16 pb-32 text-center">
              <h1 className="font-display text-[26px] font-semibold tracking-tight text-gray-900">
                What can I help you do?
              </h1>
              <div className="flex w-full flex-col gap-2">
                {[
                  "What's my SOL balance?",
                  "Top stablecoin yields above $10M TVL",
                  "Launch a token called Halo with 1M supply",
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage({ text: p })}
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

        {/* Bottom input bar */}
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
    </div>
  );
}

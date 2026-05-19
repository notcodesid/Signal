"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  getToolName,
  type UIMessage,
} from "ai";
import { useMemo, useRef, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { SwapApprovalCard, type SwapPreview } from "@/components/swap-approval-card";
import {
  TransferApprovalCard,
  type TransferPreview,
} from "@/components/transfer-approval-card";

// Output shape returned by lib/tools/prepare-jupiter-swap.ts.
type SwapToolOutput = {
  preview: SwapPreview;
  txBase64: string;
};

// Output shape returned by lib/tools/prepare-sol-transfer.ts.
type TransferToolOutput = {
  preview: TransferPreview;
  txBase64: string;
};

// localStorage key for chat persistence. Bumping this number invalidates old
// conversations if we ever change the message shape in a breaking way.
const STORAGE_KEY = "signal:chat:v1";

const SUGGESTED_PROMPTS = [
  "What's my SOL balance?",
  "Show me top stablecoin yields above $10M TVL",
  "What's the current Marinade staking APY?",
  "Quote 0.1 SOL to USDC",
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

export function Chat() {
  const { publicKey } = useWallet();
  const [input, setInput] = useState("");

  // Keep a ref to the latest wallet address. useChat captures the transport
  // on first render, so we can't rely on memo deps to "refresh" the body.
  // Instead the body function reads from this ref every request.
  const walletAddressRef = useRef<string | null>(publicKey?.toBase58() ?? null);
  useEffect(() => {
    walletAddressRef.current = publicKey?.toBase58() ?? null;
  }, [publicKey]);

  // Build the transport ONCE. The body function closes over the ref so it
  // always sees the current wallet, no matter when it's called.
  const transport = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          walletAddress: walletAddressRef.current,
        }),
      }),
    []
  );

  // Hydrate from localStorage so the conversation survives a refresh.
  // useChat accepts initial `messages` in its options.
  const initialMessages = useMemo(() => loadStoredMessages(), []);

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
    messages: initialMessages,
  });

  // Persist on every message change. Throttled implicitly by React batching.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // localStorage can throw (quota, privacy mode) — fail silent for V0.
    }
  }, [messages]);

  const isStreaming = status === "submitted" || status === "streaming";

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

  function clearChat() {
    setMessages([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  return (
    <div className="flex flex-col w-full h-full border border-white/10 bg-[#0B0C0E]/50 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth pb-32">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-8 text-center animate-in fade-in zoom-in duration-500 relative z-10">
            <div className="w-16 h-16 rounded-full bg-[#16171B] border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,242,155,0.1)]">
              <svg className="w-8 h-8 text-[#00F29B]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display">
                Welcome to Signal
              </h2>
              <p className="text-[#9C9FA8] max-w-md mx-auto">
                Your autonomous DeFi agent. Execute trades, find yields, and manage your portfolio with natural language.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 max-w-2xl mt-4">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => onSuggestion(p)}
                  className="rounded-xl border border-white/10 bg-[#16171B] px-5 py-3 text-sm text-[#9C9FA8] hover:border-[#00F29B]/50 hover:text-[#00F29B] transition-all duration-300 hover:-translate-y-1 shadow-lg"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex gap-4 max-w-[85%] md:max-w-[75%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                {m.role === "user" ? (
                  <div className="w-8 h-8 rounded-full bg-[#16171B] border border-white/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#9C9FA8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#00F29B]/10 border border-[#00F29B]/30 flex items-center justify-center shadow-[0_0_10px_rgba(0,242,155,0.2)]">
                    <svg className="w-4 h-4 text-[#00F29B]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div
                className={
                  "min-w-0 space-y-3 rounded-2xl px-5 py-4 text-[15px] leading-relaxed whitespace-pre-wrap break-words overflow-hidden " +
                  (m.role === "user"
                    ? "bg-[#16171B] border border-white/5 text-white rounded-tr-sm"
                    : "bg-transparent text-[#E4E4E7]")
                }
              >
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return <span key={i} className="block">{part.text}</span>;
                  }

                  if (isToolUIPart(part)) {
                    const name = getToolName(part);

                    if (name === "prepareJupiterSwap" && part.state === "output-available") {
                      const out = part.output as SwapToolOutput;
                      return (
                        <div key={i} className="mt-4">
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
                        <div key={i} className="mt-4">
                          <TransferApprovalCard
                            preview={out.preview}
                            txBase64={out.txBase64}
                            onConfirmed={(sig) => sendMessage({ text: `Tx confirmed: ${sig}` })}
                            onRejected={(reason) => sendMessage({ text: reason })}
                          />
                        </div>
                      );
                    }

                    if (part.state === "output-error") {
                      return (
                        <div key={i} className="my-2 p-3 rounded-xl border border-red-500/20 bg-red-500/5 font-mono text-xs text-red-400 flex items-start gap-2">
                          <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                          <span className="break-all">{name} failed{part.errorText ? `: ${part.errorText}` : ""}</span>
                        </div>
                      );
                    }

                    const running = part.state === "input-streaming" || part.state === "input-available";
                    return (
                      <div key={i} className="my-2 inline-flex items-center gap-3 rounded-xl border border-white/5 bg-[#0B0C0E]/50 px-4 py-2 font-mono text-xs text-[#9C9FA8] shadow-inner">
                        {running ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-[#00F29B] border-t-transparent animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5 text-[#00F29B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        )}
                        <span className="tracking-wide">Executing <span className="text-white">{name}</span>...</span>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          </div>
        ))}
        {error && (
          <div className="flex justify-center">
            <div className="px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              Error: {error.message}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#0B0C0E] via-[#0B0C0E]/80 to-transparent pt-12 pb-6 px-4 md:px-8">
        <form
          onSubmit={onSubmit}
          className="max-w-4xl mx-auto flex items-end gap-3"
        >
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              disabled={isStreaming}
              title="Clear conversation"
              className="rounded-2xl border border-white/10 bg-[#16171B] p-4 text-[#9C9FA8] hover:text-white hover:bg-white/5 disabled:opacity-50 transition-all shadow-xl"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            </button>
          )}
          <div className="relative flex-1 group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00F29B]/0 via-[#00F29B]/20 to-[#00F29B]/0 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Signal to analyze, swap, or transfer..."
              className="relative w-full rounded-2xl border border-white/10 bg-[#16171B] px-5 py-4 text-[15px] text-white placeholder-[#9C9FA8] focus:outline-none focus:border-[#00F29B]/50 transition-all shadow-xl"
              disabled={isStreaming}
            />
          </div>
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-2xl bg-[#00F29B] px-8 py-4 text-[15px] font-bold text-black hover:bg-[#00e599] disabled:opacity-50 transition-all duration-300 active:scale-95 flex items-center justify-center min-w-[120px] shadow-[0_0_20px_rgba(0,242,155,0.2)] disabled:shadow-none"
          >
            {isStreaming ? (
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-black rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            ) : (
              "Execute"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

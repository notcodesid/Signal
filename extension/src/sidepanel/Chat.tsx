import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  getToolName,
  type UIMessage,
} from "ai";
import { useEffect, useMemo, useState } from "react";

// In dev the backend lives on the user's local Next.js server. Phase 6f
// will swap this for the deployed Vercel URL. We hard-code the absolute URL
// here because extensions don't share an origin with the backend.
const BACKEND_URL = "http://localhost:3000/api/chat";

const STORAGE_KEY = "signal-ext:chat:v1";

const SUGGESTED_PROMPTS = [
  "Show me top stablecoin yields above $10M TVL",
  "What's the current Marinade staking APY?",
  "Quote 0.1 SOL to USDC",
  "What are the safest yields right now?",
];

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

export function Chat() {
  const [input, setInput] = useState("");

  // Wallet integration is Phase 6c. For now, walletAddress is always null —
  // the agent will handle it gracefully (asks user to connect, or simply
  // works with the wallet-less tools: yields, quotes, Marinade APY).
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: BACKEND_URL,
        body: () => ({ walletAddress: null }),
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
      // ignore quota errors
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
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="flex flex-col h-full bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-200">
                How can I help with your Solana yield?
              </p>
              <p className="text-xs text-gray-500">
                Try one of these to start
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => onSuggestion(p)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-white transition text-left"
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
            className={
              m.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={
                "min-w-0 max-w-[90%] space-y-2 rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words overflow-hidden " +
                (m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 border border-white/10 text-gray-100")
              }
            >
              {m.parts.map((part, i) => {
                if (part.type === "text") {
                  return <span key={i}>{part.text}</span>;
                }

                if (isToolUIPart(part)) {
                  const name = getToolName(part);

                  if (part.state === "output-error") {
                    return (
                      <div
                        key={i}
                        className="my-1 inline-block rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 font-mono text-[10px] text-red-300 break-all"
                      >
                        ❌ {name} failed
                        {part.errorText ? `: ${part.errorText}` : ""}
                      </div>
                    );
                  }

                  // Prepare-* tools need wallet signing — flag them as
                  // pending-wallet until Phase 6c lands.
                  if (
                    (name === "prepareJupiterSwap" ||
                      name === "prepareSolTransfer") &&
                    part.state === "output-available"
                  ) {
                    return (
                      <div
                        key={i}
                        className="my-1 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 font-mono text-[10px] text-yellow-200"
                      >
                        ⏸ {name} prepared — signing UI lands in 6c
                      </div>
                    );
                  }

                  const running =
                    part.state === "input-streaming" ||
                    part.state === "input-available";
                  return (
                    <div
                      key={i}
                      className="my-1 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-gray-300"
                    >
                      <span>{running ? "⚙️" : "✅"}</span>
                      <span>{name}</span>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        ))}
        {error && (
          <p className="text-xs text-red-400 break-words">
            Error: {error.message}
          </p>
        )}
      </div>
      <form
        onSubmit={onSubmit}
        className="border-t border-white/10 p-2 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Signal…"
          className="flex-1 min-w-0 rounded-md border border-white/10 bg-transparent px-3 py-2 text-xs text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isStreaming}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {isStreaming ? "…" : "Send"}
        </button>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            disabled={isStreaming}
            title="Clear conversation"
            className="rounded-md border border-white/10 px-2 py-2 text-[10px] text-gray-400 hover:text-gray-200 disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </form>
    </div>
  );
}

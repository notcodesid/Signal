"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

/**
 * Wraps the AI SDK `useChat` with everything specific to Signal:
 *
 *  - Threads the connected wallet address into every request body. `useChat`
 *    captures the transport once on first render, so we read the latest
 *    address from a ref instead of recreating the transport.
 *  - Owns the composer input state and a `submit()` helper.
 *  - Auto-scrolls to the newest message via `bottomRef`.
 *
 * Returns a flat bag of values the chat UI needs. Conversation history is NOT
 * persisted — it lives only for the current page session.
 */
export function useSignalChat() {
  const { publicKey } = useWallet();
  const [input, setInput] = useState("");

  // Latest wallet address, read by the transport's body() on each request.
  const walletAddressRef = useRef<string | null>(publicKey?.toBase58() ?? null);
  useEffect(() => {
    walletAddressRef.current = publicKey?.toBase58() ?? null;
  }, [publicKey]);

  // Build the transport once; body() closes over the ref so it always sees
  // the current wallet.
  const transport = useMemo(
    () =>
      // body() is a callback invoked per-request, not during render, so reading
      // the ref here is safe — the lint rule can't see through the closure.
      // eslint-disable-next-line react-hooks/refs
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ walletAddress: walletAddressRef.current }),
      }),
    []
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  const isStreaming = status === "submitted" || status === "streaming";

  // Keep the latest content in view as messages arrive / stream.
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  /** Send a free-text message (used by the composer and suggestion chips). */
  function send(text: string) {
    sendMessage({ text });
  }

  /** Submit the current composer input, if any and not mid-stream. */
  function submit() {
    const text = input.trim();
    if (!text || isStreaming) return;
    send(text);
    setInput("");
  }

  return {
    messages,
    send,
    submit,
    input,
    setInput,
    isStreaming,
    error,
    bottomRef,
  };
}

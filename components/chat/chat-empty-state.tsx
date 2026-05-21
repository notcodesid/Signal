"use client";

/**
 * The zero-message landing view: a small brand mark, a headline, and a few
 * starter prompts. Every prompt maps to a real agent capability so clicking
 * one always returns useful data (no dead-end suggestions). Clicking a chip
 * sends it immediately via `onPick`.
 */

const SUGGESTED_PROMPTS = [
  "what's my sol balance?",
  "highest stablecoin yields above $10m tvl",
  "best swap route for sol to usdc",
  "current marinade staking apy",
];

export function ChatEmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col items-center justify-center gap-7 px-4 text-center">
      {/* Brand mark + greeting */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 3 L13.5 10.5 L21 12 L13.5 13.5 L12 21 L10.5 13.5 L3 12 L10.5 10.5 Z" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-[26px] font-semibold tracking-tight text-gray-900">
            what can i help you with?
          </h1>
          <p className="text-[14px] text-gray-500">
            embedded ai for crypto protocols.
          </p>
        </div>
      </div>

      {/* Starter prompts */}
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPick(prompt)}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[13.5px] text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

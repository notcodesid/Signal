"use client";

/**
 * The zero-message landing view: a headline plus a few starter prompts.
 * Clicking a prompt sends it immediately via `onPick`.
 */

const SUGGESTED_PROMPTS = [
  "What's my current SOL balance?",
  "Highest stablecoin yields above $10M TVL",
  "Best swap route for SOL to USDC",
  "Trending meme coins right now",
  "Analyze my recent trading performance",
];

export function ChatEmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 pt-16 pb-32 text-center">
      <h1 className="font-display text-[26px] font-semibold tracking-tight text-gray-900">
        What can I help you do?
      </h1>
      <div className="flex w-full flex-wrap justify-center gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPick(prompt)}
            className="rounded-full bg-gray-50 px-4 py-2.5 text-[14px] text-gray-700 transition hover:bg-gray-100 active:bg-gray-200"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

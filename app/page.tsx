"use client";

import { Chat } from "@/components/chat";

export default function Home() {
  // `min-h-full flex flex-col` from layout.tsx body makes this flex item.
  // We give it flex-1 so it stretches to fill the viewport vertically and
  // the chat's flex column inside can size correctly.
  return (
    <main className="flex-1 min-h-0 flex flex-col bg-white text-gray-900">
      <Chat />
    </main>
  );
}

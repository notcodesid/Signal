"use client";

import { Chat } from "@/components/chat";

/**
 * The app route (`/chat`). The <Chat> component owns its own header (including
 * the wallet pill), transcript, and composer, so this page just gives it a
 * full-viewport flex container to fill.
 */
export default function ChatPage() {
  return (
    <main className="flex h-screen flex-col bg-white text-gray-900">
      <Chat />
    </main>
  );
}

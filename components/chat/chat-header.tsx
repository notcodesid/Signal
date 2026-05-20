"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { ChevronRightIcon } from "./icons";

function truncateAddr(s: string): string {
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

/**
 * Top bar: the "Signal" wordmark and a wallet status pill.
 *
 * The pill behaves like a tri-state control:
 *  - disconnected → opens the wallet-adapter modal
 *  - connected    → opens a small dropdown (copy address / disconnect)
 *
 * It reads wallet state directly from the adapter hooks so the parent doesn't
 * have to thread anything through.
 */
export function ChatHeader() {
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const connected = !!publicKey;

  function onPillClick() {
    if (!connected) setVisible(true);
    else setDropdownOpen((v) => !v);
  }

  function onCopyAddress() {
    if (publicKey) navigator.clipboard.writeText(publicKey.toBase58());
    setDropdownOpen(false);
  }

  function onDisconnect() {
    disconnect();
    setDropdownOpen(false);
  }

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between px-6">
      <span className="ml-2 text-[15px] font-medium tracking-wide text-gray-900">Signal</span>

      <div className="relative">
        <button
          onClick={onPillClick}
          className="group flex items-center gap-2 rounded-full px-3 py-1.5 hover:bg-gray-100"
        >
          <span
            className={
              "h-1.5 w-1.5 rounded-full " +
              (connected ? "bg-emerald-500" : "bg-gray-300")
            }
            aria-hidden
          />
          {connected ? (
            <span className="font-mono text-[11px] text-gray-500">
              {truncateAddr(publicKey!.toBase58())}
            </span>
          ) : (
            <span className="text-[12px] text-gray-400">connect</span>
          )}
          <ChevronRightIcon className="h-3 w-3 text-gray-300 group-hover:text-gray-500" />
        </button>

        {dropdownOpen && connected && (
          <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-gray-100 bg-white p-1 shadow-lg">
            <button
              onClick={onCopyAddress}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Copy Address
            </button>
            <button
              onClick={onDisconnect}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

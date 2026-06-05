import { useEffect, useState } from "react";
import { Chat } from "./Chat";
import { AlertsBell } from "./AlertsBell";
import { ChevronRightIcon } from "./icons";
import { usePhantom } from "@/lib/usePhantom";
import { usePageContext } from "@/lib/usePageContext";
import { setWatchedAddress } from "@/lib/watches";

function truncate(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function App() {
  const { publicKey, connecting, error, hasPhantom, connect, disconnect } =
    usePhantom();
  const pageContext = usePageContext();
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);

  useEffect(() => {
    void setWatchedAddress(publicKey);
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) return;
    chrome.runtime.sendMessage({ type: "signal:checkNow" }).catch(() => {});
  }, [publicKey]);

  function onWalletPillClick() {
    if (!publicKey) void connect();
    else setWalletMenuOpen((v) => !v);
  }

  function onCopyAddress() {
    if (publicKey) navigator.clipboard.writeText(publicKey);
    setWalletMenuOpen(false);
  }

  function onDisconnect() {
    void disconnect();
    setWalletMenuOpen(false);
  }

  return (
    <div className="flex h-full flex-col bg-white text-gray-900">
      <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-gray-100 px-4">
        <span className="text-[14px] font-medium tracking-wide text-gray-900">
          signal
        </span>

        <div className="flex items-center gap-1">
          <AlertsBell />

          <div className="relative">
            <button
              type="button"
              onClick={onWalletPillClick}
              disabled={connecting}
              className="group flex items-center gap-2 rounded-full px-2.5 py-1.5 hover:bg-gray-100 disabled:opacity-50"
            >
              <span
                className={
                  "h-1.5 w-1.5 rounded-full " +
                  (publicKey ? "bg-emerald-500" : "bg-gray-300")
                }
                aria-hidden
              />
              {publicKey ? (
                <span className="font-mono text-[10px] text-gray-500">
                  {truncate(publicKey)}
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">
                  {connecting ? "connecting…" : "connect"}
                </span>
              )}
              <ChevronRightIcon className="h-3 w-3 text-gray-300 group-hover:text-gray-500" />
            </button>

            {walletMenuOpen && publicKey && (
              <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-gray-100 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={onCopyAddress}
                  className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-gray-700 hover:bg-gray-50"
                >
                  Copy address
                </button>
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-red-600 hover:bg-red-50"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {pageContext.protocol && (
        <div
          className="mx-4 mt-2 flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] text-gray-600"
          title={pageContext.url ?? undefined}
        >
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
          <span>
            on <strong className="font-medium text-gray-800">{pageContext.protocol}</strong>
          </span>
          {pageContext.host && (
            <span className="ml-auto truncate font-mono text-[10px] text-gray-400 max-w-[120px]">
              {pageContext.host}
            </span>
          )}
        </div>
      )}

      {!hasPhantom && (
        <div className="mx-4 mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          Phantom not detected. Open an https:// page, reload, then connect.
        </div>
      )}
      {error && (
        <div className="mx-4 mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 break-words">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1">
        <Chat walletAddress={publicKey} pageContext={pageContext} />
      </div>
    </div>
  );
}
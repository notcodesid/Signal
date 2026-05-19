import { Chat } from "./Chat";
import { usePhantom } from "@/lib/usePhantom";
import { usePageContext } from "@/lib/usePageContext";

function truncate(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function App() {
  const { publicKey, connecting, error, hasPhantom, connect, disconnect } =
    usePhantom();
  const pageContext = usePageContext();

  return (
    <div className="flex flex-col h-full p-3 gap-3 bg-black text-gray-100">
      <header className="flex items-center gap-2 px-1">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500" />
        <h1 className="text-sm font-semibold tracking-tight">Signal</h1>

        <div className="ml-auto flex items-center gap-2">
          {publicKey ? (
            <>
              <span
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-mono text-gray-200"
                title={publicKey}
              >
                {truncate(publicKey)}
              </span>
              <button
                onClick={() => void disconnect()}
                className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-gray-400 hover:text-gray-200"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => void connect()}
              disabled={connecting}
              className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect Phantom"}
            </button>
          )}
        </div>
      </header>

      {/* Page-context badge: only show when we're on a known DeFi site, to
          avoid clutter on every random tab. */}
      {pageContext.protocol && (
        <div
          className="mx-1 flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 px-2 py-1 text-[10px] text-blue-200"
          title={pageContext.url ?? undefined}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>
            Viewing <strong>{pageContext.protocol}</strong>
          </span>
          <span className="ml-auto font-mono text-blue-300/60 truncate max-w-[140px]">
            {pageContext.host}
          </span>
        </div>
      )}

      {!hasPhantom && (
        <div className="mx-1 rounded-md border border-yellow-500/30 bg-yellow-500/5 px-2 py-1.5 text-[10px] text-yellow-200">
          Phantom not detected on this page. Open a regular https:// site
          and reload it, then try Connect again.
        </div>
      )}
      {error && (
        <div className="mx-1 rounded-md border border-red-500/30 bg-red-500/5 px-2 py-1.5 text-[10px] text-red-200 break-words">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <Chat walletAddress={publicKey} pageContext={pageContext} />
      </div>
    </div>
  );
}

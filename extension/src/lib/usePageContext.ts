import { useEffect, useState } from "react";

export type PageContext = {
  url: string | null;
  host: string | null;
  title: string | null;
  // If we recognize the hostname as a known Solana DeFi protocol, this is
  // the canonical product name (e.g. "Jupiter"). Otherwise null.
  protocol: string | null;
};

// Minimal Solana DeFi protocol registry. Keys are the canonical hostnames
// (suffix-matched, so "app.kamino.finance" also resolves to "Kamino").
// Add to this as we encounter more protocols in user testing.
const PROTOCOLS: Record<string, string> = {
  // Aggregators / DEXs
  "jup.ag": "Jupiter",
  "raydium.io": "Raydium",
  "orca.so": "Orca",
  "meteora.ag": "Meteora",
  "phoenix.trade": "Phoenix",
  // Lending — Kamino's primary domain moved to .com; keep .finance too.
  "kamino.com": "Kamino",
  "kamino.finance": "Kamino",
  "marginfi.com": "MarginFi",
  "save.finance": "Save",
  "drift.trade": "Drift",
  // Liquid staking
  "marinade.finance": "Marinade",
  "jito.network": "Jito",
  "sanctum.so": "Sanctum",
  // NFTs / aggregators / explorers
  "tensor.trade": "Tensor",
  "magiceden.io": "Magic Eden",
  "phantom.com": "Phantom",
  "solscan.io": "Solscan",
  "solanafm.com": "SolanaFM",
  "birdeye.so": "Birdeye",
  "dexscreener.com": "DexScreener",
  "pump.fun": "Pump.fun",
};

export function detectProtocol(host: string | null): string | null {
  if (!host) return null;
  for (const [pattern, name] of Object.entries(PROTOCOLS)) {
    if (host === pattern || host.endsWith("." + pattern)) return name;
  }
  return null;
}

const EMPTY: PageContext = {
  url: null,
  host: null,
  title: null,
  protocol: null,
};

async function readActiveTab(): Promise<PageContext> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.url) return EMPTY;
    const u = new URL(tab.url);
    // Don't surface internal/protected URLs — they're useless context and
    // would make the system prompt noisy. Treat them as "no context".
    if (
      u.protocol === "chrome:" ||
      u.protocol === "chrome-extension:" ||
      u.protocol === "edge:" ||
      u.protocol === "brave:" ||
      u.protocol === "about:"
    ) {
      return EMPTY;
    }
    return {
      url: tab.url,
      host: u.host,
      title: tab.title ?? null,
      protocol: detectProtocol(u.host),
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Tracks the active tab's URL/title/detected protocol. Updates automatically
 * when the user switches tabs or the active tab navigates. Returned object
 * is referentially stable per unique snapshot — safe to put in deps.
 */
export function usePageContext(): PageContext {
  const [ctx, setCtx] = useState<PageContext>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const c = await readActiveTab();
      if (!cancelled) setCtx(c);
    };
    refresh();

    const onActivated = () => {
      void refresh();
    };
    const onUpdated = (
      _tabId: number,
      info: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => {
      // Only refresh when the changes are relevant to *the active tab in
      // the current window*. We don't want to thrash on background-tab
      // network noise.
      if (!tab.active) return;
      if (info.url || info.title || info.status === "complete") {
        void refresh();
      }
    };
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      cancelled = true;
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  return ctx;
}

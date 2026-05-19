// Phantom client for the side panel.
//
// Side panels run on chrome-extension:// origins, where Phantom does NOT
// inject window.solana. So instead of talking to Phantom directly, we use
// chrome.scripting.executeScript({ world: "MAIN" }) to invoke a bridge that
// runs in the active tab's page context (where Phantom IS injected).
//
// The bridge lives in src/content/bridge-main.ts and registers itself on
// every web page as `window.__signalBridge` via the manifest content_scripts
// declaration (world: "MAIN").

type BridgeOk<T> = { ok: true } & T;
type BridgeErr = { ok: false; error: string };
type BridgeResult<T> = BridgeOk<T> | BridgeErr;

async function getActiveTabId(): Promise<number> {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const tab = tabs[0];
  if (!tab?.id) {
    throw new Error("No active tab in this window.");
  }
  // chrome.scripting can't inject into chrome:// / chrome-extension:// pages.
  // Detect early so we surface a clear error to the user.
  if (tab.url && /^(chrome|edge|brave|about|chrome-extension):/.test(tab.url)) {
    throw new Error(
      "Open a regular web page (any https:// site) so Phantom can be reached."
    );
  }
  return tab.id;
}

/**
 * Invoke a method on the page-side bridge. The function we inject is
 * stringified by Chrome and run fresh inside the page's main world — it
 * cannot close over variables, only its `args`.
 *
 * All failures (no tab, chrome:// page, bridge not loaded, Phantom missing)
 * are normalized into `{ ok: false, error }` so callers never have to
 * try/catch. This is critical for eager-connect, which fires on mount and
 * must not crash the React tree if the user happens to be on a chrome:// page.
 */
async function callBridge<T>(
  method: "hasPhantom" | "connect" | "eagerConnect" | "disconnect" | "signTransaction",
  // We use unknown[] because args round-trip through structured clone.
  args: unknown[] = []
): Promise<BridgeResult<T>> {
  try {
    const tabId = await getActiveTabId();
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: async (m: string, a: unknown[]) => {
        const bridge = (
          window as unknown as { __signalBridge?: Record<string, (...x: unknown[]) => unknown> }
        ).__signalBridge;
        if (!bridge) {
          return {
            ok: false,
            error:
              "Signal bridge not loaded on this page. Reload the page or open a new tab.",
          };
        }
        const fn = bridge[m];
        if (typeof fn !== "function") {
          return { ok: false, error: `Unknown bridge method: ${m}` };
        }
        return await fn(...a);
      },
      args: [method, args],
    });
    const result = results[0]?.result as BridgeResult<T> | undefined;
    if (!result) {
      return { ok: false, error: "Bridge returned no result." };
    }
    return result;
  } catch (e) {
    // chrome.scripting.executeScript throws on chrome:// / chrome-extension://
    // URLs and on tabs where activeTab hasn't been granted. Normalize.
    const raw = e instanceof Error ? e.message : String(e);
    const friendly = /chrome:\/\/|chrome-extension:\/\//i.test(raw)
      ? "Open a regular web page (any https:// site) so Phantom can be reached."
      : raw;
    return { ok: false, error: friendly };
  }
}

export async function bridgeHasPhantom(): Promise<boolean> {
  try {
    const r = await callBridge<{ ok: boolean }>("hasPhantom");
    // hasPhantom returns a plain boolean from the bridge — coerce.
    return (r as unknown as boolean) === true || r.ok === true;
  } catch {
    return false;
  }
}

export async function bridgeConnect(): Promise<
  BridgeResult<{ publicKey: string }>
> {
  return callBridge<{ publicKey: string }>("connect");
}

export async function bridgeEagerConnect(): Promise<
  BridgeResult<{ publicKey: string }>
> {
  return callBridge<{ publicKey: string }>("eagerConnect");
}

export async function bridgeDisconnect(): Promise<BridgeResult<unknown>> {
  return callBridge("disconnect");
}

export async function bridgeSignTransaction(
  txBase64: string
): Promise<BridgeResult<{ signedTxBase64: string }>> {
  return callBridge<{ signedTxBase64: string }>("signTransaction", [txBase64]);
}

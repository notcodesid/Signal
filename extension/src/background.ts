// Signal background service worker — Phase 7 (proactive layer).
//
// MV3 service workers are not persistent. They wake up when:
//   • An event fires (chrome.alarms, chrome.runtime.onMessage, etc.)
//   • The action is clicked
//   • A registered listener triggers
// Anything we need across runs lives in chrome.storage.local.

import { pushAlert, updateBadge } from "@/lib/watches";

const ALARM_NAME = "signal:tick";
const RPC_URL = "https://api.devnet.solana.com";
const THRESHOLD_LAMPORTS = 1_000_000; // 0.001 SOL — ignore noise below this
const POLL_MINUTES = 2;

// ─── Install / startup ─────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error("[bg] setPanelBehavior failed:", err));
  ensureAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
});

function ensureAlarm() {
  chrome.alarms.get(ALARM_NAME, (existing) => {
    if (!existing) {
      chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_MINUTES });
    }
  });
}

// ─── Tick handler ──────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  void tickBalanceWatch();
});

// Manual trigger from the side panel — gives the user instant feedback when
// they open the side panel after a while.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "signal:checkNow") {
    tickBalanceWatch().then(
      () => sendResponse({ ok: true }),
      (e) => sendResponse({ ok: false, error: String(e) })
    );
    return true; // keep channel open for async sendResponse
  }
  return false;
});

async function tickBalanceWatch(): Promise<void> {
  const { watchedAddress, lastSeenLamports } = await chrome.storage.local.get([
    "watchedAddress",
    "lastSeenLamports",
  ]);

  if (!watchedAddress) {
    // No wallet connected — nothing to watch.
    return;
  }

  let currentLamports: number;
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [watchedAddress],
      }),
    });
    const data = (await res.json()) as { result?: { value?: number } };
    currentLamports = data.result?.value ?? 0;
  } catch (e) {
    console.error("[bg] balance fetch failed:", e);
    return;
  }

  // First-ever check for this wallet — seed the baseline silently. Without
  // this, every fresh connect would fire an immediate "you have N SOL" alert,
  // which isn't actually news.
  if (lastSeenLamports == null) {
    await chrome.storage.local.set({ lastSeenLamports: currentLamports });
    return;
  }

  const delta = currentLamports - lastSeenLamports;
  if (Math.abs(delta) < THRESHOLD_LAMPORTS) {
    // Update the timestamp implicitly by writing nothing — saves storage churn.
    return;
  }

  // Fire alert.
  const sign = delta > 0 ? "+" : "";
  const body = `${sign}${(delta / 1e9).toFixed(4)} SOL (now ${(currentLamports / 1e9).toFixed(3)} SOL)`;
  const alert = await pushAlert({
    title: "SOL balance changed",
    body,
    delta,
    before: lastSeenLamports,
    after: currentLamports,
  });

  // Persist the new baseline so we don't keep re-alerting.
  await chrome.storage.local.set({ lastSeenLamports: currentLamports });

  await updateBadge();

  // @types/chrome has stale callback-style typings here; the runtime
  // actually accepts the 2-arg form and returns a Promise. Wrap in try.
  try {
    chrome.notifications.create(alert.id, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
      title: alert.title,
      message: alert.body,
      priority: 1,
    });
  } catch (err) {
    console.error("[bg] notifications.create failed:", err);
  }
}

// Clicking the system notification opens the side panel in the current window.
chrome.notifications.onClicked.addListener(async (id) => {
  try {
    const win = await chrome.windows.getCurrent();
    if (win.id != null) {
      await chrome.sidePanel.open({ windowId: win.id });
    }
  } catch (e) {
    console.error("[bg] open side panel from notification failed:", e);
  }
  chrome.notifications.clear(id);
});

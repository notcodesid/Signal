// Storage interface shared by the background service worker and the side
// panel. All state lives in chrome.storage.local — service workers are
// short-lived, so we never keep important state in memory.

export type Alert = {
  id: string;
  createdAt: number;
  title: string;
  body: string;
  read: boolean;
  // Optional context — populated for balance-change alerts.
  delta?: number;
  before?: number;
  after?: number;
};

type StorageShape = {
  watchedAddress?: string | null;
  lastSeenLamports?: number | null;
  alerts?: Alert[];
};

const MAX_ALERTS = 50;

export async function getStorage(): Promise<StorageShape> {
  return chrome.storage.local.get([
    "watchedAddress",
    "lastSeenLamports",
    "alerts",
  ]);
}

/**
 * Tell the background watcher which wallet to monitor. Pass null to stop
 * watching. Switching addresses clears the lamport baseline so we don't
 * fire a false "balance changed" alert.
 */
export async function setWatchedAddress(addr: string | null): Promise<void> {
  if (addr === null) {
    await chrome.storage.local.remove([
      "watchedAddress",
      "lastSeenLamports",
    ]);
    chrome.action.setBadgeText({ text: "" }).catch(() => {});
    return;
  }
  const { watchedAddress } = await getStorage();
  if (watchedAddress !== addr) {
    await chrome.storage.local.set({
      watchedAddress: addr,
      lastSeenLamports: null,
    });
  }
}

export async function getAlerts(): Promise<Alert[]> {
  const { alerts } = await getStorage();
  return alerts ?? [];
}

export async function pushAlert(
  alert: Omit<Alert, "id" | "createdAt" | "read">
): Promise<Alert> {
  const stored: Alert = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    read: false,
    ...alert,
  };
  const existing = await getAlerts();
  const updated = [stored, ...existing].slice(0, MAX_ALERTS);
  await chrome.storage.local.set({ alerts: updated });
  return stored;
}

export async function markAllRead(): Promise<void> {
  const alerts = await getAlerts();
  await chrome.storage.local.set({
    alerts: alerts.map((a) => ({ ...a, read: true })),
  });
  await chrome.action.setBadgeText({ text: "" }).catch(() => {});
}

export async function clearAlerts(): Promise<void> {
  await chrome.storage.local.set({ alerts: [] });
  await chrome.action.setBadgeText({ text: "" }).catch(() => {});
}

export function unreadCount(alerts: Alert[]): number {
  return alerts.filter((a) => !a.read).length;
}

export async function updateBadge(): Promise<void> {
  const alerts = await getAlerts();
  const n = unreadCount(alerts);
  await chrome.action
    .setBadgeText({ text: n === 0 ? "" : n > 9 ? "9+" : String(n) })
    .catch(() => {});
  await chrome.action
    .setBadgeBackgroundColor({ color: "#3b82f6" })
    .catch(() => {});
}

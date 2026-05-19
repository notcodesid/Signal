import { useCallback, useEffect, useState } from "react";
import {
  clearAlerts as _clearAlerts,
  getAlerts,
  markAllRead as _markAllRead,
  type Alert,
} from "./watches";

/**
 * Reactive view of `chrome.storage.local.alerts`. Listens for storage
 * changes so the bell badge updates in real time when the background
 * service worker pushes a new alert.
 */
export function useWatchAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const refresh = useCallback(async () => {
    setAlerts(await getAlerts());
  }, []);

  useEffect(() => {
    void refresh();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return;
      if (changes.alerts) void refresh();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    await _markAllRead();
    await refresh();
  }, [refresh]);

  const clearAll = useCallback(async () => {
    await _clearAlerts();
    await refresh();
  }, [refresh]);

  return {
    alerts,
    unreadCount: alerts.filter((a) => !a.read).length,
    markAllRead,
    clearAll,
  };
}

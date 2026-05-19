import { useCallback, useEffect, useState } from "react";
import {
  bridgeConnect,
  bridgeDisconnect,
  bridgeEagerConnect,
} from "./phantom";

const STORAGE_KEY = "signal-ext:wallet:v1";

export function usePhantom() {
  const [publicKey, setPublicKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // We can't synchronously tell whether the bridge is loaded — it depends on
  // the active tab. We assume yes; failures will set an error.
  const [hasPhantom, setHasPhantom] = useState<boolean>(true);

  // Try a silent re-connect on mount so the wallet appears without a click
  // if it was previously trusted on the current tab. Eager-connect must be
  // tolerant: the user might be on a chrome:// page, in which case the
  // bridge isn't reachable. We don't surface that as an error.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await bridgeEagerConnect();
      if (cancelled) return;
      if (r.ok) {
        setPublicKey(r.publicKey);
        setHasPhantom(true);
      } else if (r.error.toLowerCase().includes("not detected")) {
        setHasPhantom(false);
      }
      // Silently swallow other errors: "not-trusted", "Open a regular web
      // page", "bridge not loaded" — none of them are worth alarming the
      // user about during mount. They'll see the real error if/when they
      // click Connect.
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist for rehydration on next side panel open.
  useEffect(() => {
    try {
      if (publicKey) localStorage.setItem(STORAGE_KEY, publicKey);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore quota errors
    }
  }, [publicKey]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    const r = await bridgeConnect();
    setConnecting(false);
    if (r.ok) {
      setPublicKey(r.publicKey);
      setHasPhantom(true);
    } else {
      setError(r.error);
      if (r.error.toLowerCase().includes("not detected")) {
        setHasPhantom(false);
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    await bridgeDisconnect();
    setPublicKey(null);
  }, []);

  return {
    publicKey,
    connecting,
    error,
    hasPhantom,
    connect,
    disconnect,
  };
}

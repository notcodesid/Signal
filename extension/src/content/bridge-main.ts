// MAIN-world content script. Runs in the page's own JS context (not the
// extension's isolated world), which means we have access to window.solana
// / window.phantom.solana injected by Phantom. The trade-off: no chrome.*
// APIs. We communicate with the side panel via chrome.scripting.executeScript
// — the side panel injects a small function that calls into the bridge we
// install here.

import { VersionedTransaction } from "@solana/web3.js";

type PhantomLike = {
  publicKey: { toString(): string } | null;
  isConnected?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{
    publicKey: { toString(): string };
  }>;
  disconnect: () => Promise<void>;
  signTransaction: <T>(tx: T) => Promise<T>;
};

function getPhantom(): PhantomLike | null {
  const w = window as unknown as {
    phantom?: { solana?: PhantomLike };
    solana?: PhantomLike;
  };
  if (w.phantom?.solana) return w.phantom.solana;
  if (w.solana && typeof w.solana.connect === "function") return w.solana;
  return null;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

const bridge = {
  hasPhantom(): boolean {
    return getPhantom() != null;
  },

  async connect(): Promise<Ok<{ publicKey: string }> | Err> {
    const p = getPhantom();
    if (!p) return { ok: false, error: "Phantom not detected on this page." };
    try {
      const resp = await p.connect();
      return { ok: true, publicKey: resp.publicKey.toString() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async eagerConnect(): Promise<Ok<{ publicKey: string }> | Err> {
    const p = getPhantom();
    if (!p) return { ok: false, error: "Phantom not detected." };
    try {
      const resp = await p.connect({ onlyIfTrusted: true });
      return { ok: true, publicKey: resp.publicKey.toString() };
    } catch {
      // Not yet trusted — user must click Connect.
      return { ok: false, error: "not-trusted" };
    }
  },

  async disconnect(): Promise<Ok<unknown> | Err> {
    const p = getPhantom();
    if (!p) return { ok: false, error: "Phantom not detected." };
    try {
      await p.disconnect();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async signTransaction(
    txBase64: string
  ): Promise<Ok<{ signedTxBase64: string }> | Err> {
    const p = getPhantom();
    if (!p) return { ok: false, error: "Phantom not detected on this page." };
    try {
      const tx = VersionedTransaction.deserialize(base64ToBytes(txBase64));
      const signed = await p.signTransaction(tx);
      return { ok: true, signedTxBase64: bytesToBase64(signed.serialize()) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};

// Stash the bridge on a unique global so the side panel's executeScript can
// call into it.
(window as unknown as { __signalBridge?: typeof bridge }).__signalBridge = bridge;

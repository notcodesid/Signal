"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";

export type SwapPreview = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold?: string;
  priceImpactPct: string;
  slippageBps: number;
  routeHops: number;
};

// A small registry so we can show "0.1 SOL" instead of "100000000 So111...".
// Anything not in here falls back to a truncated mint and raw amount.
const KNOWN_TOKENS = new Map<string, { symbol: string; decimals: number }>([
  [
    "So11111111111111111111111111111111111111112",
    { symbol: "SOL", decimals: 9 },
  ],
  [
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    { symbol: "USDC", decimals: 6 },
  ],
  [
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    { symbol: "USDT", decimals: 6 },
  ],
  [
    "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    { symbol: "jitoSOL", decimals: 9 },
  ],
  [
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    { symbol: "mSOL", decimals: 9 },
  ],
  [
    "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    { symbol: "bSOL", decimals: 9 },
  ],
  [
    "BNso1VUJnh4zcfpZa6986Ea66P6TCp59hvtNJ8b1X85",
    { symbol: "BNSOL", decimals: 9 },
  ],
]);

function formatAmount(raw: string, mint: string): string {
  const meta = KNOWN_TOKENS.get(mint);
  if (!meta) {
    const short = `${mint.slice(0, 4)}…${mint.slice(-4)}`;
    return `${raw} (${short})`;
  }
  const n = Number(raw) / 10 ** meta.decimals;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${meta.symbol}`;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type State =
  | "idle"
  | "signing"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "rejected"
  | "error";

export function SwapApprovalCard({
  preview,
  txBase64,
  onConfirmed,
  onRejected,
}: {
  preview: SwapPreview;
  txBase64: string;
  onConfirmed: (signature: string) => void;
  onRejected: (reason: string) => void;
}) {
  const { signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const busy =
    state === "signing" || state === "submitting" || state === "confirming";
  const finished =
    state === "confirmed" || state === "rejected" || state === "error";

  async function onApprove() {
    if (!signTransaction || !connected) {
      setError("Wallet not connected. Connect Phantom and try again.");
      setState("error");
      return;
    }
    try {
      // 1. Deserialize the unsigned tx the server prepared for us.
      setState("signing");
      const tx = VersionedTransaction.deserialize(base64ToBytes(txBase64));

      // 2. Ask the wallet to sign (Phantom popup).
      const signed = await signTransaction(tx);

      // 3. Submit to the network. We DON'T skipPreflight — we want the RPC
      // to reject obviously-broken txs early.
      setState("submitting");
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
      setSignature(sig);

      // 4. Wait for confirmation. We use the latest blockhash strategy so
      // confirmTransaction has a definite expiry.
      setState("confirming");
      const latest = await connection.getLatestBlockhash();
      const conf = await connection.confirmTransaction(
        {
          signature: sig,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        "confirmed"
      );
      if (conf.value.err) {
        throw new Error(`Transaction failed on-chain: ${JSON.stringify(conf.value.err)}`);
      }

      setState("confirmed");
      onConfirmed(sig);
    } catch (e) {
      console.error("[SwapApprovalCard] error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setState("error");
    }
  }

  function onReject() {
    setState("rejected");
    onRejected("User rejected the swap.");
  }

  const inLabel = formatAmount(preview.inAmount, preview.inputMint);
  const outLabel = formatAmount(preview.outAmount, preview.outputMint);
  const minOut = preview.otherAmountThreshold
    ? formatAmount(preview.otherAmountThreshold, preview.outputMint)
    : null;
  const impact = Number(preview.priceImpactPct);
  const impactLabel = isFinite(impact)
    ? `${(impact * 100).toFixed(3)}%`
    : preview.priceImpactPct;

  return (
    <div className="my-2 w-full rounded-lg border border-blue-500/40 bg-blue-500/5 p-3 text-sm">
      <div className="mb-2 font-medium text-blue-200">Swap proposal</div>
      <div className="grid grid-cols-2 gap-y-1 text-xs">
        <div className="text-gray-400">You pay</div>
        <div className="text-right font-mono">{inLabel}</div>
        <div className="text-gray-400">You receive (est.)</div>
        <div className="text-right font-mono">{outLabel}</div>
        {minOut && (
          <>
            <div className="text-gray-400">Min received</div>
            <div className="text-right font-mono">{minOut}</div>
          </>
        )}
        <div className="text-gray-400">Price impact</div>
        <div className="text-right font-mono">{impactLabel}</div>
        <div className="text-gray-400">Slippage</div>
        <div className="text-right font-mono">
          {(preview.slippageBps / 100).toFixed(2)}%
        </div>
        <div className="text-gray-400">Route hops</div>
        <div className="text-right font-mono">{preview.routeHops}</div>
      </div>

      {!finished && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onApprove}
            disabled={busy}
            className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {state === "signing" && "Awaiting wallet…"}
            {state === "submitting" && "Submitting…"}
            {state === "confirming" && "Confirming…"}
            {state === "idle" && "Approve & sign"}
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="rounded-md border border-gray-600 px-3 py-1.5 text-xs text-gray-200 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      {state === "confirmed" && signature && (
        <div className="mt-3 text-xs text-green-400">
          ✅ Confirmed.{" "}
          <a
            href={`https://solscan.io/tx/${signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on Solscan
          </a>
        </div>
      )}

      {state === "rejected" && (
        <div className="mt-3 text-xs text-gray-400">Swap rejected.</div>
      )}

      {state === "error" && error && (
        <div className="mt-3 text-xs text-red-400 break-words">{error}</div>
      )}
    </div>
  );
}

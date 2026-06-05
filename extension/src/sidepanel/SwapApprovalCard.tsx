import { useState } from "react";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { bridgeSignTransaction } from "@/lib/phantom";

// Per-cluster RPCs. Jupiter swaps are always mainnet (that's where the
// liquidity is). SOL transfers may be either, controlled by their preview.
const RPC_BY_CLUSTER = {
  mainnet: "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
} as const;

export type SwapPreview = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold?: string;
  priceImpactPct: string;
  slippageBps: number;
  routeHops: number;
  cluster: "mainnet" | "devnet";
};

const KNOWN_TOKENS = new Map<string, { symbol: string; decimals: number }>([
  ["So11111111111111111111111111111111111111112", { symbol: "SOL", decimals: 9 }],
  ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", { symbol: "USDC", decimals: 6 }],
  ["Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", { symbol: "USDT", decimals: 6 }],
  ["J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", { symbol: "jitoSOL", decimals: 9 }],
  ["mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", { symbol: "mSOL", decimals: 9 }],
  ["bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1", { symbol: "bSOL", decimals: 9 }],
]);

function formatAmount(raw: string, mint: string): string {
  const meta = KNOWN_TOKENS.get(mint);
  if (!meta) {
    return `${raw} (${mint.slice(0, 4)}…${mint.slice(-4)})`;
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
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const busy =
    state === "signing" || state === "submitting" || state === "confirming";
  const finished =
    state === "confirmed" || state === "rejected" || state === "error";

  async function onApprove() {
    try {
      setState("signing");
      // Sign via the page-side Phantom bridge (chrome.scripting →
      // window.__signalBridge on the active tab).
      const signResult = await bridgeSignTransaction(txBase64);
      if (!signResult.ok) {
        throw new Error(signResult.error);
      }
      const signedTx = VersionedTransaction.deserialize(
        base64ToBytes(signResult.signedTxBase64)
      );

      setState("submitting");
      const connection = new Connection(
        RPC_BY_CLUSTER[preview.cluster],
        "confirmed"
      );
      const sig = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
      setSignature(sig);

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
        throw new Error(
          `Transaction failed on-chain: ${JSON.stringify(conf.value.err)}`
        );
      }
      setState("confirmed");
      onConfirmed(sig);
    } catch (e) {
      console.error("[SwapApprovalCard]", e);
      setError(e instanceof Error ? e.message : String(e));
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
    <div className="my-2 w-full rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-blue-900">Swap proposal</span>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] uppercase tracking-wider text-blue-700">
          {preview.cluster}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-1 text-[11px]">
        <div className="text-gray-500">You pay</div>
        <div className="text-right font-mono text-gray-900">{inLabel}</div>
        <div className="text-gray-500">You receive (est.)</div>
        <div className="text-right font-mono text-gray-900">{outLabel}</div>
        {minOut && (
          <>
            <div className="text-gray-500">Min received</div>
            <div className="text-right font-mono text-gray-900">{minOut}</div>
          </>
        )}
        <div className="text-gray-500">Price impact</div>
        <div className="text-right font-mono text-gray-900">{impactLabel}</div>
        <div className="text-gray-500">Slippage</div>
        <div className="text-right font-mono text-gray-900">
          {(preview.slippageBps / 100).toFixed(2)}%
        </div>
        <div className="text-gray-500">Route hops</div>
        <div className="text-right font-mono text-gray-900">{preview.routeHops}</div>
      </div>

      {!finished && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="flex-1 rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {state === "signing" && "Awaiting wallet…"}
            {state === "submitting" && "Submitting…"}
            {state === "confirming" && "Confirming…"}
            {state === "idle" && "Approve & sign"}
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      {state === "confirmed" && signature && (
        <div className="mt-3 text-[11px] text-green-700 break-all">
          ✅ Confirmed.{" "}
          <a
            href={`https://solscan.io/tx/${signature}${preview.cluster === "devnet" ? "?cluster=devnet" : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on Solscan
          </a>
        </div>
      )}
      {state === "rejected" && (
        <div className="mt-3 text-[11px] text-gray-500">Swap rejected.</div>
      )}
      {state === "error" && error && (
        <div className="mt-3 text-[11px] text-red-600 break-words">{error}</div>
      )}
    </div>
  );
}

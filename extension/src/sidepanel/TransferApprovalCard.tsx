import { useState } from "react";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { bridgeSignTransaction } from "@/lib/phantom";

const RPC_BY_CLUSTER = {
  mainnet: "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
} as const;

export type TransferPreview = {
  from: string;
  to: string;
  lamports: number;
  sol: number;
  cluster: "devnet" | "mainnet";
};

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function truncate(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

type State =
  | "idle"
  | "signing"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "rejected"
  | "error";

export function TransferApprovalCard({
  preview,
  txBase64,
  onConfirmed,
  onRejected,
}: {
  preview: TransferPreview;
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
      // Sign via the page-side Phantom bridge. The base64 tx round-trips
      // through chrome.scripting.executeScript into the active tab.
      const signResult = await bridgeSignTransaction(txBase64);
      if (!signResult.ok) {
        throw new Error(signResult.error);
      }
      // Hand the signed bytes back to the side panel for submission.
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
      console.error("[TransferApprovalCard]", e);
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  function onReject() {
    setState("rejected");
    onRejected("User rejected the transfer.");
  }

  const explorerSuffix = preview.cluster === "devnet" ? "?cluster=devnet" : "";

  return (
    <div className="my-2 rounded-lg border border-purple-500/40 bg-purple-500/5 p-2.5 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-purple-200">SOL transfer</span>
        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] uppercase tracking-wider text-purple-200">
          {preview.cluster}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-1 text-[11px]">
        <div className="text-gray-400">Amount</div>
        <div className="text-right font-mono">
          {preview.sol.toLocaleString(undefined, { maximumFractionDigits: 9 })} SOL
        </div>
        <div className="text-gray-400">From</div>
        <div className="text-right font-mono" title={preview.from}>
          {truncate(preview.from)}
        </div>
        <div className="text-gray-400">To</div>
        <div className="text-right font-mono" title={preview.to}>
          {truncate(preview.to)}
        </div>
      </div>

      {!finished && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onApprove}
            disabled={busy}
            className="flex-1 rounded-md bg-purple-600 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
          >
            {state === "signing" && "Awaiting wallet…"}
            {state === "submitting" && "Submitting…"}
            {state === "confirming" && "Confirming…"}
            {state === "idle" && "Approve & sign"}
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="rounded-md border border-white/10 px-3 py-1.5 text-[11px] text-gray-200 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      {state === "confirmed" && signature && (
        <div className="mt-3 text-[11px] text-green-400 break-all">
          ✅ Confirmed.{" "}
          <a
            href={`https://solscan.io/tx/${signature}${explorerSuffix}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on Solscan
          </a>
        </div>
      )}
      {state === "rejected" && (
        <div className="mt-3 text-[11px] text-gray-400">Transfer rejected.</div>
      )}
      {state === "error" && error && (
        <div className="mt-3 text-[11px] text-red-400 break-words">{error}</div>
      )}
    </div>
  );
}

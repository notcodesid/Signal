"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";

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
      setState("signing");
      const tx = VersionedTransaction.deserialize(base64ToBytes(txBase64));
      const signed = await signTransaction(tx);

      setState("submitting");
      const sig = await connection.sendRawTransaction(signed.serialize(), {
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
      console.error("[TransferApprovalCard] error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setState("error");
    }
  }

  function onReject() {
    setState("rejected");
    onRejected("User rejected the transfer.");
  }

  const explorerBase =
    preview.cluster === "devnet"
      ? "https://solscan.io/tx/"
      : "https://solscan.io/tx/";
  const explorerSuffix = preview.cluster === "devnet" ? "?cluster=devnet" : "";

  return (
    <div className="my-2 w-full rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-purple-900">SOL transfer</span>
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-purple-700">
          {preview.cluster}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-1.5 text-xs">
        <div className="text-gray-500">Amount</div>
        <div className="text-right font-mono text-gray-900">
          {preview.sol.toLocaleString(undefined, { maximumFractionDigits: 9 })} SOL
        </div>
        <div className="text-gray-500">From</div>
        <div className="text-right font-mono text-gray-900" title={preview.from}>
          {truncate(preview.from)}
        </div>
        <div className="text-gray-500">To</div>
        <div className="text-right font-mono text-gray-900" title={preview.to}>
          {truncate(preview.to)}
        </div>
      </div>

      {!finished && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onApprove}
            disabled={busy}
            className="flex-1 rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {state === "signing" && "Awaiting wallet…"}
            {state === "submitting" && "Submitting…"}
            {state === "confirming" && "Confirming…"}
            {state === "idle" && "Approve & sign"}
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      {state === "confirmed" && signature && (
        <div className="mt-3 text-xs text-green-700">
          ✅ Confirmed.{" "}
          <a
            href={`${explorerBase}${signature}${explorerSuffix}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on Solscan
          </a>
        </div>
      )}

      {state === "rejected" && (
        <div className="mt-3 text-xs text-gray-500">Transfer rejected.</div>
      )}

      {state === "error" && error && (
        <div className="mt-3 text-xs text-red-600 break-words">{error}</div>
      )}
    </div>
  );
}

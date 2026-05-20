"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, VersionedTransaction } from "@solana/web3.js";

export type TokenLaunchPreview = {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  mintAddress: string;
  tokenAccount: string;
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

export function TokenLaunchApprovalCard({
  preview,
  txBase64,
  mintSecret,
  onConfirmed,
  onRejected,
}: {
  preview: TokenLaunchPreview;
  txBase64: string;
  // The ephemeral mint keypair's secret bytes. We use it once to add a
  // partial signature to the create-account instruction, then it's dead.
  mintSecret: number[];
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

      // 1. Sign with the ephemeral mint keypair (so the createAccount ix
      //    for the new mint address is authorized).
      const mintKp = Keypair.fromSecretKey(Uint8Array.from(mintSecret));
      tx.sign([mintKp]);

      // 2. Have the user's wallet add its signature alongside.
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
      console.error("[TokenLaunchApprovalCard]", e);
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  function onReject() {
    setState("rejected");
    onRejected("User rejected the token launch.");
  }

  const explorerSuffix = preview.cluster === "devnet" ? "?cluster=devnet" : "";

  return (
    <div className="my-2 w-full rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-emerald-200">Token launch</span>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-200">
          {preview.cluster}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-1 text-xs">
        <div className="text-gray-400">Name</div>
        <div className="text-right font-mono">{preview.name}</div>
        <div className="text-gray-400">Symbol</div>
        <div className="text-right font-mono">{preview.symbol}</div>
        <div className="text-gray-400">Decimals</div>
        <div className="text-right font-mono">{preview.decimals}</div>
        <div className="text-gray-400">Initial supply</div>
        <div className="text-right font-mono">
          {preview.initialSupply.toLocaleString()}
        </div>
        <div className="text-gray-400">Mint address</div>
        <div
          className="text-right font-mono"
          title={preview.mintAddress}
        >
          {truncate(preview.mintAddress)}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-emerald-100/60">
        Wallets will show this token by its mint address until Metaplex
        metadata is added (separate step).
      </p>

      {!finished && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onApprove}
            disabled={busy}
            className="flex-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {state === "signing" && "Awaiting wallet…"}
            {state === "submitting" && "Submitting…"}
            {state === "confirming" && "Confirming…"}
            {state === "idle" && "Approve & launch"}
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
        <div className="mt-3 text-xs text-green-400 break-all">
          ✅ Token launched.{" "}
          <a
            href={`https://solscan.io/tx/${signature}${explorerSuffix}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            tx
          </a>
          {" · "}
          <a
            href={`https://solscan.io/token/${preview.mintAddress}${explorerSuffix}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            mint page
          </a>
        </div>
      )}
      {state === "rejected" && (
        <div className="mt-3 text-xs text-gray-400">Launch rejected.</div>
      )}
      {state === "error" && error && (
        <div className="mt-3 text-xs text-red-400 break-words">{error}</div>
      )}
    </div>
  );
}

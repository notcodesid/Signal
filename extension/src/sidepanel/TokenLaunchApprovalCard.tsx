import { useState } from "react";
import {
  Connection,
  Keypair,
  VersionedTransaction,
} from "@solana/web3.js";
import { bridgeSignTransaction } from "@/lib/phantom";

const RPC_BY_CLUSTER = {
  mainnet: "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
} as const;

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

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
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
  mintSecret: number[];
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

      // 1. Deserialize the server-built tx.
      const tx = VersionedTransaction.deserialize(base64ToBytes(txBase64));

      // 2. Add the ephemeral mint's partial signature locally. The bridge
      //    can't carry a Keypair across worlds, so we have to sign here.
      const mintKp = Keypair.fromSecretKey(Uint8Array.from(mintSecret));
      tx.sign([mintKp]);

      // 3. Re-serialize the partially-signed tx and send it through the
      //    Phantom bridge to add the user's wallet signature.
      const partiallySignedB64 = bytesToBase64(tx.serialize());
      const signResult = await bridgeSignTransaction(partiallySignedB64);
      if (!signResult.ok) {
        throw new Error(signResult.error);
      }
      const fullySigned = VersionedTransaction.deserialize(
        base64ToBytes(signResult.signedTxBase64)
      );

      setState("submitting");
      const connection = new Connection(
        RPC_BY_CLUSTER[preview.cluster],
        "confirmed"
      );
      const sig = await connection.sendRawTransaction(fullySigned.serialize(), {
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
    <div className="my-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-2.5 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-emerald-200">Token launch</span>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] uppercase tracking-wider text-emerald-200">
          {preview.cluster}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-1 text-[11px]">
        <div className="text-gray-400">Name</div>
        <div className="text-right font-mono">{preview.name}</div>
        <div className="text-gray-400">Symbol</div>
        <div className="text-right font-mono">{preview.symbol}</div>
        <div className="text-gray-400">Decimals</div>
        <div className="text-right font-mono">{preview.decimals}</div>
        <div className="text-gray-400">Supply</div>
        <div className="text-right font-mono">
          {preview.initialSupply.toLocaleString()}
        </div>
        <div className="text-gray-400">Mint</div>
        <div className="text-right font-mono" title={preview.mintAddress}>
          {truncate(preview.mintAddress)}
        </div>
      </div>

      <p className="mt-2 text-[10px] text-emerald-100/60">
        Wallets will show this token by mint address until Metaplex
        metadata is added.
      </p>

      {!finished && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onApprove}
            disabled={busy}
            className="flex-1 rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
          >
            {state === "signing" && "Awaiting wallet…"}
            {state === "submitting" && "Submitting…"}
            {state === "confirming" && "Confirming…"}
            {state === "idle" && "Approve & launch"}
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
            mint
          </a>
        </div>
      )}
      {state === "rejected" && (
        <div className="mt-3 text-[11px] text-gray-400">Launch rejected.</div>
      )}
      {state === "error" && error && (
        <div className="mt-3 text-[11px] text-red-400 break-words">{error}</div>
      )}
    </div>
  );
}

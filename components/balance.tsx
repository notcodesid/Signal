"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export function WalletBalance() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<{ address: string; sol: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || !publicKey) return;

    let cancelled = false;
    const fetchedFor = publicKey.toBase58();

    connection
      .getBalance(publicKey)
      .then((lamports) => {
        if (cancelled) return;
        setBalance({ address: fetchedFor, sol: lamports / LAMPORTS_PER_SOL });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("getBalance failed", err);
        setError("Could not fetch balance");
      });

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey, connected]);

  if (!connected || !publicKey) return null;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  // Show loading both on first fetch and when the wallet just switched
  // (balance is still from the previous address).
  const currentAddress = publicKey.toBase58();
  if (!balance || balance.address !== currentAddress) {
    return <p className="text-sm text-gray-500">Loading balance…</p>;
  }

  return <p className="text-sm">{balance.sol} SOL</p>;
}

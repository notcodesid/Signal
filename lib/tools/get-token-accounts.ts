import { tool } from "ai";
import { z } from "zod";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL =
  process.env.SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";

// SPL Token program ID — owns every SPL token account on Solana.
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

// A small symbol registry so the agent sees "USDC" instead of just a mint.
// Anything not here returns the mint truncated.
const KNOWN_TOKENS = new Map<string, { symbol: string }>([
  ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", { symbol: "USDC" }],
  ["Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", { symbol: "USDT" }],
  ["mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", { symbol: "mSOL" }],
  ["J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", { symbol: "jitoSOL" }],
  ["7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", { symbol: "ETH (Wormhole)" }],
  ["3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh", { symbol: "WBTC (Wormhole)" }],
  ["So11111111111111111111111111111111111111112", { symbol: "Wrapped SOL" }],
]);

export function makeTokenAccountTools({
  walletAddress,
}: {
  walletAddress: string | null;
}) {
  return {
    getTokenAccounts: tool({
      description:
        "List all SPL token accounts (non-SOL tokens) held by the user's " +
        "connected wallet, with balances. Use whenever the user asks about " +
        '"my tokens", "what do I hold", "what\'s in my wallet" beyond SOL, ' +
        '"my portfolio", or "do I have USDC/mSOL/etc". Returns tokens with ' +
        "non-zero balances only — empty accounts are filtered out.",
      inputSchema: z.object({}).passthrough(),
      execute: async () => {
        if (!walletAddress) {
          throw new Error(
            "No wallet connected. Ask the user to connect their Solana wallet first."
          );
        }

        console.log("[tool:getTokenAccounts] called for", walletAddress);

        const connection = new Connection(RPC_URL, "confirmed");
        const owner = new PublicKey(walletAddress);

        const resp = await connection.getParsedTokenAccountsByOwner(owner, {
          programId: TOKEN_PROGRAM_ID,
        });

        const accounts = resp.value
          .map((acc) => {
            const info = acc.account.data.parsed.info;
            const mint = info.mint as string;
            const amount = info.tokenAmount.uiAmount as number | null;
            const decimals = info.tokenAmount.decimals as number;
            const known = KNOWN_TOKENS.get(mint);
            return {
              mint,
              symbol:
                known?.symbol ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`,
              uiAmount: amount,
              decimals,
            };
          })
          .filter((t) => t.uiAmount !== null && t.uiAmount > 0)
          .sort((a, b) => (b.uiAmount ?? 0) - (a.uiAmount ?? 0));

        return {
          address: walletAddress,
          count: accounts.length,
          tokens: accounts,
        };
      },
    }),
  };
}

import { tool } from "ai";
import { z } from "zod";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

// Server-side RPC. Prefer a private SOLANA_RPC_URL (no NEXT_PUBLIC prefix) so
// the URL/API key never lands in the client bundle. Fall back to the public
// NEXT_PUBLIC value the wallet adapter already uses, then to devnet (we're
// developing against devnet for now).
const RPC_URL =
  process.env.SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";

/**
 * Wallet-aware tools. The user's connected wallet address is captured via
 * closure here so the model never has to pass it in — it's not the model's
 * job to know the user's address.
 */
export function makeWalletTools({
  walletAddress,
}: {
  walletAddress: string | null;
}) {
  return {
    getWalletBalance: tool({
      description:
        "Fetch the SOL balance of the user's connected Solana wallet. " +
        "Use whenever the user asks about their balance, holdings, " +
        "or how much SOL they have. The wallet address is already known " +
        "from context — do NOT pass an address argument. Throws if no " +
        "wallet is connected.",
      // We use an optional dummy field instead of z.object({}) because some
      // models (Llama on Groq notably) refuse to emit zero-arg tool calls
      // and inject bogus fields, which then trip Zod validation. The dummy
      // gives the model somewhere to "write" if it must, and passthrough()
      // tolerates anything extra without erroring out the tool call.
      inputSchema: z
        .object({
          reason: z
            .string()
            .optional()
            .describe("Optional: brief note about why you're checking."),
        })
        .passthrough(),
      execute: async () => {
        console.log("[tool:getWalletBalance] called, walletAddress=", walletAddress);

        if (!walletAddress) {
          throw new Error(
            "No wallet connected. Ask the user to connect their Solana wallet first."
          );
        }

        try {
          const connection = new Connection(RPC_URL, "confirmed");
          const lamports = await connection.getBalance(
            new PublicKey(walletAddress)
          );
          const result = {
            address: walletAddress,
            sol: lamports / LAMPORTS_PER_SOL,
            lamports,
          };
          console.log("[tool:getWalletBalance] result:", result);
          return result;
        } catch (err) {
          // Surface the real RPC/PublicKey error in the terminal so we can debug.
          console.error("[tool:getWalletBalance] failed:", err);
          throw err;
        }
      },
    }),
  };
}

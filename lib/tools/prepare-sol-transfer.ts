import { tool } from "ai";
import { z } from "zod";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

const RPC_URL =
  process.env.SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";

/**
 * Build an UNSIGNED SOL transfer for the user to approve in the UI.
 * Works on any cluster (devnet/mainnet) — RPC follows env config.
 */
export function makeTransferTools({
  walletAddress,
}: {
  walletAddress: string | null;
}) {
  return {
    prepareSolTransfer: tool({
      description:
        "Prepare an UNSIGNED SOL transfer transaction for the user to review and sign. " +
        "Use this ONLY after the user has explicitly confirmed they want to send SOL to " +
        'a specific address (e.g. "yes send it", "do it", "transfer it"). For just ' +
        "calculating amounts or discussing, do NOT call this tool. " +
        "Returns an unsigned transaction that the UI will render as an Approval card; " +
        "the user must click Approve to actually sign and submit. " +
        "Amount must be in LAMPORTS (1 SOL = 1_000_000_000 lamports).",
      inputSchema: z
        .object({
          recipient: z
            .string()
            .describe(
              "Base58-encoded Solana public key of the recipient. 32–44 chars."
            ),
          lamports: z
            .number()
            .int()
            .positive()
            .describe("Amount to send, in lamports (1 SOL = 1_000_000_000)."),
        })
        .passthrough(),
      execute: async ({ recipient, lamports }) => {
        if (!walletAddress) {
          throw new Error(
            "No wallet connected. Ask the user to connect their Solana wallet first."
          );
        }

        console.log("[tool:prepareSolTransfer] inputs:", {
          recipient,
          lamports,
          from: walletAddress,
        });

        // Validate keys early — better error than failing inside Jupiter etc.
        let from: PublicKey;
        let to: PublicKey;
        try {
          from = new PublicKey(walletAddress);
          to = new PublicKey(recipient);
        } catch (e) {
          throw new Error(
            `Invalid address: ${e instanceof Error ? e.message : String(e)}`
          );
        }

        const connection = new Connection(RPC_URL, "confirmed");
        const { blockhash } = await connection.getLatestBlockhash("confirmed");

        const instructions = [
          SystemProgram.transfer({
            fromPubkey: from,
            toPubkey: to,
            lamports,
          }),
        ];

        const message = new TransactionMessage({
          payerKey: from,
          recentBlockhash: blockhash,
          instructions,
        }).compileToV0Message();

        const tx = new VersionedTransaction(message);
        const txBase64 = Buffer.from(tx.serialize()).toString("base64");

        return {
          preview: {
            from: walletAddress,
            to: recipient,
            lamports,
            sol: lamports / LAMPORTS_PER_SOL,
            cluster: RPC_URL.includes("devnet") ? "devnet" : "mainnet",
          },
          txBase64,
        };
      },
    }),
  };
}

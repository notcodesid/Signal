import { tool } from "ai";
import { z } from "zod";

const MINT_HINTS =
  "Common mints: " +
  "SOL = So11111111111111111111111111111111111111112 (9 decimals). " +
  "USDC = EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (6 decimals). " +
  "USDT = Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB (6 decimals). " +
  "jitoSOL = J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn (9 decimals).";

/**
 * Wallet-dependent swap tool. Returns an UNSIGNED transaction the user
 * must approve in the UI. We never sign anything server-side.
 */
export function makeSwapTools({
  walletAddress,
}: {
  walletAddress: string | null;
}) {
  return {
    prepareJupiterSwap: tool({
      description:
        "Prepare an UNSIGNED Jupiter swap transaction for the user to review and sign. " +
        "Use this ONLY after the user has explicitly confirmed they want to execute a swap " +
        '(e.g. "yes, swap it", "go ahead", "execute that"). For just showing prices/quotes, ' +
        "use getJupiterQuote instead — do NOT call this for previews. " +
        "Returns an unsigned transaction that the UI will render as an Approval card; the " +
        "user must click Approve to actually sign and submit. After this tool succeeds, " +
        'reply briefly with something like "Review the swap above and click Approve when ready." ' +
        "Amounts must be in smallest units (1 SOL = 1_000_000_000 lamports, 1 USDC = 1_000_000). " +
        MINT_HINTS,
      inputSchema: z
        .object({
          inputMint: z
            .string()
            .describe("Mint address of the input (sell) token."),
          outputMint: z
            .string()
            .describe("Mint address of the output (buy) token."),
          amount: z
            .number()
            .int()
            .positive()
            .describe(
              "Amount of input token in its smallest units (lamports for SOL)."
            ),
          slippageBps: z
            .number()
            .int()
            .min(0)
            .max(10000)
            .optional()
            .describe(
              "Slippage tolerance in basis points. Default 50 (0.5%)."
            ),
        })
        .passthrough(),
      execute: async ({ inputMint, outputMint, amount, slippageBps = 50 }) => {
        if (!walletAddress) {
          throw new Error(
            "No wallet connected. Ask the user to connect their Solana wallet first."
          );
        }

        console.log("[tool:prepareJupiterSwap] inputs:", {
          inputMint,
          outputMint,
          amount,
          slippageBps,
        });

        // 1. Quote (Jupiter v6 lives at lite-api.jup.ag/swap/v1 now —
        // the old quote-api.jup.ag domain is dead).
        const quoteUrl = new URL("https://lite-api.jup.ag/swap/v1/quote");
        quoteUrl.searchParams.set("inputMint", inputMint);
        quoteUrl.searchParams.set("outputMint", outputMint);
        quoteUrl.searchParams.set("amount", String(amount));
        quoteUrl.searchParams.set("slippageBps", String(slippageBps));

        const quoteRes = await fetch(quoteUrl.toString());
        if (!quoteRes.ok) {
          const body = await quoteRes.text();
          throw new Error(`Jupiter quote failed (${quoteRes.status}): ${body}`);
        }
        const quote = await quoteRes.json();

        // 2. Build the swap transaction (server-side, but unsigned).
        const swapRes = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: walletAddress,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: {
              priorityLevelWithMaxLamports: {
                maxLamports: 1_000_000,
                priorityLevel: "medium",
              },
            },
          }),
        });
        if (!swapRes.ok) {
          const body = await swapRes.text();
          throw new Error(`Jupiter swap build failed (${swapRes.status}): ${body}`);
        }
        const swapData = await swapRes.json();
        const txBase64 = swapData.swapTransaction as string;

        if (!txBase64) {
          throw new Error("Jupiter did not return a swapTransaction.");
        }

        // Return a small preview + the unsigned tx bytes. The UI will render
        // an approval card; the user must click Approve to actually sign.
        // `cluster` tells the client which RPC to submit to — Jupiter only
        // has liquidity on mainnet, so this is always "mainnet" regardless
        // of what RPC the rest of the app is configured for.
        return {
          preview: {
            inputMint: quote.inputMint,
            outputMint: quote.outputMint,
            inAmount: quote.inAmount,
            outAmount: quote.outAmount,
            otherAmountThreshold: quote.otherAmountThreshold,
            priceImpactPct: quote.priceImpactPct,
            slippageBps: quote.slippageBps,
            routeHops: quote.routePlan?.length ?? 0,
            cluster: "mainnet" as const,
          },
          txBase64,
        };
      },
    }),
  };
}

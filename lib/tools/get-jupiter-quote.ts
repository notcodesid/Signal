import { tool } from "ai";
import { z } from "zod";

const MINT_HINTS =
  "Common mints: " +
  "SOL = So11111111111111111111111111111111111111112 (9 decimals). " +
  "USDC = EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (6 decimals). " +
  "USDT = Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB (6 decimals). " +
  "jitoSOL = J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn (9 decimals).";

/**
 * Read-only Jupiter quote tool. No wallet needed.
 */
export function makeQuoteTools() {
  return {
    getJupiterQuote: tool({
      description:
        "Get a Jupiter swap quote — how much output token the user would " +
        "receive for a given input amount. Use when the user asks about " +
        'prices, swap rates, or "how much X would I get for Y SOL/USDC". ' +
        "IMPORTANT: amount must be in the token's SMALLEST units — " +
        "lamports for SOL (1 SOL = 1_000_000_000), micro-units for USDC/USDT " +
        "(1 USDC = 1_000_000). Convert from human-readable amounts before calling. " +
        MINT_HINTS,
      inputSchema: z.object({
        inputMint: z
          .string()
          .describe("Solana mint address of the input (sell) token."),
        outputMint: z
          .string()
          .describe("Solana mint address of the output (buy) token."),
        amount: z
          .number()
          .int()
          .positive()
          .describe(
            "Amount of input token in its smallest units (e.g. lamports for SOL)."
          ),
        slippageBps: z
          .number()
          .int()
          .min(0)
          .max(10000)
          .optional()
          .describe("Slippage tolerance in basis points. Default 50 (0.5%)."),
      }),
      execute: async ({ inputMint, outputMint, amount, slippageBps = 50 }) => {
        // Jupiter migrated away from quote-api.jup.ag/v6 — that domain now
        // returns connection failures. The current public quote endpoint is
        // lite-api.jup.ag/swap/v1/quote (response shape is the same).
        const url = new URL("https://lite-api.jup.ag/swap/v1/quote");
        url.searchParams.set("inputMint", inputMint);
        url.searchParams.set("outputMint", outputMint);
        url.searchParams.set("amount", String(amount));
        url.searchParams.set("slippageBps", String(slippageBps));

        const res = await fetch(url.toString());
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Jupiter quote failed (${res.status}): ${body}`);
        }

        const data = await res.json();

        // Trim the response — Jupiter returns a huge routePlan we don't need
        // to feed back to the model. Keep just the bits it must reason over.
        return {
          inputMint: data.inputMint,
          outputMint: data.outputMint,
          inAmount: data.inAmount,
          outAmount: data.outAmount,
          otherAmountThreshold: data.otherAmountThreshold,
          priceImpactPct: data.priceImpactPct,
          slippageBps: data.slippageBps,
          routeHops: data.routePlan?.length ?? 0,
        };
      },
    }),
  };
}

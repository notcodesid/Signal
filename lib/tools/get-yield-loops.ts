import { tool } from "ai";
import { z } from "zod";

const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";

// Projects on DefiLlama that represent leveraged/looped yield products on
// Solana. The landscape changes — DefiLlama merged Kamino Multiply into
// `kamino-lend` (no per-pool flag), and MarginFi Loop is no longer a
// distinct project. Loopscale is currently the only first-class "loop"
// product in the yields feed. We keep the obsolete names too in case
// DefiLlama re-adds them.
const LEVERAGE_PROJECTS = new Set([
  "loopscale",
  "kamino-multiply",
  "kamino-leverage",
  "marginfi-loop",
]);

type LlamaPool = {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  poolMeta?: string | null;
  pool: string;
  url?: string;
};

export function makeYieldLoopTools() {
  return {
    getYieldLoops: tool({
      description:
        "Find leveraged-yield (looping) opportunities on Solana. Loops " +
        "amplify a base yield by repeatedly supplying and borrowing through " +
        "lending protocols like Kamino Multiply or MarginFi Loop. Use when " +
        'the user mentions "loop", "leverage", "multiply", "amplify yield", ' +
        '"yield loop", or asks about borrowing against an LST. Returns the ' +
        "current top markets with their net APY (after borrow costs) and " +
        "TVL. Does NOT execute — use prepareYieldLoopLink afterwards to " +
        "hand the user a deep link.",
      inputSchema: z
        .object({
          minApy: z
            .number()
            .min(0)
            .max(1000)
            .optional()
            .describe("Minimum net APY percentage. Default 0."),
          minTvlUsd: z
            .number()
            .min(0)
            .optional()
            .describe("Minimum TVL in USD. Default 1_000_000 for safety."),
          limit: z
            .number()
            .int()
            .min(1)
            .max(10)
            .optional()
            .describe("Maximum loops to return. Default 5."),
        })
        .passthrough(),
      execute: async ({ minApy = 0, minTvlUsd = 1_000_000, limit = 5 }) => {
        console.log("[tool:getYieldLoops] inputs:", {
          minApy,
          minTvlUsd,
          limit,
        });

        const res = await fetch(DEFILLAMA_POOLS_URL, {
          next: { revalidate: 300 },
        });
        if (!res.ok) {
          throw new Error(
            `DefiLlama yields failed (${res.status}): ${await res.text()}`
          );
        }
        const json = (await res.json()) as { data: LlamaPool[] };

        const loops = json.data
          .filter((p) => p.chain === "Solana")
          .filter((p) => LEVERAGE_PROJECTS.has(p.project))
          .filter((p) => (p.apy ?? 0) >= minApy)
          .filter((p) => p.tvlUsd >= minTvlUsd)
          .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
          .slice(0, limit)
          .map((p) => ({
            project: p.project,
            symbol: p.symbol,
            apy: Number((p.apy ?? 0).toFixed(2)),
            apyBase: p.apyBase != null ? Number(p.apyBase.toFixed(2)) : null,
            apyReward:
              p.apyReward != null ? Number(p.apyReward.toFixed(2)) : null,
            tvlUsd: Math.round(p.tvlUsd),
            meta: p.poolMeta ?? null,
            poolId: p.pool,
          }));

        return {
          chain: "Solana",
          count: loops.length,
          loops,
          note: loops.length === 0
            ? "No loop pools matched current filters. Try lowering minApy or minTvlUsd."
            : "These are leveraged yield products — APY is amplified but so is liquidation risk if collateral price moves vs borrowed asset.",
        };
      },
    }),
  };
}

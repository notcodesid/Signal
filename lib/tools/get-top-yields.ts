import { tool } from "ai";
import { z } from "zod";

// DefiLlama's yields API returns every pool across every chain — a few MB.
// We pull it once, filter to Solana, then trim to the model-friendly shape.
const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";

type LlamaPool = {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  ilRisk: string;
  exposure: string;
  stablecoin: boolean;
  pool: string;
};

export function makeYieldTools() {
  return {
    getTopYields: tool({
      description:
        "Fetch the top Solana DeFi yield opportunities from DefiLlama. " +
        "Use whenever the user asks about yield, APY, staking, lending, " +
        '"where can I earn", "best yield", "highest return", etc. ' +
        "Supports filters by minimum APY, minimum TVL (safety), and stablecoin-only.",
      inputSchema: z
        .object({
          minApy: z
            .number()
            .min(0)
            .max(1000)
            .optional()
            .describe("Minimum APY percentage to include. Default 0."),
          minTvlUsd: z
            .number()
            .min(0)
            .optional()
            .describe(
              "Minimum TVL in USD as a safety floor. Default 1_000_000 — pools below this are usually too thin."
            ),
          stablecoinsOnly: z
            .boolean()
            .optional()
            .describe(
              "If true, only return stablecoin pools (USDC, USDT, etc)."
            ),
          limit: z
            .number()
            .int()
            .min(1)
            .max(10)
            .optional()
            .describe("Maximum pools to return. Default 5."),
        })
        .passthrough(),
      execute: async ({
        minApy = 0,
        minTvlUsd = 1_000_000,
        stablecoinsOnly,
        limit = 5,
      }) => {
        console.log("[tool:getTopYields] inputs:", {
          minApy,
          minTvlUsd,
          stablecoinsOnly,
          limit,
        });

        const res = await fetch(DEFILLAMA_POOLS_URL, {
          // Cache the upstream response for 5 minutes — yields don't change
          // every second and we don't want to hammer DefiLlama on every prompt.
          next: { revalidate: 300 },
        });
        if (!res.ok) {
          throw new Error(
            `DefiLlama yields failed (${res.status}): ${await res.text()}`
          );
        }
        const json = (await res.json()) as { data: LlamaPool[] };

        const pools = json.data
          .filter((p) => p.chain === "Solana")
          .filter((p) => (p.apy ?? 0) >= minApy)
          .filter((p) => p.tvlUsd >= minTvlUsd)
          .filter((p) => (stablecoinsOnly ? p.stablecoin : true))
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
            ilRisk: p.ilRisk,
            exposure: p.exposure,
            stablecoin: p.stablecoin,
            poolId: p.pool,
          }));

        return {
          chain: "Solana",
          count: pools.length,
          pools,
        };
      },
    }),
  };
}

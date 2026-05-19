import { tool } from "ai";
import { z } from "zod";

// Use the same DefiLlama feed we already cache. Filter to Marinade's mSOL
// pool. This avoids a separate vendor SDK and keeps the pattern uniform.
const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";

type LlamaPool = {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  pool: string;
};

export function makeMarinadeTools() {
  return {
    getMarinadeApy: tool({
      description:
        "Get the current liquid-staking APY for Marinade (mSOL) on Solana. " +
        "Use whenever the user asks specifically about Marinade, liquid " +
        'staking SOL, mSOL, or "what\'s the staking rate". For broader yield ' +
        "discovery, prefer getTopYields instead.",
      inputSchema: z.object({}).passthrough(),
      execute: async () => {
        console.log("[tool:getMarinadeApy] called");

        const res = await fetch(DEFILLAMA_POOLS_URL, {
          next: { revalidate: 300 },
        });
        if (!res.ok) {
          throw new Error(
            `DefiLlama yields failed (${res.status}): ${await res.text()}`
          );
        }
        const json = (await res.json()) as { data: LlamaPool[] };

        // DefiLlama renamed the project from `marinade-finance` to
        // `marinade-liquid-staking` at some point. Match either to be
        // resilient to future renames.
        const marinade = json.data.find(
          (p) =>
            p.chain === "Solana" &&
            (p.project === "marinade-liquid-staking" ||
              p.project === "marinade-finance") &&
            p.symbol.toUpperCase() === "MSOL"
        );

        if (!marinade) {
          throw new Error(
            "Marinade mSOL pool not found on DefiLlama. The data feed may have changed shape."
          );
        }

        return {
          project: "Marinade",
          symbol: "mSOL",
          apy: Number((marinade.apy ?? 0).toFixed(2)),
          tvlUsd: Math.round(marinade.tvlUsd),
          note: "Liquid staking — you receive mSOL, which is tradeable. APY accrues by mSOL appreciating vs SOL.",
        };
      },
    }),
  };
}

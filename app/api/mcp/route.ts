import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";

// Same RPC fallback chain as the rest of the project. Server-only — MCP
// consumers (Claude Desktop, Cursor) never see this URL.
const RPC_URL =
  process.env.SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

// Convenience: turn a JSON-able result into MCP's tool content shape.
// MCP tools must return `{ content: [{ type: "text", text: string }] }`,
// where the text is typically JSON for downstream agents to parse.
function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function buildServer(): McpServer {
  const server = new McpServer({
    name: "signal-solana",
    version: "0.1.0",
  });

  // ─── Tool 1: getSolBalance ──────────────────────────────────────────────
  server.registerTool(
    "getSolBalance",
    {
      title: "Get SOL Balance",
      description:
        "Fetch the native SOL balance for any Solana wallet address. Returns lamports and the human-readable SOL amount.",
      inputSchema: {
        address: z
          .string()
          .describe("Base58-encoded Solana wallet public key."),
      },
    },
    async ({ address }) => {
      const connection = new Connection(RPC_URL, "confirmed");
      const lamports = await connection.getBalance(new PublicKey(address));
      return jsonResult({
        address,
        sol: lamports / LAMPORTS_PER_SOL,
        lamports,
      });
    }
  );

  // ─── Tool 2: getTokenAccounts ──────────────────────────────────────────
  server.registerTool(
    "getTokenAccounts",
    {
      title: "Get SPL Token Accounts",
      description:
        "List all SPL token holdings (non-zero balances only) for a Solana wallet address.",
      inputSchema: {
        address: z
          .string()
          .describe("Base58-encoded Solana wallet public key."),
      },
    },
    async ({ address }) => {
      const connection = new Connection(RPC_URL, "confirmed");
      const resp = await connection.getParsedTokenAccountsByOwner(
        new PublicKey(address),
        { programId: TOKEN_PROGRAM_ID }
      );
      const tokens = resp.value
        .map((acc) => {
          const info = acc.account.data.parsed.info;
          return {
            mint: info.mint as string,
            uiAmount: info.tokenAmount.uiAmount as number | null,
            decimals: info.tokenAmount.decimals as number,
          };
        })
        .filter((t) => t.uiAmount !== null && t.uiAmount > 0)
        .sort((a, b) => (b.uiAmount ?? 0) - (a.uiAmount ?? 0));
      return jsonResult({ address, count: tokens.length, tokens });
    }
  );

  // ─── Tool 3: getJupiterQuote ───────────────────────────────────────────
  server.registerTool(
    "getJupiterQuote",
    {
      title: "Get Jupiter Swap Quote",
      description:
        "Get a swap quote on Solana via Jupiter aggregator. Read-only. " +
        "Amounts must be in smallest units (1 SOL = 1_000_000_000 lamports, " +
        "1 USDC = 1_000_000).",
      inputSchema: {
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
          .describe("Amount of input token in its smallest units."),
        slippageBps: z
          .number()
          .int()
          .min(0)
          .max(10000)
          .optional()
          .describe("Slippage tolerance in basis points. Default 50."),
      },
    },
    async ({ inputMint, outputMint, amount, slippageBps }) => {
      const url = new URL("https://lite-api.jup.ag/swap/v1/quote");
      url.searchParams.set("inputMint", inputMint);
      url.searchParams.set("outputMint", outputMint);
      url.searchParams.set("amount", String(amount));
      url.searchParams.set("slippageBps", String(slippageBps ?? 50));
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(
          `Jupiter quote failed (${res.status}): ${await res.text()}`
        );
      }
      const data = await res.json();
      return jsonResult({
        inputMint: data.inputMint,
        outputMint: data.outputMint,
        inAmount: data.inAmount,
        outAmount: data.outAmount,
        otherAmountThreshold: data.otherAmountThreshold,
        priceImpactPct: data.priceImpactPct,
        slippageBps: data.slippageBps,
        routeHops: data.routePlan?.length ?? 0,
      });
    }
  );

  // ─── Tool 4: getTopYields ──────────────────────────────────────────────
  server.registerTool(
    "getTopYields",
    {
      title: "Get Top Solana Yields",
      description:
        "Fetch the top Solana DeFi yield opportunities (staking, lending, LPs) from DefiLlama, sorted by APY.",
      inputSchema: {
        minApy: z
          .number()
          .min(0)
          .max(1000)
          .optional()
          .describe("Minimum APY percentage to include."),
        minTvlUsd: z
          .number()
          .min(0)
          .optional()
          .describe(
            "Minimum TVL in USD. Default 1_000_000 — pools below this are usually too thin."
          ),
        stablecoinsOnly: z
          .boolean()
          .optional()
          .describe("If true, only return stablecoin pools."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe("Maximum pools to return. Default 5."),
      },
    },
    async ({ minApy, minTvlUsd, stablecoinsOnly, limit }) => {
      const res = await fetch("https://yields.llama.fi/pools");
      if (!res.ok) {
        throw new Error(`DefiLlama unreachable (${res.status})`);
      }
      const json = (await res.json()) as {
        data: Array<{
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
        }>;
      };
      const minA = minApy ?? 0;
      const minT = minTvlUsd ?? 1_000_000;
      const lim = limit ?? 5;
      const pools = json.data
        .filter((p) => p.chain === "Solana")
        .filter((p) => (p.apy ?? 0) >= minA)
        .filter((p) => p.tvlUsd >= minT)
        .filter((p) => (stablecoinsOnly ? p.stablecoin : true))
        .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
        .slice(0, lim)
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
      return jsonResult({ chain: "Solana", count: pools.length, pools });
    }
  );

  // ─── Tool 5: getMarinadeApy ────────────────────────────────────────────
  server.registerTool(
    "getMarinadeApy",
    {
      title: "Get Marinade Liquid-Staking APY",
      description:
        "Get the current Marinade liquid-staking APY for mSOL. Use specifically for SOL liquid-staking questions.",
      inputSchema: {},
    },
    async () => {
      const res = await fetch("https://yields.llama.fi/pools");
      if (!res.ok) {
        throw new Error(`DefiLlama unreachable (${res.status})`);
      }
      const json = (await res.json()) as {
        data: Array<{
          chain: string;
          project: string;
          symbol: string;
          tvlUsd: number;
          apy: number | null;
        }>;
      };
      const m = json.data.find(
        (p) =>
          p.chain === "Solana" &&
          (p.project === "marinade-liquid-staking" ||
            p.project === "marinade-finance") &&
          p.symbol?.toUpperCase() === "MSOL"
      );
      if (!m) {
        throw new Error(
          "Marinade mSOL pool not found on DefiLlama. The data feed may have changed shape."
        );
      }
      return jsonResult({
        project: "Marinade",
        symbol: "mSOL",
        apy: Number((m.apy ?? 0).toFixed(2)),
        tvlUsd: Math.round(m.tvlUsd),
        note: "Liquid staking — you receive mSOL, which is tradeable. APY accrues by mSOL appreciating vs SOL.",
      });
    }
  );

  return server;
}

// One handler for GET, POST, DELETE — Streamable HTTP MCP uses all three:
// POST for client→server requests, GET for SSE notifications, DELETE for
// session close. In stateless mode (sessionIdGenerator: undefined) we build
// a fresh transport per request — safe under Vercel's serverless model.
async function handler(req: Request): Promise<Response> {
  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export { handler as GET, handler as POST, handler as DELETE };

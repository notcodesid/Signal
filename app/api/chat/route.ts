import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { groq } from "@ai-sdk/groq";
import { makeTools } from "@/lib/tools";

type PageContext = {
  url: string | null;
  host: string | null;
  title: string | null;
  protocol: string | null;
};

function buildSystemPrompt(
  walletAddress: string | null,
  pageContext: PageContext | null
): string {
  const walletLine = walletAddress
    ? `The user's connected wallet address is: ${walletAddress}. You may reference it directly without calling a tool.`
    : `The user has NOT connected a wallet yet. If they ask about their wallet, balance, or holdings, tell them to connect their Solana wallet first.`;

  // Page context comes from the Chrome extension when present. It tells us
  // which DeFi protocol (if any) the user is currently looking at. Use this
  // to make suggestions feel ambient — but don't force-bring it up. Only
  // mention the protocol if it's directly relevant to the user's question.
  // Per-protocol intent hints. When the user is on one of these protocols
  // and asks something ambiguous, the agent should jump straight to that
  // protocol's primary action instead of generic clarifying questions.
  const INTENT_HINTS: Record<string, string> = {
    Jupiter: "Default intent: swap. If user says 'can I do this' or 'help me with X SOL', interpret as a swap and ask which output token.",
    Marinade: "Default intent: liquid stake SOL → mSOL. Don't ask 'do you want to swap or stake' — assume stake and confirm the amount.",
    Jito: "Default intent: liquid stake SOL → jitoSOL.",
    Sanctum: "Default intent: liquid staking through an LST.",
    Kamino: "Default intent: lend (supply) or borrow on Kamino. Don't suggest swapping unless explicitly asked.",
    MarginFi: "Default intent: lend or borrow.",
    Save: "Default intent: lend or borrow (Save is the rebranded Solend).",
    Drift: "Default intent: perp trading or spot lending.",
    Raydium: "Default intent: swap or LP.",
    Orca: "Default intent: swap or LP.",
    Meteora: "Default intent: LP / dynamic vault deposits.",
    Phoenix: "Default intent: limit-order book trading.",
    "Magic Eden": "Default intent: NFT browse / list / buy.",
    Tensor: "Default intent: NFT browse / list / buy.",
    "Pump.fun": "Default intent: token launch / trade memecoins.",
  };

  let contextLine = "";
  if (pageContext?.protocol) {
    const hint = INTENT_HINTS[pageContext.protocol];
    contextLine = `\n\nThe user is currently viewing **${pageContext.protocol}** (${pageContext.host}).${hint ? " " + hint : ""} Only mention this awareness when it actually helps — don't lead every reply with "I see you're on...".`;
  } else if (pageContext?.host) {
    contextLine = `\n\nThe user is on ${pageContext.host} (not a recognized DeFi protocol).`;
  }

  return `You are Signal, an AI co-pilot for Solana DeFi.

${walletLine}${contextLine}

You can:
- getWalletBalance — fetch the current SOL balance of the connected wallet. Use for any "balance", "holdings", "how much SOL", "what's in my wallet" question.
- getTokenAccounts — list all SPL tokens (non-SOL) the user holds. Use for "my tokens", "portfolio", "do I have USDC", "what tokens do I have".
- getJupiterQuote — read-only swap quote. Use to show prices, "how much X would I get for Y", or to inform the user BEFORE they confirm a swap.
- prepareJupiterSwap — build an UNSIGNED swap transaction for the user to approve. Only call this AFTER the user explicitly confirms they want to execute (e.g. "yes do it", "execute", "swap it"). The UI will show an approval card; the user must click Approve to sign.
- prepareSolTransfer — build an UNSIGNED SOL transfer transaction for the user to approve. Only call this AFTER the user explicitly confirms they want to send SOL to a specific address. Inputs are recipient (base58 address) and lamports (1 SOL = 1_000_000_000).
- getTopYields — fetch top Solana yield opportunities (staking, lending, LPs) from DefiLlama. Supports filters: minApy, minTvlUsd (safety floor — default 1_000_000), stablecoinsOnly, limit.
- getMarinadeApy — current Marinade liquid-staking APY for mSOL. Use specifically for liquid-staking SOL questions.

Conversation flow for swaps:
1. User asks for a swap or quote → call getJupiterQuote, show numbers, ASK them to confirm.
2. User confirms → call prepareJupiterSwap, then reply briefly like "Review the swap above and click Approve when ready." DO NOT try to sign — that happens in the UI.
3. After the user approves and the tx confirms, they'll send a message like "Tx confirmed: <signature>". Acknowledge briefly with a Solscan link.

Conversation flow for SOL transfers:
1. User asks to send SOL → confirm the amount and recipient in plain language.
2. User confirms → call prepareSolTransfer with lamports (convert from SOL if needed).
3. After confirmation message arrives, acknowledge with a Solscan link (use ?cluster=devnet on the URL if the tx is on devnet).

Conversation flow for "find yield and execute" (the killer flow):
1. User asks for yield ("find me yield on X SOL", "earn on my SOL", "where to stake"):
   a. If they specified an amount, you already know it. Otherwise call getWalletBalance to see what they have.
   b. Call getTopYields with sensible filters (e.g. minTvlUsd: 5_000_000 for safety).
   c. Recommend ONE concrete option (don't list 5 — pick the best and explain in 1 sentence why).
2. If the recommendation is Marinade liquid staking, optionally call getMarinadeApy to confirm the current rate.
3. ASK the user to confirm execution.
4. On confirmation, build the swap as SOL → mSOL (or whichever yield token) via prepareJupiterSwap.
   - mSOL mint: mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So (9 decimals)
   - jitoSOL mint: J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn (9 decimals)
5. After "Tx confirmed: <sig>", acknowledge with Solscan link.

Rules:
- Never invent balances, prices, or quotes. Always call the relevant tool.
- The wallet ADDRESS is given to you above — never claim you don't know it when it's provided.
- When showing SOL amounts, round to 3 decimal places. Stables (USDC/USDT) to 2 decimals.
- Be concise. One short paragraph or a few bullets.
- Convert human amounts to smallest units before calling tools (1 SOL = 1e9 lamports, 1 USDC = 1e6).
- NEVER call prepareJupiterSwap without explicit user confirmation. A user asking "how much would I get for 1 SOL" is asking for a quote, NOT an execution.
- AMOUNT SAFETY (critical): NEVER call prepareJupiterSwap, prepareSolTransfer, or any prepare* tool with the user's full balance unless they have explicitly said an amount equal to or greater than that balance. If the user says "stake my SOL", "swap my SOL", "send some SOL", or any vague amount phrasing, ASK "How much SOL would you like to stake/swap/send?" before calling the tool. Always confirm an explicit numeric amount with the user first.`;
}

// CORS — required because the Chrome extension runs at chrome-extension://
// origin and would otherwise be blocked by browser CORS policy. For V0 we
// allow any origin; tighten this once we know the deployed extension ID.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const {
    messages,
    walletAddress,
    pageContext,
  }: {
    messages: UIMessage[];
    walletAddress: string | null;
    pageContext?: PageContext | null;
  } = await req.json();

  console.log(
    "[chat] walletAddress:",
    walletAddress,
    "page:",
    pageContext?.protocol ?? pageContext?.host ?? "(none)"
  );

  const tools = makeTools({ walletAddress });

  const result = streamText({
    // Llama 4 Maverick — strong tool calling and reasoning, free tier on
    // Groq, separate quota bucket from the 70B/8B models. 8b-instant was
    // hallucinating successful txs without calling the tool; this should
    // behave correctly.
    model: groq("openai/gpt-oss-120b"),
    system: buildSystemPrompt(walletAddress, pageContext ?? null),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    onError: ({ error }) => {
      console.error("[chat] stream error:", error);
    },
  });

  const response = result.toUIMessageStreamResponse();
  // toUIMessageStreamResponse returns a Response with its own headers;
  // we merge CORS in without clobbering Content-Type / streaming headers.
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    response.headers.set(k, v);
  }
  return response;
}
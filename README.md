# Signal

**Embedded AI for Solana DeFi** — a co-pilot that lives where you already trade and earn, not in another tab.

Open the [web app](http://localhost:3000/chat), use the **Chrome extension** side panel on any protocol site, or query read-only data from an **MCP client**. Ask in plain English; Signal calls the right tools and shows an approval card for anything on-chain — you sign in Phantom, it executes.

Inspired by the Superteam build idea: [embedded AI in all crypto protocols](https://superteam.fun/build/ideas/embedded-ai-in-all-crypto-protocols).

> ⚠️ **Early / experimental.** Defaults to Solana **devnet**. Not audited. Do not use mainnet with real funds unless you understand exactly what each tool does.

---

## What we're building

Most crypto AI sits *beside* your wallet — another dashboard or chat window. Signal is meant to be **in the flow**:

| Principle | What it means in Signal |
| --- | --- |
| **Contextual** | Knows your connected wallet and which protocol tab you're on (Jupiter, Marinade, Kamino, …). |
| **Ambient** | One click away via the extension side panel while you browse DeFi. |
| **Proactive** | Wallet watches and alerts can surface in the extension before you ask. |
| **Trustworthy** | Server prepares unsigned transactions; you review and sign. Keys never hit the backend. |

**North star:** On any DeFi page, go from intent → correct action → one signed transaction without leaving the site you were already using.

---

## Example prompts

- *"What's my SOL balance?"*
- *"Swap 0.1 SOL to USDC"* (on Jupiter, the agent defaults to swap intent)
- *"Top stablecoin yields above $10M TVL"*
- *"Find yield on my SOL and help me execute"* (recommend → confirm → swap/stake)
- *"Launch a token called Halo with 1M supply"*

---

## What's in this repo

One shared agent, three surfaces:

| Surface | Path | Role |
| --- | --- | --- |
| **Web app** | `app/`, `components/`, `lib/` | Landing at `/`, chat at `/chat`. |
| **Chrome extension** | `extension/` | MV3 side panel: same agent, page context, Phantom bridge, alerts. |
| **MCP server** | `app/api/mcp/route.ts` | Streamable HTTP endpoint for read-only Solana tools (Claude Desktop, Cursor, …). |

---

## Features

- **Conversational DeFi** — Tool-calling agent; no manual forms for quotes or balances.
- **Wallet-aware** — SOL balance and SPL token accounts for the connected wallet.
- **Trading** — Jupiter quotes and unsigned swap txs; native SOL transfers.
- **Yield** — DefiLlama top yields, Marinade APY, leveraged loop discovery + deep links.
- **Token launch** — Mint a new SPL token from one approval (wallet + ephemeral mint signer).
- **Approval cards** — Human-readable preview before every `prepare*` action.
- **Protocol-aware extension** — Host registry and intent hints (e.g. Marinade → stake, Jupiter → swap).

---

## How the AI works (no fine-tuning)

Signal does **not** ship a custom fine-tuned model. Behavior comes from:

1. **Off-the-shelf LLM** — [Groq](https://console.groq.com) `openai/gpt-oss-120b` via [AI SDK v6](https://sdk.vercel.ai) in `app/api/chat/route.ts`.
2. **System prompt** — Wallet address, optional `pageContext` from the extension, tool usage rules, and safety (confirm before `prepare*`, never drain wallet on vague amounts).
3. **Tools** — `lib/tools/*` for real chain/API data; the model should not invent balances or quotes when tools are used correctly.
4. **UI policy** — Approval cards and Phantom signing enforce execution on the client.

To improve quality: extend tools, protocol registry, and prompts — not training runs.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Web /chat      │     │  Extension      │     │  MCP clients    │
│  + wallet       │     │  + pageContext  │     │  (read tools)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    POST /api/chat  (streamText + tools)
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
         get-* tools       prepare-* tools    Groq + system prompt
         (read data)       (unsigned tx)      (reason + policy)
              │                  │
              └────────┬─────────┘
                       ▼
              Approval cards → Phantom sign → confirm in chat
```

1. UI sends messages (+ `walletAddress`, optional `pageContext`) to `/api/chat`.
2. **Read tools** (`get-*`) return balances, quotes, yields, etc.
3. **Write tools** (`prepare-*`) return unsigned transactions only.
4. UI renders the matching **approval card**; you sign; client submits and posts `Tx confirmed: <sig>` back into the thread.

---

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19
- **AI:** AI SDK v6 + `@ai-sdk/groq` (`openai/gpt-oss-120b`)
- **Solana:** `@solana/web3.js`, `@solana/spl-token`, wallet-adapter (Phantom via Wallet Standard)
- **Data:** Jupiter (quotes/swaps), DefiLlama (yields), Marinade (staking APY)
- **Styling:** Tailwind CSS v4
- **Extension:** Vite + [@crxjs/vite-plugin](https://crxjs.dev/) (MV3 side panel)
- **Interop:** `@modelcontextprotocol/sdk` (MCP)

---

## Repository layout

```
loop/
├─ app/
│  ├─ api/chat/route.ts      # Agent: system prompt + Groq + tools
│  ├─ api/mcp/route.ts       # MCP read tools
│  ├─ page.tsx               # Landing (/)
│  ├─ chat/page.tsx          # Chat UI (/chat)
│  └─ providers.tsx          # Wallet-adapter providers
├─ components/
│  ├─ chat/                  # Chat UI (orchestrator, hooks, messages)
│  └─ *-approval-card.tsx    # Swap, transfer, token-launch, yield-loop
├─ lib/tools/                # One file per agent tool; makeTools() in index.ts
└─ extension/
   └─ src/
      ├─ sidepanel/          # Extension chat + approval cards
      ├─ content/            # Page bridge for signing
      ├─ background.ts       # MV3 service worker
      └─ lib/                # Phantom, page context, watches/alerts
```

### Agent tools

| Tool | Type | Purpose |
| --- | --- | --- |
| `getWalletBalance` | read | SOL balance |
| `getTokenAccounts` | read | SPL holdings |
| `getJupiterQuote` | read | Swap quote |
| `prepareJupiterSwap` | write | Unsigned Jupiter swap |
| `prepareSolTransfer` | write | Unsigned SOL transfer |
| `getTopYields` | read | DefiLlama yields |
| `getMarinadeApy` | read | mSOL staking APY |
| `getYieldLoops` | read | Leveraged loop products |
| `prepareYieldLoopLink` | write | Deep link to protocol UI |
| `prepareTokenLaunch` | write | Unsigned token mint |

---

## Getting started

### Prerequisites

- **Node.js 20+** and npm
- **Groq API key** — [console.groq.com](https://console.groq.com)
- Solana RPC (optional but recommended): [Helius](https://helius.dev) or [QuickNode](https://quicknode.com) devnet endpoint; falls back to public devnet
- **Phantom** on **devnet** — [switch networks](https://help.phantom.com/hc/en-us/articles/360122231293)

### 1. Clone & install

```bash
git clone https://github.com/notcodesid/signal.git loop
cd loop
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

| Variable | Required | Notes |
| --- | --- | --- |
| `GROQ_API_KEY` | ✅ | Used by the AI SDK Groq provider |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | recommended | Public RPC for browser + server fallback |
| `SOLANA_RPC_URL` | optional | Server-only override (MCP); takes precedence when set |

### 3. Web app

```bash
npm run dev
```

- Landing: [http://localhost:3000](http://localhost:3000)
- Chat: [http://localhost:3000/chat](http://localhost:3000/chat)

Connect Phantom (devnet), then chat. Devnet SOL: [faucet.solana.com](https://faucet.solana.com).

### 4. Chrome extension (optional)

```bash
cd extension
npm install
npm run build   # → extension/dist
```

1. `chrome://extensions` → **Developer mode**
2. **Load unpacked** → `extension/dist`
3. Pin **Signal**; open on any `https://` page

Keep `npm run dev` running in the repo root — the extension calls `http://localhost:3000/api/chat`. For HMR: `npm run dev` inside `extension/` and load the dev output dir.

### 5. MCP (optional)

Read tools at `http://localhost:3000/api/mcp` (Streamable HTTP). Point Claude Desktop, Cursor, or other MCP clients at that URL.

---

## Roadmap (directional)

- **Killer loop** — Contextual swap on Jupiter (and similar DEX hosts) from the extension with zero redundant questions.
- **More protocols** — Expand `PROTOCOLS` registry and intent hints; deepen integrations tier-by-tier (read → link → sign).
- **Proactive** — Richer watches → alert → prefilled chat.
- **Protocol MCP** — Partners expose tools; Signal orchestrates (read today, write via user-signed UI).

---

## Contributing

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for setup, conventions, and how to add a new agent tool.

- 🐛 **Bug?** [Open an issue](https://github.com/notcodesid/signal/issues/new) with repro steps and environment.
- 💡 **Idea?** Open an issue with the use case before a large PR.

---

## Disclaimer

Signal is experimental software provided "as is", without warranty. It is not audited. You are responsible for any transaction you sign. Test on devnet first.
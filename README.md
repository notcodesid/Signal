# Signal

**An AI Solana DeFi co-pilot you can talk to — in a web app, in your browser sidebar, or from any MCP client.**

Ask in plain English: *"What's my SOL balance?"*, *"Swap 0.1 SOL to USDC"*, *"Top stablecoin yields above $10M TVL"*, *"Launch a token called Halo with 1M supply"*. Signal reasons about it, calls the right on-chain/data tools, and hands you a transaction to approve — you sign, it executes.

> ⚠️ **Early / experimental.** Defaults to Solana **devnet**. Not audited. Don't point it at mainnet with real funds unless you understand exactly what each tool does.

---

## What's in this repo

Signal ships as three surfaces over one shared agent:

| Surface | Path | What it is |
| --- | --- | --- |
| **Web app** | `app/`, `components/`, `lib/` | A Next.js chat app — the reference experience. |
| **Chrome extension** | `extension/` | An MV3 side panel that embeds the same agent in your browser, aware of the page you're on, with proactive wallet alerts. |
| **MCP server** | `app/api/mcp/route.ts` | A Model Context Protocol endpoint so clients like Claude Desktop / Cursor can use Signal's read tools. |

All three talk to the same agent logic and tool set.

## Features

- **Conversational DeFi.** Natural-language chat backed by tool-calling — no dashboards.
- **Wallet aware.** Reads SOL balance and SPL token holdings for the connected wallet.
- **Swaps & transfers.** Jupiter quotes + swap building; native SOL transfers. You approve a single transaction in your wallet.
- **Yield discovery.** Top yields from DefiLlama, live Marinade staking APY, and leveraged "loop" products (Loopscale) with deep links.
- **Token launch.** Mint a brand-new SPL token (name, symbol, decimals, supply) from one approval — dual-signed by your wallet and an ephemeral mint keypair.
- **Approval cards, not blind signing.** Every state-changing action renders a human-readable card explaining exactly what you're about to sign.
- **Browser-native.** The extension reads page context (which protocol you're viewing) and can surface proactive alerts.

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19
- **AI:** [AI SDK v6](https://sdk.vercel.ai) with the Groq provider — model `openai/gpt-oss-120b`
- **Solana:** `@solana/web3.js`, `@solana/spl-token`, wallet-adapter (Phantom)
- **Data:** Jupiter (quotes/swaps), DefiLlama (yields), Marinade (staking APY)
- **Styling:** Tailwind CSS v4
- **Extension:** Vite + [@crxjs/vite-plugin](https://crxjs.dev/) (Manifest V3, side panel)
- **Interop:** `@modelcontextprotocol/sdk` (Streamable HTTP MCP server)

## Repository layout

```
loop/
├─ app/
│  ├─ api/chat/route.ts     # the agent: system prompt + tool wiring (Groq)
│  ├─ api/mcp/route.ts      # MCP server endpoint (read tools)
│  ├─ chat/page.tsx         # chat route
│  ├─ page.tsx              # home → renders <Chat>
│  └─ providers.tsx         # wallet-adapter providers
├─ components/
│  ├─ chat/                 # modular chat UI (see components/chat/)
│  │  ├─ index.tsx          # <Chat> orchestrator
│  │  ├─ use-signal-chat.ts # useChat + transport + wallet ref + autoscroll
│  │  ├─ chat-header.tsx    # brand + wallet pill/dropdown
│  │  ├─ chat-empty-state.tsx
│  │  ├─ message-list.tsx
│  │  ├─ message-bubble.tsx
│  │  ├─ tool-message-part.tsx  # routes tool calls → approval cards
│  │  ├─ chat-input.tsx
│  │  └─ icons.tsx
│  ├─ markdown.tsx
│  └─ *-approval-card.tsx   # swap / transfer / token-launch / yield-loop cards
├─ lib/
│  └─ tools/                # the agent's tool set (one file per tool)
│     ├─ index.ts           # makeTools() — assembles the toolset per request
│     ├─ get-wallet-balance.ts
│     ├─ get-token-accounts.ts
│     ├─ get-jupiter-quote.ts
│     ├─ prepare-jupiter-swap.ts
│     ├─ prepare-sol-transfer.ts
│     ├─ get-top-yields.ts
│     ├─ get-marinade-apy.ts
│     ├─ get-yield-loops.ts
│     ├─ prepare-yield-loop-link.ts
│     └─ prepare-token-launch.ts
└─ extension/               # Chrome extension (own package.json)
   └─ src/
      ├─ sidepanel/         # the extension's chat UI + cards
      ├─ content/           # page bridge for wallet signing
      ├─ background.ts      # MV3 service worker
      └─ lib/               # phantom bridge, page context, watch alerts
```

## Getting started

### Prerequisites

- **Node.js 20+** and npm
- A **Groq API key** — free at [console.groq.com](https://console.groq.com)
- A Solana RPC URL (a free [Helius](https://helius.dev) / [QuickNode](https://quicknode.com) devnet endpoint works well; defaults to public devnet if unset)
- The **Phantom** wallet browser extension, set to **devnet** ([how to switch networks](https://help.phantom.com/hc/en-us/articles/360122231293))

### 1. Clone & install

```bash
git clone <your-fork-url> loop
cd loop
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Then fill in `.env.local`:

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `GROQ_API_KEY` | ✅ | server | Read automatically by the AI SDK Groq provider. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | recommended | client + server | Falls back to public devnet if empty. Public (sent to the browser). |
| `SOLANA_RPC_URL` | optional | server / MCP | Server-only RPC override; takes precedence over the public one. |

### 3. Run the web app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **connect**, approve Phantom (on devnet), and start chatting. Get devnet SOL from [faucet.solana.com](https://faucet.solana.com) if you want to test transfers/swaps/launches.

### 4. Run the Chrome extension (optional)

```bash
cd extension
npm install
npm run build      # outputs to extension/dist
```

Then load it into Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select `extension/dist`
4. Pin **Signal** and open it on any `https://` page

> The extension calls the same `/api/chat` backend, so keep `npm run dev` running while you use it. For local dev it points at `http://localhost:3000`.

For active extension development use `npm run dev` inside `extension/` (Vite HMR), then load the dev build directory.

### 5. Use the MCP server (optional)

Signal exposes its read tools over MCP at `http://localhost:3000/api/mcp` (Streamable HTTP). Point an MCP client (Claude Desktop, Cursor, etc.) at that URL to let other agents query Solana data through Signal.

## How it works

1. The UI sends the conversation to `app/api/chat/route.ts`, which runs the agent with AI SDK v6 + Groq and the toolset from `lib/tools/`.
2. **Read tools** (`get-*`) return data the model reasons over (balances, yields, quotes…).
3. **Write tools** (`prepare-*`) don't sign anything — they build an unsigned transaction and return it.
4. The UI renders a matching **approval card**. You review and sign in your wallet; the client submits and confirms the transaction, then reports the signature back into the chat.

This split — server prepares, client signs — means private keys never touch the backend.

## Contributing

Contributions are welcome. Please read **[CONTRIBUTING.md](./CONTRIBUTING.md)** for dev setup, how to report a bug or request a feature, the PR workflow, and a step-by-step guide to adding a new agent tool.

- 🐛 **Found a bug?** [Open an issue](../../issues/new) — include repro steps, expected vs. actual, and your environment.
- 💡 **Have an idea?** Open an issue describing the use case before sending a large PR.

## Disclaimer

Signal is experimental software provided "as is", without warranty. It is not audited. You are responsible for any transactions you sign. Test on devnet first.

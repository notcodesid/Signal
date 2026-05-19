# Loop

**An AI-native yield strategy agent for Solana.** Ask in plain English where to put your SOL. Loop scans the major lending and yield venues, reasons about risk and APY, executes the move on-chain, and keeps watching so it can rebalance when the market shifts.

> Submission for the **OOBE × Ace Data Cloud bounty** ($2,400, deadline June 10, 2026).

---

## The thesis

The next wave of crypto products doesn't put AI *next to* the protocol — it embeds AI *inside* the interaction. A wallet that knows what you want. A DeFi position that reasons about itself. A signer that explains what it's about to do.

Loop is one concrete slice of that thesis: **the part of DeFi where a normal user has to read five dashboards, compare APYs, account for risk, and click through three protocols** — collapsed into one sentence and one signature.

## What Loop does (v1, what we ship for the bounty)

1. **Ask anything about yield.** *"Where should I park 50 SOL for the next month with low risk?"* or *"Best stablecoin yield right now that I can exit in <24h?"*
2. **The agent plans.** It uses Ace Data Cloud to pull live data and reason; it uses the Synapse DeFi plugin (43 tools) to read positions and rates across **Kamino, Marginfi, Drift, Lulo, Jito**, and more.
3. **You approve one transaction.** Loop assembles the route, shows you a plain-English explanation of what it's about to do and why, and asks for a single signature.
4. **Loop watches.** It keeps monitoring rates and risk signals. When a better venue appears (or your current one degrades), it surfaces the rebalance — you approve, it moves.

The before/after demo:
- **Before:** five tabs, three protocols, math in a notebook, 20 minutes.
- **After:** one sentence, one signature, 20 seconds.

## Why this wins the bounty

The OOBE × Ace bounty rewards products that use the bounty primitives as load-bearing, not decorative. Loop uses all four:

| Primitive | Role in Loop |
| --- | --- |
| **Synapse DeFi plugin** | The agent's tool surface — read positions, fetch APYs, build deposit/withdraw/rebalance routes across Kamino / Marginfi / Drift / Lulo / Jito. |
| **Ace Data Cloud (chat + SERP)** | The agent's reasoning brain — live market data, protocol news, risk signals beyond what's on-chain. |
| **x402 metering** | Every paid call the agent makes (premium data, model inference) is metered via x402 — the user (or the protocol) pays per use, no subscriptions. |
| **SAP registration** | Loop registers as a Solana Agent Protocol agent so other agents / wallets / dapps can discover and delegate to it. |
import { tool } from "ai";
import { z } from "zod";

// Map a project slug from DefiLlama to a base URL on the protocol's app.
// We don't pretend to know each protocol's exact deep-link query string —
// we point at the right product page and let the user fill in the amount.
// This is honest: Signal is a research/recommendation agent, not a clone of
// Kamino or MarginFi.
const PROJECT_LINKS: Record<
  string,
  { name: string; base: string }
> = {
  loopscale: {
    name: "Loopscale",
    base: "https://app.loopscale.com",
  },
  "kamino-multiply": {
    name: "Kamino Multiply",
    base: "https://app.kamino.com/multiply",
  },
  "kamino-leverage": {
    name: "Kamino Multiply",
    base: "https://app.kamino.com/multiply",
  },
  "marginfi-loop": {
    name: "MarginFi Looper",
    base: "https://app.marginfi.com/looper",
  },
};

export function makeYieldLoopLinkTools() {
  return {
    prepareYieldLoopLink: tool({
      description:
        "Generate a deep link to a leveraged-yield product so the user can " +
        "execute the loop in the protocol's own UI. Use this AFTER the user " +
        "has confirmed which loop they want to enter (e.g. 'yes, open " +
        "Kamino for the jitoSOL loop'). The UI will render a card with the " +
        "loop summary and an 'Open in <protocol>' button. " +
        "This does NOT sign a transaction — full native execution of " +
        "Kamino/MarginFi loops is a future feature; for now we hand off.",
      inputSchema: z
        .object({
          project: z
            .string()
            .describe(
              "DefiLlama project slug, e.g. kamino-multiply or marginfi-loop. " +
                "Use the same value you got from getYieldLoops."
            ),
          symbol: z
            .string()
            .describe(
              "The pool symbol, e.g. JITOSOL or MSOL-SOL. From getYieldLoops."
            ),
          apy: z
            .number()
            .describe("Net APY (after borrow costs). From getYieldLoops."),
          notes: z
            .string()
            .optional()
            .describe("Optional one-liner you'd like to show the user."),
        })
        .passthrough(),
      execute: async ({ project, symbol, apy, notes }) => {
        const link = PROJECT_LINKS[project];
        if (!link) {
          throw new Error(
            `No deep link configured for project "${project}". Known: ${Object.keys(
              PROJECT_LINKS
            ).join(", ")}`
          );
        }
        return {
          project,
          projectName: link.name,
          symbol,
          apy,
          url: link.base,
          notes: notes ?? null,
          // The UI uses this discriminator to render a YieldLoopCard with
          // an "Open in <protocol>" button instead of a wallet-signing card.
          kind: "deep-link" as const,
        };
      },
    }),
  };
}

import { makeWalletTools } from "./get-wallet-balance";
import { makeQuoteTools } from "./get-jupiter-quote";
import { makeSwapTools } from "./prepare-jupiter-swap";
import { makeTransferTools } from "./prepare-sol-transfer";
import { makeYieldTools } from "./get-top-yields";
import { makeMarinadeTools } from "./get-marinade-apy";
import { makeTokenAccountTools } from "./get-token-accounts";
import { makeYieldLoopTools } from "./get-yield-loops";
import { makeYieldLoopLinkTools } from "./prepare-yield-loop-link";
import { makeTokenLaunchTools } from "./prepare-token-launch";

/**
 * Build the agent's full toolset for a given request.
 * Anything that depends on per-request context (wallet address, future:
 * session id, locale, etc.) is threaded in here.
 */
export function makeTools({
  walletAddress,
}: {
  walletAddress: string | null;
}) {
  return {
    ...makeWalletTools({ walletAddress }),
    ...makeTokenAccountTools({ walletAddress }),
    ...makeQuoteTools(),
    ...makeSwapTools({ walletAddress }),
    ...makeTransferTools({ walletAddress }),
    ...makeYieldTools(),
    ...makeMarinadeTools(),
    ...makeYieldLoopTools(),
    ...makeYieldLoopLinkTools(),
    ...makeTokenLaunchTools({ walletAddress }),
  };
}

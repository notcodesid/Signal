"use client";

import {
  getToolOrDynamicToolName,
  type ToolUIPart,
  type DynamicToolUIPart,
} from "ai";
import {
  SwapApprovalCard,
  type SwapPreview,
} from "@/components/swap-approval-card";
import {
  TransferApprovalCard,
  type TransferPreview,
} from "@/components/transfer-approval-card";
import {
  YieldLoopCard,
  type YieldLoopLink,
} from "@/components/yield-loop-card";
import {
  TokenLaunchApprovalCard,
  type TokenLaunchPreview,
} from "@/components/token-launch-approval-card";
import { CheckIcon, ErrorIcon, Spinner } from "./icons";

// Output shapes returned by the corresponding `prepare*` tools server-side.
type SwapToolOutput = { preview: SwapPreview; txBase64: string };
type TransferToolOutput = { preview: TransferPreview; txBase64: string };
type TokenLaunchToolOutput = {
  preview: TokenLaunchPreview;
  txBase64: string;
  mintSecret: number[];
};

/**
 * Renders a single tool invocation inside an assistant message.
 *
 * The "prepare*" tools each return an unsigned transaction; we show the
 * matching approval card, whose confirm/reject callbacks feed a follow-up
 * message back into the conversation via `onSend`. Anything else (a tool that
 * is still running, finished without a card, or errored) falls through to a
 * compact status pill.
 */
export function ToolMessagePart({
  part,
  onSend,
}: {
  part: ToolUIPart | DynamicToolUIPart;
  onSend: (text: string) => void;
}) {
  const name = getToolOrDynamicToolName(part);

  if (name === "prepareJupiterSwap" && part.state === "output-available") {
    const out = part.output as SwapToolOutput;
    return (
      <div className="mt-3">
        <SwapApprovalCard
          preview={out.preview}
          txBase64={out.txBase64}
          onConfirmed={(sig) => onSend(`Tx confirmed: ${sig}`)}
          onRejected={(reason) => onSend(reason)}
        />
      </div>
    );
  }

  if (name === "prepareSolTransfer" && part.state === "output-available") {
    const out = part.output as TransferToolOutput;
    return (
      <div className="mt-3">
        <TransferApprovalCard
          preview={out.preview}
          txBase64={out.txBase64}
          onConfirmed={(sig) => onSend(`Tx confirmed: ${sig}`)}
          onRejected={(reason) => onSend(reason)}
        />
      </div>
    );
  }

  if (name === "prepareYieldLoopLink" && part.state === "output-available") {
    return (
      <div className="mt-3">
        <YieldLoopCard link={part.output as YieldLoopLink} />
      </div>
    );
  }

  if (name === "prepareTokenLaunch" && part.state === "output-available") {
    const out = part.output as TokenLaunchToolOutput;
    return (
      <div className="mt-3">
        <TokenLaunchApprovalCard
          preview={out.preview}
          txBase64={out.txBase64}
          mintSecret={out.mintSecret}
          onConfirmed={(sig) => onSend(`Token launched: ${sig}`)}
          onRejected={(reason) => onSend(reason)}
        />
      </div>
    );
  }

  // Any tool that errored.
  if (part.state === "output-error") {
    return (
      <div className="my-2 inline-flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 font-mono text-xs text-red-700">
        <ErrorIcon className="h-4 w-4 flex-shrink-0 text-red-500" />
        <span className="break-all">
          {name} failed{part.errorText ? `: ${part.errorText}` : ""}
        </span>
      </div>
    );
  }

  // Default: a small running/done status pill for tools without a card
  // (e.g. read-only data fetches).
  const running =
    part.state === "input-streaming" || part.state === "input-available";
  return (
    <div className="my-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 font-mono text-[11px] text-gray-600">
      {running ? <Spinner /> : <CheckIcon className="h-3 w-3 text-emerald-500" />}
      <span>
        {running ? "Running" : "Done"} ·{" "}
        <span className="text-gray-900">{name}</span>
      </span>
    </div>
  );
}

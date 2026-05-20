"use client";

export type YieldLoopLink = {
  project: string;
  projectName: string;
  symbol: string;
  apy: number;
  url: string;
  notes: string | null;
  kind: "deep-link";
};

export function YieldLoopCard({ link }: { link: YieldLoopLink }) {
  return (
    <div className="my-2 w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-amber-900">Leverage loop</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-700">
          deep link
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-1.5 text-xs">
        <div className="text-gray-500">Protocol</div>
        <div className="text-right font-mono text-gray-900">{link.projectName}</div>
        <div className="text-gray-500">Market</div>
        <div className="text-right font-mono text-gray-900">{link.symbol}</div>
        <div className="text-gray-500">Net APY</div>
        <div className="text-right font-mono text-gray-900">{link.apy.toFixed(2)}%</div>
      </div>
      {link.notes && (
        <p className="mt-2 text-[11px] text-amber-800/80">{link.notes}</p>
      )}
      <p className="mt-2 text-[11px] text-gray-500">
        Native loop execution is coming. For now, open the protocol&apos;s UI
        to complete the loop.
      </p>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
      >
        Open in {link.projectName} ↗
      </a>
    </div>
  );
}

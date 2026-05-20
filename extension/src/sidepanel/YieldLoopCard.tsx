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
    <div className="my-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-amber-200">Leverage loop</span>
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] uppercase tracking-wider text-amber-200">
          deep link
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-1 text-[11px]">
        <div className="text-gray-400">Protocol</div>
        <div className="text-right font-mono">{link.projectName}</div>
        <div className="text-gray-400">Market</div>
        <div className="text-right font-mono">{link.symbol}</div>
        <div className="text-gray-400">Net APY</div>
        <div className="text-right font-mono">{link.apy.toFixed(2)}%</div>
      </div>
      {link.notes && (
        <p className="mt-2 text-[10px] text-amber-100/70">{link.notes}</p>
      )}
      <p className="mt-2 text-[10px] text-gray-400">
        Native loop execution lands later. For now, finish the action on the
        protocol&apos;s own UI.
      </p>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-amber-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-amber-500"
      >
        Open in {link.projectName} ↗
      </a>
    </div>
  );
}

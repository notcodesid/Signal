import { useEffect, useRef, useState } from "react";
import { useWatchAlerts } from "@/lib/useWatchAlerts";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function AlertsBell() {
  const [open, setOpen] = useState(false);
  const { alerts, unreadCount, markAllRead, clearAll } = useWatchAlerts();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          const wasOpen = open;
          setOpen(!wasOpen);
          if (!wasOpen && unreadCount > 0) void markAllRead();
        }}
        className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        title="Alerts"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[14px] rounded-full bg-gray-900 px-1 py-px text-center text-[9px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-20 w-72 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-[12px] font-medium text-gray-900">Alerts</span>
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={() => void clearAll()}
                className="text-[10px] text-gray-400 hover:text-gray-700"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="p-4 text-center text-[11px] text-gray-500">
                No alerts yet. Signal will notify you when your SOL balance
                changes.
              </p>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className="border-b border-gray-50 px-3 py-2 last:border-b-0"
                >
                  <div className="text-[11px] font-medium text-gray-900">
                    {a.title}
                  </div>
                  <div className="break-all font-mono text-[10px] text-gray-500">
                    {a.body}
                  </div>
                  <div className="mt-0.5 text-[9px] text-gray-400">
                    {formatRelative(a.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
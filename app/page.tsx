import Link from "next/link";

// Sparkle mark — absolute SVG coords (no relative `l-x-y`) to stay clear of
// the model-slug linter.
const SPARKLE =
  "M12 3 L13.5 10.5 L21 12 L13.5 13.5 L12 21 L10.5 13.5 L3 12 L10.5 10.5 Z";

function Sparkle({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={SPARKLE} />
    </svg>
  );
}

// What the agent can actually do today — each maps to real tools.
const CAPABILITIES: { title: string; desc: string }[] = [
  {
    title: "wallet & holdings",
    desc: "check your sol balance and token holdings in plain english.",
  },
  {
    title: "yields & strategies",
    desc: "compare live yields across solana, including leverage loops.",
  },
  {
    title: "swaps & transfers",
    desc: "quote and route through jupiter, send sol, and sign once.",
  },
  {
    title: "token launch",
    desc: "mint a brand-new spl token from a single sentence.",
  },
];

const STEPS: { n: string; title: string; desc: string }[] = [
  {
    n: "1",
    title: "ask in plain english",
    desc: "say what you want. no dashboards, no forms, no five open tabs.",
  },
  {
    n: "2",
    title: "the agent works",
    desc: "it pulls live data and builds the exact transaction for you.",
  },
  {
    n: "3",
    title: "you approve once",
    desc: "review a human-readable card and sign. your keys never touch the backend.",
  },
];

const SURFACES = ["web app", "chrome extension", "mcp server"];

/**
 * Marketing landing page (route: `/`). Static server component — explains the
 * product across a few sections, then funnels into the app at `/chat`.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-white text-gray-900">
      {/* Nav */}
      <header className="flex h-16 flex-shrink-0 items-center justify-between px-6 sm:px-10">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white">
            <Sparkle className="h-4 w-4" />
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight">
            signal
          </span>
        </div>
        <Link
          href="/chat"
          className="rounded-full bg-gray-900 px-4 py-2 text-[14px] font-medium text-white transition hover:bg-gray-800"
        >
          open app
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-6 pt-20 pb-16 text-center sm:pt-28">
        <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white">
          <Sparkle className="h-7 w-7" />
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          embedded ai in all crypto protocols
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-gray-500">
          signal puts an ai agent right inside your browser — aware of the
          protocol you&apos;re on, ready to find yields, swap, transfer, and
          sign. embedded in the interaction, not bolted on beside it.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/chat"
            className="rounded-full bg-gray-900 px-6 py-3 text-[15px] font-medium text-white transition hover:bg-gray-800 active:scale-[0.98]"
          >
            start chatting →
          </Link>
          <a
            href="#how"
            className="rounded-full px-5 py-3 text-[15px] font-medium text-gray-600 transition hover:bg-gray-100"
          >
            see how it works
          </a>
        </div>
      </section>

      {/* Capabilities — anchored by a heading, clean text-only grid */}
      <section className="mx-auto w-full max-w-5xl px-6 py-14">
        <h2 className="text-center font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          one chat, the whole stack
        </h2>
        <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((c) => (
            <div key={c.title}>
              <h3 className="text-[15px] font-medium text-gray-900">{c.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-gray-500">
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Embedded thesis */}
      <section className="mt-6 border-y border-gray-100 bg-gray-50/60">
        <div className="mx-auto w-full max-w-2xl px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            embedded, not bolted on
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-gray-500">
            most ai sits next to your wallet in another tab. signal lives inside
            the page — a browser side panel that reads the protocol you&apos;re
            viewing and acts on-chain right there. one agent, three ways to reach
            it:
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SURFACES.map((s) => (
              <span
                key={s}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[13px] text-gray-700"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="text-center font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          how it works
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center sm:text-left">
              <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-[13px] font-semibold text-white sm:mx-0">
                {s.n}
              </div>
              <h3 className="text-[15px] font-medium text-gray-900">{s.title}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-gray-500">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-2xl px-6 pb-24 text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          ready to try it?
        </h2>
        <Link
          href="/chat"
          className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-3 text-[15px] font-medium text-white transition hover:bg-gray-800 active:scale-[0.98]"
        >
          open app →
        </Link>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-100">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 text-[13px] text-gray-400">
          <span>signal — embedded ai for crypto protocols</span>
          <span>built on solana</span>
        </div>
      </footer>
    </main>
  );
}

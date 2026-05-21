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

// GitHub mark (official octocat). Uses currentColor so it inherits text color.
function GithubIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
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
        <div className="flex items-center gap-1">
          <a
            href="https://github.com/notcodesid/signal"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="github"
            className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <GithubIcon className="h-5 w-5" />
          </a>
          <Link
            href="/chat"
            className="rounded-full bg-gray-900 px-4 py-2 text-[14px] font-medium text-white transition hover:bg-gray-800"
          >
            open app
          </Link>
        </div>
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
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/notcodesid/signal"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="github"
              className="text-gray-400 transition hover:text-gray-700"
            >
              <GithubIcon className="h-[18px] w-[18px]" />
            </a>
            <span>built on solana</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

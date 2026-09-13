import Image from "next/image";
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
      <section
        className="relative w-full shrink-0 overflow-hidden pt-16 text-center sm:pt-20"
        style={{ height: "calc(100svh - 4rem)" }}
      >
        <div className="relative z-10 mx-auto max-w-3xl px-6">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            embedded ai in all crypto protocols
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-gray-500">
            an ambient layer (extension or browser) embedded into crypto
            protocols that suggests defi strategies, launches assets, and
            executes on-chain actions in-flow
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/chat"
              className="rounded-full bg-gray-900 px-6 py-3 text-[15px] font-medium text-white transition hover:bg-gray-800 active:scale-[0.98]"
            >
              try 0.1 version →
            </Link>
            <a
              href="#problem"
              className="rounded-full px-5 py-3 text-[15px] font-medium text-gray-600 transition hover:bg-gray-100"
            >
              why signal
            </a>
          </div>
        </div>

        <Image
          src="/PXNhr4LbXoJRWLAHfzNTYjvdR5Y.png"
          alt=""
          width={3232}
          height={1504}
          preload
          sizes="100vw"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-auto w-full"
        />
      </section>

      <section
        id="problem"
        className="w-full px-6 py-20 sm:py-28"
      >
        <div className="mx-auto w-full max-w-4xl">
          <article className="pb-16 sm:pb-20">
            <p className="font-mono text-xs tracking-widest text-gray-400">
              01 / problem
            </p>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              problem to solve
            </h2>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-gray-600 sm:text-xl">
              just like all current SaaS like figma or shopify, most crypto
              protocols would start being more ai-native. ai should be contextual,
              ambient, and proactive; right in the flow of your trade or crypto
              actions.
            </p>
          </article>

          <article className="border-t border-gray-200 pt-16 sm:pt-20">
            <p className="font-mono text-xs tracking-widest text-gray-400">
              02 / solution
            </p>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              possible solution
            </h2>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-gray-600 sm:text-xl">
              an ambient layer (extension/browser) embedded across crypto protocols
              that understands your intent: suggesting defi strategies (like yield
              looping), launching assets, and executing any on-chain action directly
              in your workflow that makes it feel infinite without sounding messy.
            </p>
          </article>
        </div>
      </section>

      <blockquote className="border-t border-gray-100 bg-gray-50/60 px-6 py-20 sm:py-28">
        <p className="mx-auto max-w-4xl text-center font-display text-2xl font-medium leading-relaxed tracking-tight text-gray-900 sm:text-3xl">
          “we all know that ai agents (and in general, llms) will play a significant
          role over the next years in embedding crypto into existing social
          products and giving rise to novel trading behaviours (for eg.
          voice-based trading)”
        </p>
      </blockquote>
    </main>
  );
}

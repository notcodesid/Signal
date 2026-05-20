# Contributing to Signal

Thanks for your interest in improving Signal! This guide covers how to set up
your environment, report issues, and submit changes. For a project overview and
the architecture, start with the [README](./README.md).

---

## Table of contents

- [Ways to contribute](#ways-to-contribute)
- [Reporting bugs](#reporting-bugs)
- [Requesting features](#requesting-features)
- [Development setup](#development-setup)
- [Project conventions](#project-conventions)
- [Adding a new agent tool](#adding-a-new-agent-tool)
- [Pull request workflow](#pull-request-workflow)
- [Code of conduct](#code-of-conduct)

---

## Ways to contribute

- **Report bugs** and confusing behavior.
- **Fix bugs** or pick up an open issue.
- **Add agent tools** (new on-chain actions or data sources).
- **Improve the UI** (web app or extension).
- **Improve docs** — even fixing a typo helps.

If you're planning a large change, open an issue first so we can align on the
approach before you invest the time.

## Reporting bugs

Open a [new issue](../../issues/new) and include:

1. **What you did** — exact steps to reproduce (the prompt you typed, the button you clicked).
2. **What you expected** vs. **what actually happened**.
3. **Surface** — web app, Chrome extension, or MCP server.
4. **Environment** — OS, browser, Node version, wallet (and network: devnet/mainnet).
5. **Evidence** — console errors, screenshots, or a transaction signature if relevant.

A minimal, reproducible report gets fixed far faster than "it's broken."

> **Security issues:** please do **not** open a public issue for anything that
> could put funds at risk. Report it privately to the maintainer instead.

## Requesting features

Open an issue describing:

- The **use case** ("As a user I want to … so that …"), not just the solution.
- Why it belongs in Signal vs. a separate tool.
- Roughly how you imagine it working (a new tool? a UI change? both?).

## Development setup

Full instructions are in the [README](./README.md#getting-started). The short version:

```bash
# Web app (repo root)
npm install
cp .env.example .env.local   # add GROQ_API_KEY + an RPC URL
npm run dev                  # http://localhost:3000

# Chrome extension (separate package)
cd extension
npm install
npm run build                # load extension/dist via chrome://extensions
```

Before opening a PR, make sure both type-check and lint pass:

```bash
npx tsc --noEmit   # type-check (root)
npm run lint       # eslint
```

The `extension/` package has its own `package.json`; type-check it from inside
that folder if you changed extension code.

## Project conventions

- **TypeScript, strict mode.** No `any` unless genuinely unavoidable; prefer
  precise types and `unknown` + narrowing.
- **Server prepares, client signs.** Tools that change on-chain state must
  return an *unsigned* transaction. Private keys never touch the backend.
- **Comments explain _why_, not _what_.** Document non-obvious decisions
  (race conditions, SDK quirks, ordering requirements) — see the existing
  files for the tone.
- **Components stay small and focused.** The chat UI lives in
  `components/chat/` as one responsibility per file; keep it that way.
- **Logic vs. markup.** Conversation/state logic belongs in hooks
  (e.g. `use-signal-chat.ts`); presentational pieces stay dumb.
- **Keep the web app and extension in sync.** Many cards/components are mirrored
  in `components/` and `extension/src/sidepanel/`. If you change behavior in one,
  update the other.

## Adding a new agent tool

Tools are the agent's capabilities. Each lives in its own file under
`lib/tools/`. To add one:

1. **Create the tool file**, e.g. `lib/tools/get-something.ts`. Export a
   `make*Tools()` factory that returns a tool defined with the AI SDK's `tool()`
   helper. Read tools (`get-*`) return data; write tools (`prepare-*`) return an
   **unsigned** transaction (typically base64) plus a preview object — never sign.

2. **Register it** in `lib/tools/index.ts` by spreading your factory into the
   object returned by `makeTools()`. Thread any per-request context (like the
   wallet address) through its arguments.

3. **Teach the agent about it.** Add a short description of the tool to the
   system prompt in `app/api/chat/route.ts` so the model knows when to use it.

4. **Render its result (write tools only).** Add a branch to
   `components/chat/tool-message-part.tsx` that renders an approval card for your
   tool's output, and create the card component if needed. Mirror it in the
   extension under `extension/src/sidepanel/` if it should work there too.

5. **(Optional) Expose it over MCP** by adding it to `app/api/mcp/route.ts` if
   it's a read tool other agents would find useful.

6. **Test on devnet** end-to-end before opening the PR.

## Pull request workflow

1. **Fork** the repo and create a branch:
   `git checkout -b feat/short-description` (or `fix/…`, `docs/…`).
2. Make focused commits with clear messages (imperative mood:
   "add marinade apy tool", not "added stuff").
3. Ensure `npx tsc --noEmit` and `npm run lint` pass.
4. Push and open a PR against `main` with:
   - A clear description of **what** changed and **why**.
   - Screenshots / a short clip for UI changes.
   - A note on how you tested it (which network, which prompts).
   - A link to the issue it closes, if any (`Closes #123`).
5. Keep PRs small and single-purpose — they review and merge faster.

## Code of conduct

Be respectful and constructive. Assume good intent, give specific feedback, and
keep discussion focused on the work. Harassment or hostility isn't welcome here.

---

Thanks for contributing! 🚀

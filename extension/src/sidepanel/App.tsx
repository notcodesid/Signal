import { useEffect, useState } from "react";

export function App() {
  // Smoke-test value: track the current active tab's URL so we know the
  // chrome.tabs API is reachable from the side panel. Phase 6d will use
  // this to give the agent page context.
  const [tabUrl, setTabUrl] = useState<string>("(no tab)");

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const url = tabs[0]?.url ?? "(no url)";
      setTabUrl(url);
    });
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "16px",
        gap: "12px",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          }}
        />
        <h1 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
          Signal
        </h1>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          fontSize: "13px",
          color: "#9ca3af",
        }}
      >
        <p>
          Phase 6a — extension shell loaded ✅
        </p>
        <div
          style={{
            border: "1px solid #1f2937",
            borderRadius: "8px",
            padding: "10px",
            fontSize: "11px",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            wordBreak: "break-all",
            color: "#d1d5db",
            background: "#111827",
          }}
        >
          <div style={{ color: "#6b7280", marginBottom: "4px" }}>
            current tab
          </div>
          {tabUrl}
        </div>
        <p style={{ fontSize: "12px", color: "#6b7280" }}>
          Phase 6b will replace this panel with the real chat UI talking to{" "}
          <code>/api/chat</code>.
        </p>
      </main>
    </div>
  );
}

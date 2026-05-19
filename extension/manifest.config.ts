import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json" with { type: "json" };

// Manifest V3 — Chrome extension declaration. @crxjs/vite-plugin reads this
// at build time and emits a real manifest.json with the right hashed paths.
export default defineManifest({
  manifest_version: 3,
  name: "Signal — AI Solana DeFi co-pilot",
  short_name: "Signal",
  version: pkg.version,
  description:
    "AI-native yield strategy agent for Solana. Sits on top of every DeFi site.",
  // Side panel UI. The page that opens when the user clicks the action.
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  action: {
    default_title: "Open Signal",
  },
  permissions: [
    "sidePanel",
    "storage",
    "activeTab",
    "scripting",
  ],
  // host_permissions: <all_urls> is required for chrome.scripting.executeScript
  // to inject the Phantom bridge into the active tab from the side panel
  // context. activeTab alone is insufficient — it's granted per-invocation,
  // doesn't survive tab switches inside the side panel, and the side panel's
  // initial mount runs before any user gesture. The trade-off is the install
  // warning ("read and change all your data on all websites"). For a personal
  // V0 self-installed extension, that's acceptable.
  host_permissions: ["<all_urls>"],
  // MAIN-world content script that runs on every web page. It exposes
  // window.__signalBridge so the side panel can talk to Phantom (which only
  // injects on real web pages, not chrome-extension:// origins). Side panel
  // invokes bridge methods via chrome.scripting.executeScript.
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/bridge-main.ts"],
      run_at: "document_idle",
      world: "MAIN",
    },
  ],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  icons: {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
  },
});

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
  ],
  // host_permissions kept narrow for V0 — extended later when the content
  // script needs to read protocol pages (Phase 6d).
  host_permissions: [
    "http://localhost:3000/*",
    "https://*.vercel.app/*",
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

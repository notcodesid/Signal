import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";
import path from "node:path";

// @crxjs handles MV3 quirks: hashing entry paths, HMR for content scripts,
// auto-reloading the extension when the manifest changes.
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Chrome extension dev needs a stable port for HMR websockets.
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});

import react from "@vitejs/plugin-react";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = existsSync(resolve(here, "../../packages")) ? resolve(here, "../..") : resolve(here, "..");
const designSystemSrc = resolve(workspaceRoot, "packages/design-system/src");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@florence/design-system/tokens.css", replacement: resolve(designSystemSrc, "tokens.css") },
      { find: "@florence/design-system", replacement: resolve(designSystemSrc, "index.tsx") },
      { find: /^react\/jsx-runtime$/, replacement: resolve(here, "node_modules/react/jsx-runtime.js") },
      { find: /^react$/, replacement: resolve(here, "node_modules/react/index.js") },
    ],
  },
  server: {
    port: 5175,
    strictPort: false,
  },
});

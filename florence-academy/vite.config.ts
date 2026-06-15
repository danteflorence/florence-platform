import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Florence Academy — standalone Vite app.
// `base` is relative so the built bundle works whether served at the domain
// root or under a sub-path (e.g. academy.florence... /academy/).
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
  },
  build: {
    // @google/model-viewer bundles three.js, so its chunk is inherently large.
    // It is lazy-loaded with the lesson route, so it never blocks initial paint.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Function form (not a record) so the config typechecks under vitest's
        // bundled rolldown types while behaving identically on vite 5.
        manualChunks: (id) => {
          if (id.includes("@google/model-viewer")) return "model-viewer";
          if (id.includes("recharts")) return "recharts";
        },
      },
    },
  },
  test: {
    // server/*.test.mjs and api/** are standalone Node services with their own
    // runners (they spin up servers and call process.exit) — run those with
    // `node …`, not the vitest unit runner.
    exclude: [...configDefaults.exclude, "server/**", "api/**"],
  },
});

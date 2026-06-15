// Vite library-mode build for @florencern/components. Externalizes react/react-dom
// so the package stays tiny and shares the host app's React. Produces ESM + types.
// `npm --prefix sdk/components run build` to emit dist/. Publishing is operator-owned
// (no registry wired this pass — git-tagged tarball or a private registry later).
import { defineConfig } from "vite"

export default defineConfig({
  build: {
    lib: {
      entry: "index.ts",
      name: "FlorenceRNComponents",
      formats: ["es"],
      fileName: () => "florencern-components.js",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
    emptyOutDir: true,
  },
})

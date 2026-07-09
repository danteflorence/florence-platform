import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Pin the Tailwind config to THIS package. Without an explicit path Tailwind
// resolves tailwind.config.js from process.cwd(), which breaks whenever the
// dev server is launched from the monorepo root (or anywhere else).
const here = dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    tailwindcss: { config: join(here, "tailwind.config.js") },
    autoprefixer: {},
  },
};

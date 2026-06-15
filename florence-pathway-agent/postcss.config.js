import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// Point Tailwind at the config by absolute path — the preview harness runs Vite
// from the home directory, so cwd-based config discovery would miss it.
const here = dirname(fileURLToPath(import.meta.url))

export default {
  plugins: [tailwindcss(join(here, 'tailwind.config.js')), autoprefixer()],
}

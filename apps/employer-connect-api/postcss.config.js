import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const here = dirname(fileURLToPath(import.meta.url))

export default {
  plugins: [tailwindcss(join(here, 'tailwind.config.js')), autoprefixer()],
}

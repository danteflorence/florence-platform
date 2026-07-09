import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Absolute content globs so Tailwind resolves files regardless of the process
// cwd (the preview harness launches Vite from the home directory).
const here = dirname(fileURLToPath(import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  content: [join(here, 'index.html'), join(here, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        // ── Florence ink (replaces the old slate-900-ish ink) ──────────────
        ink: '#101828',

        // ── PRIMARY BRAND: `florence` ramp retuned blue → teal ─────────────
        // Anchored on the brand teal #0ABAB5 (florence-600 = primary button,
        // florence-700 = hover/deep). Re-skins every `*-florence-*` class in
        // the app automatically (buttons, links, progress bars, accents).
        florence: {
          50:  '#E6F8F7',
          100: '#C7F0ED',
          200: '#A0E7E3',
          300: '#6BD8D3',
          400: '#2EC4BE',
          500: '#12BDB7',
          600: '#0ABAB5', // brand teal — primary button base
          700: '#008E8A', // deep — hover / link text
          800: '#0A6F6C',
          900: '#0C5755',
        },

        // ── SECONDARY: Florence Capital purple ─────────────────────────────
        // Use ONLY on financing / credit content (see README "Where purple goes").
        purple: {
          50:  '#F1ECFB',
          100: '#E6DBF7',
          200: '#D3BFF0',
          300: '#AD8EDC',
          400: '#9163D1',
          500: '#7340C4', // brand purple
          600: '#5B2DA8', // deep — hover
          700: '#4A2490',
          800: '#3A1C72',
          900: '#2C1556',
        },

        // ── NEUTRALS: override Tailwind `slate` with the Florence ink ramp ──
        // The app leans on slate-* for text/borders/backgrounds everywhere;
        // overriding the scale re-skins all of it to the Florence greys.
        slate: {
          50:  '#F7FAFA', // paper-warm  (page bg, soft fills)
          100: '#F2F4F7', // paper-tint  (row alts, chips)
          200: '#E4E7EC', // rule        (hairline borders, dividers)
          300: '#D0D5DD', // rule-strong (input borders)
          400: '#98A2B3', // ink-3       (tertiary text, placeholders)
          500: '#667085',
          600: '#475467', // ink-2       (secondary text, captions)
          700: '#344054',
          800: '#1D2939',
          900: '#101828', // ink         (body text, headlines)
        },

        // ── SEMANTIC ramps retuned to exact Florence values ────────────────
        emerald: { // success #16A34A
          50: '#E7F6EC', 100: '#CDEDD7', 200: '#BBE6C7', 300: '#86D2A0',
          400: '#4CB873', 500: '#16A34A', 600: '#15803D', 700: '#126C34',
          800: '#0F5429', 900: '#0C401F',
        },
        rose: { // danger #DC2626
          50: '#FBEBEB', 100: '#F8DADA', 200: '#F2C2C2', 300: '#E89A9A',
          400: '#E26565', 500: '#DC2626', 600: '#B91C1C', 700: '#991B1B',
          800: '#7F1D1D', 900: '#641818',
        },
        amber: { // warn #D97706
          50: '#FBF1E3', 100: '#F7E4C5', 200: '#F0D9B5', 300: '#E7BC7A',
          400: '#E09A3E', 500: '#D97706', 600: '#B45309', 700: '#92400E',
          800: '#78350F', 900: '#5C280C',
        },
        // `sky` is used for "info / in-person" banners. Florence's info color
        // IS teal — these tints keep info readable and on-brand (a soft teal).
        // Want in-person visually distinct from the primary brand? Swap these
        // banners to the lavender accent instead (see DESIGN-TOKENS.md).
        sky: {
          50: '#E9F7F7', 100: '#CFEFEE', 200: '#A6E2E0', 300: '#6FCFCB',
          400: '#34BAB5', 500: '#0FA9A6', 600: '#00908F', 700: '#0C7574',
          800: '#0E5C5B', 900: '#104645',
        },
      },
      fontFamily: {
        // Body / UI workhorse
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        // Editorial display serif — apply via `font-display` on page titles,
        // card titles, and big stats. (Licensed GT Sectra; Playfair fallback.)
        display: ['"GT Sectra Display"', '"GT Sectra"', '"Playfair Display"', 'Georgia', 'serif'],
        serif: ['"GT Sectra"', '"GT Sectra Display"', '"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        // Florence keeps shadows sparing; whitespace + hairlines do the work.
        sm: '0 1px 2px rgba(16,24,40,0.04)',
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.03)',
        'card-hover': '0 8px 24px rgba(16,24,40,0.10), 0 2px 4px rgba(16,24,40,0.05)',
      },
      borderRadius: {
        // Slightly tightened from the default for the clinical-crisp feel.
        lg: '14px',
        xl: '18px',
      },
    },
  },
  plugins: [],
}

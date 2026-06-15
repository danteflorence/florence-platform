import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Absolute content globs so Tailwind resolves regardless of process cwd.
const here = dirname(fileURLToPath(import.meta.url))

// Florence brand system (shared with florence-pathway-agent): teal `florence`
// ramp, Florence-ink `slate` neutrals, editorial display serif.
/** @type {import('tailwindcss').Config} */
export default {
  content: [join(here, 'index.html'), join(here, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        ink: '#101828',
        florence: {
          50: '#E6F8F7', 100: '#C7F0ED', 200: '#A0E7E3', 300: '#6BD8D3', 400: '#2EC4BE',
          500: '#12BDB7', 600: '#0ABAB5', 700: '#008E8A', 800: '#0A6F6C', 900: '#0C5755',
        },
        purple: {
          50: '#F1ECFB', 100: '#E6DBF7', 200: '#D3BFF0', 300: '#AD8EDC', 400: '#9163D1',
          500: '#7340C4', 600: '#5B2DA8', 700: '#4A2490', 800: '#3A1C72', 900: '#2C1556',
        },
        slate: {
          50: '#F7FAFA', 100: '#F2F4F7', 200: '#E4E7EC', 300: '#D0D5DD', 400: '#98A2B3',
          500: '#667085', 600: '#475467', 700: '#344054', 800: '#1D2939', 900: '#101828',
        },
        emerald: { 50: '#E7F6EC', 100: '#CDEDD7', 200: '#BBE6C7', 300: '#86D2A0', 400: '#4CB873', 500: '#16A34A', 600: '#15803D', 700: '#126C34', 800: '#0F5429', 900: '#0C401F' },
        rose: { 50: '#FBEBEB', 100: '#F8DADA', 200: '#F2C2C2', 300: '#E89A9A', 400: '#E26565', 500: '#DC2626', 600: '#B91C1C', 700: '#991B1B', 800: '#7F1D1D', 900: '#641818' },
        amber: { 50: '#FBF1E3', 100: '#F7E4C5', 200: '#F0D9B5', 300: '#E7BC7A', 400: '#E09A3E', 500: '#D97706', 600: '#B45309', 700: '#92400E', 800: '#78350F', 900: '#5C280C' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(16,24,40,0.04)',
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.03)',
        'card-hover': '0 8px 24px rgba(16,24,40,0.10), 0 2px 4px rgba(16,24,40,0.05)',
      },
      borderRadius: { lg: '14px', xl: '18px' },
    },
  },
  plugins: [],
}

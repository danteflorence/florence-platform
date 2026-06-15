// src/lib/ui.tsx — Florence-language restyle of the shared primitives.
// DROP-IN REPLACEMENT: every export name & signature is preserved, so the
// surfaces that import these need no changes. Restyling here (plus the retuned
// tokens in tailwind.config.js) re-skins the whole app — including all the
// candidate modals (DS-160 sign, visa/NCLEX/licensure/endorsement flows),
// which are built entirely from Card / CardHeader / Button / Badge / Input.
//
// What changed vs. the original:
//   • CardHeader title  → editorial display serif (font-display)
//   • Button.primary    → brand teal (florence-600 → 700 hover); new `purple` variant
//   • Stat value        → display serif, brand-colored numerals
//   • Progress          → teal fill; new `purple` for Florence Capital content
//   • radii/shadows     → tightened to the clinical-crisp card spec
import type { ReactNode } from 'react'
import { TONE_CLASSES, type Tone } from '@shared/constants'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', TONE_CLASSES[tone], className)}>
      {children}
    </span>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-lg border border-slate-200 bg-white shadow-card', className)}>{children}</div>
}

export function CardHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
      <div>
        {/* Editorial display serif — the Florence headline signature */}
        <h3 className="font-display text-[16.5px] font-bold leading-tight tracking-[-0.01em] text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Progress({ value, tone = 'progress', purple = false }: { value: number; tone?: Tone; purple?: boolean }) {
  const barTone = purple
    ? 'bg-purple-600'
    : tone === 'progress' ? 'bg-florence-600'
    : tone === 'success' ? 'bg-emerald-500'
    : tone === 'danger' ? 'bg-rose-500'
    : 'bg-slate-400'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cx('h-full rounded-full transition-all', barTone)} style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}

export function Stat({ label, value, tone = 'neutral', hint, purple = false }: { label: string; value: ReactNode; tone?: Tone; hint?: string; purple?: boolean }) {
  // Florence stats: display serif numerals, brand-colored (never ink for the figure).
  // `purple` marks Florence Capital / financing figures (the only place purple goes).
  const color = purple ? 'text-purple-600' : tone === 'danger' ? 'text-rose-600' : tone === 'warn' ? 'text-amber-600' : tone === 'success' ? 'text-emerald-600' : tone === 'progress' ? 'text-florence-700' : 'text-ink'
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">{label}</div>
      <div className={cx('mt-1.5 font-display text-3xl font-extrabold leading-none tracking-[-0.02em] tabular-nums', color)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <svg className="h-4 w-4 animate-spin text-florence-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {label ?? 'Loading…'}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">{children}</div>
}

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, type = 'button' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger' | 'outline' | 'purple'; size?: 'sm' | 'md'; disabled?: boolean; type?: 'button' | 'submit'
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-florence-600'
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-2 text-sm' }
  const variants = {
    primary: 'bg-florence-600 text-white hover:bg-florence-700 shadow-sm',
    purple: 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm', // Florence Capital actions
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    outline: 'border border-slate-300 bg-white text-ink hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cx(base, sizes[size], variants[variant])}>
      {children}
    </button>
  )
}

// --- tiny inline icon set (unchanged — already 2px round-cap Lucide-style) ---
type IconProps = { className?: string }
const I = (path: ReactNode) => ({ className = 'h-4 w-4' }: IconProps) =>
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>

export const Icon = {
  check: I(<polyline points="20 6 9 17 4 12" />),
  alert: I(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>),
  clock: I(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
  doc: I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>),
  shield: I(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />),
  user: I(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  chart: I(<><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></>),
  arrow: I(<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>),
  send: I(<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>),
  sparkle: I(<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />),
  pin: I(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></>),
  lock: I(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>),
}

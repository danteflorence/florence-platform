import type { ReactNode, ButtonHTMLAttributes } from 'react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export type Tone = 'brand' | 'success' | 'warn' | 'danger' | 'info' | 'neutral'

const TONE: Record<Tone, string> = {
  brand: 'bg-florence-50 text-florence-700 ring-florence-600/20',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warn: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  info: 'bg-florence-50 text-florence-700 ring-florence-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/15',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', TONE[tone])}>{children}</span>
}

export function bandTone(band: string): Tone {
  return band === 'green' ? 'success' : band === 'yellow' ? 'warn' : band === 'orange' ? 'warn' : band === 'red' ? 'danger' : 'neutral'
}
export function categoryTone(cat: string): Tone {
  return cat === 'ready_to_submit' ? 'success' : cat === 'ready_after_milestone' ? 'brand' : cat === 'hold_for_credential_repair' ? 'danger' : 'warn'
}
export const titleize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('rounded-xl border border-slate-200 bg-white shadow-card', className)}>{children}</section>
}

export function CardHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
      <div>
        <h3 className="font-display text-lg font-bold tracking-tight text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Button({ variant = 'primary', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'soft' | 'danger' }) {
  const styles = {
    primary: 'bg-florence-600 text-white hover:bg-florence-700 disabled:bg-slate-300',
    ghost: 'text-slate-600 hover:bg-slate-100',
    soft: 'bg-florence-50 text-florence-700 hover:bg-florence-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-300',
  }[variant]
  return <button {...rest} className={cx('inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed', styles, className)} />
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <svg className="h-4 w-4 animate-spin text-florence-600" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
      {label}
    </div>
  )
}

export function StatCard({ label, value, sub, tone = 'neutral' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <Card className="px-5 py-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cx('mt-1 font-display text-3xl font-bold', tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-rose-600' : 'text-ink')}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </Card>
  )
}

/** Horizontal labelled bar for distributions. */
export function Bar({ label, value, max, tone = 'brand' }: { label: string; value: number; max: number; tone?: Tone }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const fill = tone === 'success' ? 'bg-emerald-500' : tone === 'danger' ? 'bg-rose-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-florence-500'
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 shrink-0 truncate text-sm text-slate-600">{label}</div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={cx('h-full rounded-full', fill)} style={{ width: `${pct}%` }} /></div>
      <div className="w-10 shrink-0 text-right font-mono text-xs text-slate-500">{value}</div>
    </div>
  )
}

type IconProps = { className?: string }
const mk = (path: ReactNode) => ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
)
export const Icon = {
  chart: mk(<><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></>),
  briefcase: mk(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></>),
  users: mk(<><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0112 0" /><path d="M16 6a3 3 0 010 6" /><path d="M18 14a6 6 0 013 5" /></>),
  inbox: mk(<><path d="M3 12h5l2 3h4l2-3h5" /><path d="M5 5h14l2 7v7H3v-7z" /></>),
  shield: mk(<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />),
  check: mk(<path d="M5 13l4 4L19 7" />),
  clock: mk(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  alert: mk(<><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>),
  lock: mk(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>),
  sparkle: mk(<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />),
  arrow: mk(<path d="M5 12h14M13 6l6 6-6 6" />),
  link: mk(<><path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" /><path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" /></>),
}

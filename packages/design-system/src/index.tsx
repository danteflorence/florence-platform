import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

export const florenceTokens = {
  tiffany: "#0ABAB5",
  tiffanyDark: "#067F7B",
  purple: "#7340C4",
  purpleDark: "#4A2490",
  ink: "#101828",
  slate: "#475467",
  ivory: "#FFFDF7",
  mist: "#F7FAFA",
  lavender: "#F1ECFB",
  line: "#E4E7EC",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
} as const;

export type FlorenceTone =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cx("fds-button", `fds-button--${variant}`, `fds-button--${size}`, className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button {...props} className={buttonClassName({ variant, size, className })} />;
}

export function Badge({
  tone = "primary",
  className,
  children,
}: HTMLAttributes<HTMLSpanElement> & { tone?: FlorenceTone }) {
  return <span className={cx("fds-badge", `fds-tone-${tone}`, className)}>{children}</span>;
}

export function StatusPill({
  tone = "neutral",
  className,
  children,
}: HTMLAttributes<HTMLSpanElement> & { tone?: FlorenceTone }) {
  return <span className={cx("fds-status-pill", `fds-tone-${tone}`, className)}>{children}</span>;
}

export function Card({
  title,
  subtitle,
  action,
  surface = "white",
  interactive = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  surface?: "white" | "mist" | "ivory";
  interactive?: boolean;
}) {
  return (
    <div
      {...props}
      className={cx(
        "fds-card",
        surface !== "white" && `fds-card--${surface}`,
        interactive && "fds-card--interactive",
        className,
      )}
    >
      {(title || subtitle || action) && (
        <div className="fds-card__header">
          <div>
            {title && <h3 className="fds-card__title">{title}</h3>}
            {subtitle && <p className="fds-card__subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: FlorenceTone;
  className?: string;
}) {
  return (
    <div className={cx("fds-metric-card", className)}>
      <div className="fds-metric-card__label">{label}</div>
      <div className={cx("fds-metric-card__value", `fds-metric-card__value--${tone}`)}>{value}</div>
      {hint && <div className="fds-metric-card__hint">{hint}</div>}
    </div>
  );
}

export function AppShell({
  sidebar,
  topNav,
  footer,
  className,
  children,
}: {
  sidebar?: ReactNode;
  topNav?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("fds-app-shell", sidebar ? "fds-app-shell--with-sidebar" : false, className)}>
      {sidebar}
      <div className="fds-app-shell__main">
        {topNav}
        <div className="fds-app-shell__content">{children}</div>
        {footer}
      </div>
    </div>
  );
}

export interface SidebarItem {
  label: ReactNode;
  href?: string;
  active?: boolean;
  icon?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
}

export function Sidebar({
  title = "Florence Education",
  subtitle,
  items,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  items?: SidebarItem[];
  className?: string;
}) {
  return (
    <aside className={cx("fds-sidebar", className)}>
      <div className="fds-sidebar__brand">
        <span className="fds-sidebar__mark">F</span>
        <div>
          <div className="fds-sidebar__title">{title}</div>
          {subtitle && <div className="fds-sidebar__subtitle">{subtitle}</div>}
        </div>
      </div>
      {items && (
        <nav className="fds-sidebar__nav" aria-label="Primary">
          {items.map((item, index) =>
            item.href ? (
              <a
                key={`${item.href}:${index}`}
                href={item.href}
                className={cx("fds-sidebar__item", item.active && "fds-sidebar__item--active")}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge}
              </a>
            ) : (
              <button
                key={`${String(item.label)}:${index}`}
                type="button"
                onClick={item.onClick}
                className={cx("fds-sidebar__item", item.active && "fds-sidebar__item--active")}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge}
              </button>
            ),
          )}
        </nav>
      )}
    </aside>
  );
}

export function TopNav({
  title = "Florence Education",
  subtitle,
  actions,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("fds-top-nav", className)}>
      <div className="fds-top-nav__brand">
        <span className="fds-top-nav__mark">F</span>
        <div>
          <div className="fds-top-nav__title">{title}</div>
          {subtitle && <div className="fds-top-nav__subtitle">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="fds-top-nav__actions">{actions}</div>}
    </header>
  );
}

export type StepState = "complete" | "active" | "pending" | "blocked";

export function StageStepper({
  steps,
  className,
}: {
  steps: { label: ReactNode; description?: ReactNode; state?: StepState }[];
  className?: string;
}) {
  return (
    <ol className={cx("fds-stage-stepper", className)}>
      {steps.map((step, index) => (
        <li
          key={`${String(step.label)}:${index}`}
          className={cx("fds-stage-stepper__item", `fds-stage-stepper__item--${step.state ?? "pending"}`)}
        >
          <span className="fds-stage-stepper__marker">{step.state === "complete" ? "✓" : index + 1}</span>
          <span>
            <span className="fds-stage-stepper__label">{step.label}</span>
            {step.description && <span className="fds-stage-stepper__description">{step.description}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Timeline({
  items,
  className,
}: {
  items: { title: ReactNode; body?: ReactNode; meta?: ReactNode }[];
  className?: string;
}) {
  return (
    <ol className={cx("fds-timeline", className)}>
      {items.map((item, index) => (
        <li key={`${String(item.title)}:${index}`} className="fds-timeline__item">
          <div className="fds-timeline__title">{item.title}</div>
          {item.meta && <div className="fds-timeline__meta">{item.meta}</div>}
          {item.body && <div className="fds-timeline__body">{item.body}</div>}
        </li>
      ))}
    </ol>
  );
}

export interface DataTableColumn<Row> {
  id: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

export function DataTable<Row>({
  rows,
  columns,
  getRowKey,
  empty = "No records yet.",
  className,
}: {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  getRowKey?: (row: Row, index: number) => string | number;
  empty?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0) {
    return <div className={cx("fds-data-table__empty", className)}>{empty}</div>;
  }

  return (
    <div className={cx("fds-data-table", className)}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                style={column.width ? ({ width: column.width } as CSSProperties) : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={getRowKey ? getRowKey(row, rowIndex) : rowIndex}>
              {columns.map((column) => (
                <td key={column.id} style={{ textAlign: column.align ?? "left" }}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProfileCard({
  name,
  title,
  meta,
  avatarSrc,
  actions,
  className,
}: {
  name: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  avatarSrc?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const initials = String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className={cx("fds-profile-card", className)}>
      <div className="fds-profile-card__avatar">
        {avatarSrc ? <img src={avatarSrc} alt="" /> : initials || "F"}
      </div>
      <div>
        <div className="fds-profile-card__name">{name}</div>
        {title && <div className="fds-profile-card__title">{title}</div>}
        {meta && <div className="fds-profile-card__meta">{meta}</div>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export function DocumentCard({
  title,
  description,
  status,
  meta,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cx("fds-document-card", className)}>
      <div>
        <div className="fds-document-card__title">{title}</div>
        {description && <div className="fds-document-card__description">{description}</div>}
      </div>
      {(status || meta || action) && (
        <div className="fds-document-card__meta">
          {status}
          {meta && <span> {meta}</span>}
          {action}
        </div>
      )}
    </article>
  );
}

export function AlertBanner({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("fds-alert", `fds-alert--${tone}`, className)} role={tone === "danger" ? "alert" : "status"}>
      <span className="fds-alert__icon" aria-hidden />
      <div>
        <div className="fds-alert__title">{title}</div>
        {children && <div className="fds-alert__body">{children}</div>}
        {action}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("fds-empty-state", className)}>
      <div className="fds-empty-state__title">{title}</div>
      {children && <div className="fds-empty-state__body">{children}</div>}
      {action}
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fds-modal" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
      <div className="fds-modal__panel">
        <div className="fds-modal__header">
          <h2 className="fds-modal__title">{title}</h2>
          {onClose && (
            <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
              Close
            </Button>
          )}
        </div>
        <div className="fds-modal__body">{children}</div>
        {footer && <div className="fds-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

export function FormField({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("fds-field", className)} htmlFor={htmlFor}>
      <span>
        <span className="fds-field__label">{label}</span>
        {hint && <span className="fds-field__hint"> {hint}</span>}
      </span>
      {children}
      {error && <span className="fds-field__error">{error}</span>}
    </label>
  );
}

export function FileUpload({
  title = "Upload file",
  description,
  className,
  ...inputProps
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("fds-file-upload", className)}>
      <span className="fds-file-upload__title">{title}</span>
      {description && <span className="fds-file-upload__description">{description}</span>}
      <input {...inputProps} type="file" />
    </label>
  );
}

export function PartnerLogoBar({
  partners,
  className,
}: {
  partners: { name: string; logoSrc?: string; href?: string }[];
  className?: string;
}) {
  return (
    <div className={cx("fds-partner-logo-bar", className)}>
      {partners.map((partner) => {
        const content = (
          <>
            {partner.logoSrc && <img src={partner.logoSrc} alt="" />}
            <span>{partner.name}</span>
          </>
        );
        return partner.href ? (
          <a key={partner.name} className="fds-partner-logo-bar__item" href={partner.href}>
            {content}
          </a>
        ) : (
          <span key={partner.name} className="fds-partner-logo-bar__item">
            {content}
          </span>
        );
      })}
    </div>
  );
}

export function LegalDisclaimer({
  children,
  compact = false,
  className,
}: HTMLAttributes<HTMLDivElement> & { compact?: boolean }) {
  return (
    <div className={cx("fds-legal-disclaimer", compact && "fds-legal-disclaimer--compact", className)}>
      {children}
    </div>
  );
}

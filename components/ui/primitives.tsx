import Link from 'next/link';
import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';
import type { Tone } from '@/lib/types';
import { LoaderCircle } from './icons';

export const cx = clsx;

/* ---------- Buttons ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

const btnBase =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55';
const btnVariant: Record<Variant, string> = {
  primary: 'bg-iris text-white hover:bg-iris-700',
  secondary: 'border border-line bg-surface text-ink hover:border-ink/25 hover:bg-paper',
  ghost: 'text-ink-2 hover:bg-ink/5',
  quiet: 'text-iris hover:bg-iris-50',
  danger: 'border border-rose/25 bg-surface text-rose hover:bg-rose-50',
};
const btnSize: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cx(btnBase, btnVariant[variant], btnSize[size], className);
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ---------- Form controls ---------- */
const control =
  'w-full rounded-control border border-line bg-surface px-3 text-sm text-ink placeholder:text-faint transition-colors hover:border-ink/25 focus:border-iris focus:outline-none focus:ring-3 focus:ring-iris/15 disabled:bg-paper disabled:text-muted';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cx(control, 'h-10', className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }: ComponentProps<'textarea'>) {
  return <textarea rows={rows} className={cx(control, 'py-2.5 leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select className={cx(control, 'h-10 appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23646a7e' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink-2">
          {label}
          {required && <span className="ml-0.5 text-rose" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-rose">{error}</p> : hint ? <p className="text-xs leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<'input'> & { label: ReactNode }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-2.5 text-sm text-ink-2', className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-line accent-iris" {...props} />
      <span>{label}</span>
    </label>
  );
}

/* ---------- Badges ---------- */
const toneClass: Record<Tone, string> = {
  neutral: 'bg-ink/[0.06] text-ink-2',
  iris: 'bg-iris-50 text-iris-700',
  moss: 'bg-moss-50 text-moss',
  amber: 'bg-amber-50 text-amber',
  rose: 'bg-rose-50 text-rose',
  sky: 'bg-sky-50 text-sky',
};
const dotClass: Record<Tone, string> = {
  neutral: 'bg-faint',
  iris: 'bg-iris',
  moss: 'bg-moss',
  amber: 'bg-amber',
  rose: 'bg-rose',
  sky: 'bg-sky',
};

export function Badge({ tone = 'neutral', children, className, dot = true }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', toneClass[tone], className)}>
      {dot && <span className={cx('size-1.5 rounded-full', dotClass[tone])} aria-hidden />}
      {children}
    </span>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center rounded-md border border-line px-2 py-0.5 text-xs text-ink-2', className)}>{children}</span>;
}

/* ---------- Layout ---------- */
export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && <div className="mb-3">{back}</div>}
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em] text-ink md:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ children, className, padded = true, as: As = 'section' }: { children: ReactNode; className?: string; padded?: boolean; as?: 'section' | 'div' | 'article' }) {
  return <As className={cx('rounded-panel border border-line bg-surface', padded && 'p-5 md:p-6', className)}>{children}</As>;
}

export function PanelTitle({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-4 flex items-start justify-between gap-4', className)}>
      <div>
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, href, tone }: { label: string; value: ReactNode; sub?: ReactNode; href?: string; tone?: 'attention' }) {
  const body = (
    <>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className={cx('mt-2 text-[28px] leading-none font-bold tracking-[-0.02em] tabular', tone === 'attention' ? 'text-iris' : 'text-ink')}>{value}</p>
      {sub && <p className="mt-2 text-xs text-muted">{sub}</p>}
    </>
  );
  const cls = 'block rounded-panel border border-line bg-surface p-5';
  return href ? (
    <Link href={href} className={cx(cls, 'transition-colors hover:border-ink/25')}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Empty({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-11 place-items-center rounded-full bg-paper text-muted">{icon}</div>}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function KeyValue({ items, cols = 2 }: { items: { label: string; value: ReactNode }[]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cx('grid gap-x-6 gap-y-4', cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3')}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs font-medium text-muted">{it.label}</dt>
          <dd className="mt-1 text-sm break-words text-ink">{it.value || <span className="text-faint">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TabLinks({ tabs, active }: { tabs: { href: string; label: string; count?: number }[]; active: string }) {
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line scrollbar-thin" aria-label="Tabs">
      {tabs.map((t) => {
        const on = t.href === active;
        return (
          <Link key={t.href} href={t.href} aria-current={on ? 'page' : undefined}
            className={cx('-mb-px flex items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-semibold whitespace-nowrap transition-colors',
              on ? 'border-iris text-ink' : 'border-transparent text-muted hover:text-ink')}>
            {t.label}
            {typeof t.count === 'number' && t.count > 0 && (
              <span className={cx('rounded-full px-1.5 text-xs tabular', on ? 'bg-iris text-white' : 'bg-ink/[0.07] text-ink-2')}>{t.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-full bg-iris-50 font-bold text-iris-700',
      size === 'sm' ? 'size-7 text-[11px]' : size === 'lg' ? 'size-12 text-base' : 'size-9 text-xs')} aria-hidden>
      {initials}
    </span>
  );
}

export function ExternalA({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  if (!href) return <span className="text-faint">—</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cx('font-medium text-iris underline-offset-2 hover:underline break-all', className)}>
      {children}
    </a>
  );
}

export function Notice({ tone = 'sky', title, children, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  const border: Record<Tone, string> = { neutral: 'border-line', iris: 'border-iris/20', moss: 'border-moss/20', amber: 'border-amber/25', rose: 'border-rose/20', sky: 'border-sky/20' };
  return (
    <div className={cx('rounded-control border px-4 py-3 text-sm leading-relaxed', toneClass[tone], border[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cx(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
    </div>
  );
}

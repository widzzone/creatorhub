import { cx } from '../ui/primitives';

/**
 * Logo CreatorHub: huruf C yang tersusun dari tiga segmen rail SOP mengelilingi
 * satu titik pusat (hub). Segmen terakhir lebih pudar, seperti tahap yang sedang
 * berjalan di stage rail.
 */
export const MARK_SEGMENTS = [
  'M22.47 9.81A8.6 8.6 0 0 0 13 8.14',
  'M9.37 11.19A8.6 8.6 0 0 0 9.37 20.81',
  'M13 23.86A8.6 8.6 0 0 0 22.47 22.19',
];

export function LogoMark({ className, inverted, animated }: { className?: string; inverted?: boolean; animated?: boolean }) {
  const fg = inverted ? '#4c3fd6' : '#ffffff';
  return (
    <svg viewBox="0 0 32 32" className={cx('size-8 shrink-0', animated && 'mark-anim', className)} aria-hidden>
      <rect width="32" height="32" rx="8.5" fill={inverted ? '#ffffff' : '#4c3fd6'} />
      {MARK_SEGMENTS.map((d, i) => (
        <path key={d} d={d} pathLength={1} className="mark-seg" fill="none" stroke={fg}
          strokeOpacity={i === 2 ? 0.5 : 1} strokeWidth={3.5} strokeLinecap="round" />
      ))}
      <circle cx="16.5" cy="16" r="2.6" fill={fg} className="mark-hub" />
    </svg>
  );
}

export function BrandMark({ className, inverted, animated }: { className?: string; inverted?: boolean; animated?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark inverted={inverted} animated={animated} />
      <span className={cx('text-[17px] font-bold tracking-[-0.025em]', inverted ? 'text-white' : 'text-ink')}>CreatorHub</span>
    </span>
  );
}

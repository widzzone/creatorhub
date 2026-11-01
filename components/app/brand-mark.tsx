import { cx } from '../ui/primitives';

/** Logo mark: three track segments, echoing the stage rail. */
export function BrandMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill={inverted ? '#fff' : '#4c3fd6'} />
        <path d="M8 20.5h4.2M13.9 20.5h4.2M19.8 20.5H24" stroke={inverted ? '#4c3fd6' : '#fff'} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M8 13.5h10" stroke={inverted ? '#4c3fd6' : '#fff'} strokeOpacity=".55" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className={cx('text-[17px] font-extrabold tracking-[-0.02em]', inverted ? 'text-white' : 'text-ink')}>CreatorHub</span>
    </span>
  );
}

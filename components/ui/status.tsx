import { APP_STATUS, CAMPAIGN_STATUS, PAYMENT_STATUS, RECOMMENDATION, REVIEW_STATUS, SOP_STEPS } from '@/lib/constants';
import type { Reason } from '@/lib/types';
import { Badge, cx } from './primitives';
import { Check, X } from './icons';

export function AppStatus({ status, audience = 'team' }: { status: string; audience?: 'team' | 'talent' }) {
  const m = APP_STATUS[status];
  if (!m) return <Badge>{status}</Badge>;
  return <Badge tone={m.tone}>{audience === 'talent' ? m.talent : m.label}</Badge>;
}

export function CampaignStatus({ status }: { status: string }) {
  const m = CAMPAIGN_STATUS[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function RecruitmentBadge({ ok, status }: { ok: boolean; status?: string }) {
  if (ok) return <Badge tone="moss">Pendaftaran dibuka</Badge>;
  if (status === 'SCHEDULED') return <Badge tone="sky">Dijadwalkan</Badge>;
  return <Badge tone="neutral">Pendaftaran ditutup</Badge>;
}

export function PaymentStatus({ status }: { status: string }) {
  const m = PAYMENT_STATUS[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function ReviewStatus({ status }: { status: string }) {
  const m = REVIEW_STATUS[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/** Recommendation label — never shows the internal numeric score. */
export function Recommendation({ value }: { value: string }) {
  const m = RECOMMENDATION[value] ?? RECOMMENDATION.LOW_MATCH;
  return (
    <span title={m.hint}>
      <Badge tone={m.tone}>{m.label}</Badge>
    </span>
  );
}

export function ReasonList({ reasons, limit, compact }: { reasons: Reason[]; limit?: number; compact?: boolean }) {
  const list = (reasons ?? []).slice(0, limit ?? 99);
  if (!list.length) return <p className="text-xs text-faint">Belum ada data pencocokan.</p>;
  return (
    <ul className={cx('flex flex-wrap', compact ? 'gap-1' : 'gap-1.5')}>
      {list.map((r, i) => (
        <li key={i}
          className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs',
            r.ok ? 'bg-moss-50 text-moss' : 'bg-ink/[0.05] text-muted')}>
          {r.ok ? <Check className="size-3" aria-hidden /> : <X className="size-3" aria-hidden />}
          <span>{r.screening ? `Screening: ${r.label}` : r.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Stage rail — the signature element. A thin track of SOP stages; the filled
 * part shows how far a campaign or creator has moved through the workflow.
 */
export function StageRail({
  current,
  done,
  from = 1,
  to = 11,
  ended,
  showLabel = true,
  size = 'md',
}: {
  /** 1-based stage currently in progress */
  current?: number;
  /** explicit completion per stage (overrides current) */
  done?: boolean[];
  from?: number;
  to?: number;
  ended?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}) {
  const steps = SOP_STEPS.slice(from - 1, to);
  const states = steps.map((_, i) => {
    const n = from + i;
    if (done) return done[n - 1] ? 'done' : n === (done.findIndex((d) => !d) + 1) ? 'now' : 'todo';
    if (!current) return 'todo';
    return n < current ? 'done' : n === current ? 'now' : 'todo';
  });
  const activeIdx = states.findIndex((s) => s === 'now');
  const label = activeIdx >= 0 ? steps[activeIdx] : states.every((s) => s === 'done') ? 'Semua tahap selesai' : steps[0];
  const doneCount = states.filter((s) => s === 'done').length;
  return (
    <div className="min-w-0" role="img" aria-label={`Tahap ${doneCount} dari ${steps.length} selesai. Saat ini: ${label}`}>
      <div className={cx('flex gap-[3px]', size === 'sm' ? 'h-1' : 'h-1.5')}>
        {states.map((s, i) => (
          <span key={i} title={steps[i]}
            className={cx('flex-1 rounded-full',
              s === 'done' && (ended ? 'bg-faint' : 'bg-iris'),
              s === 'now' && (ended ? 'bg-rose/60' : 'bg-iris/35 ring-1 ring-iris/50 ring-inset'),
              s === 'todo' && 'bg-line')} />
        ))}
      </div>
      {showLabel && (
        <p className="mt-1.5 flex justify-between gap-2 text-xs text-muted">
          <span className="truncate font-medium text-ink-2">{ended ? 'Tidak dilanjutkan' : label}</span>
          <span className="shrink-0 tabular">{doneCount}/{steps.length}</span>
        </p>
      )}
    </div>
  );
}

export function ApplicationRail({ status, size }: { status: string; size?: 'sm' | 'md' }) {
  const m = APP_STATUS[status];
  const step = m?.step ?? 3;
  // Approved/verified states complete their own step.
  const completesStep = ['BRAND_APPROVED', 'CREATOR_CONFIRMED', 'READY_TO_PUBLISH', 'CONTENT_APPROVED', 'PUBLICATION_VERIFIED', 'INSIGHT_VERIFIED', 'PAID'].includes(status);
  return <StageRail from={3} to={11} current={status === 'COMPLETED' ? 12 : completesStep ? step + 1 : step} ended={m?.ended} size={size} />;
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser, rpc } from '@/lib/auth';
import { period } from '@/lib/format';
import type { SopRow } from '@/lib/types';
import { Empty, PageHeader, Panel, cx } from '@/components/ui/primitives';
import { CampaignStatus } from '@/components/ui/status';
import { Check, Workflow } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'SOP Workflow' };

export default async function WorkflowPage() {
  await requireUser(['ADMIN', 'BRAND']);
  const rows = await rpc<SopRow[]>('campaign_sop');
  const active = rows.filter((r) => r.campaign.status !== 'CLOSED');
  const closed = rows.filter((r) => r.campaign.status === 'CLOSED');

  return (
    <>
      <PageHeader title="SOP Workflow" description="Sebelas tahap operasional per campaign. Tahap selesai otomatis saat tindakan terkait tercatat di sistem." />
      {rows.length === 0 ? (
        <Panel><Empty icon={<Workflow className="size-5" />} title="Belum ada campaign" /></Panel>
      ) : (
        <div className="space-y-4">
          {[...active, ...closed].map((r) => {
            const current = r.steps.findIndex((s) => !s.done);
            return (
              <Panel key={r.campaign.id} padded={false}>
                <Link href={`/campaigns/${r.campaign.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 pt-5 hover:underline">
                  <h2 className="text-[15px] font-bold">{r.campaign.title}</h2>
                  <CampaignStatus status={r.campaign.status} />
                  <span className="text-[13px] text-muted">{r.campaign.brand_name} — {period(r.campaign.start_date, r.campaign.end_date)}</span>
                </Link>
                <ol className="mt-4 grid grid-cols-1 border-t border-line-2 sm:grid-cols-2 lg:grid-cols-11">
                  {r.steps.map((s, i) => (
                    <li key={s.key} title={s.detail}
                      className={cx('flex gap-3 border-b border-line-2 px-4 py-3 lg:flex-col lg:gap-2 lg:border-r lg:border-b-0 lg:px-3 lg:py-4 lg:last:border-r-0',
                        i === current && 'bg-iris-50/70')}>
                      <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular',
                        s.done ? 'bg-iris text-white' : i === current ? 'bg-surface text-iris ring-1 ring-iris' : 'bg-line-2 text-faint')}>
                        {s.done ? <Check className="size-3.5" /> : i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className={cx('text-[13px] leading-tight font-semibold', s.done || i === current ? 'text-ink' : 'text-muted')}>{s.title}</p>
                        <p className="mt-0.5 text-xs leading-snug text-muted">{s.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser, rpc } from '@/lib/auth';
import { compactNumber, date, number, percent, period, platformLabel, rupiah } from '@/lib/format';
import { ExternalA, PageHeader, Panel, PanelTitle, cx } from '@/components/ui/primitives';
import { AppStatus, CampaignStatus, PaymentStatus } from '@/components/ui/status';
import { ArrowLeft, Check, X } from '@/components/ui/icons';
import { ReportActions } from '@/components/reports/report-actions';

export const metadata: Metadata = { title: 'Campaign report' };

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser(['ADMIN', 'BRAND']);
  const r = await rpc<any>('campaign_report', { p_campaign: id });
  const c = r.campaign;
  const s = r.summary;
  const m = r.metrics;
  const f = r.finance;
  const checklist: [string, boolean][] = [
    ['Ada creator final', r.closing_checklist.has_final_creators],
    ['Semua publikasi terverifikasi', r.closing_checklist.publications_verified],
    ['Semua insight terverifikasi', r.closing_checklist.insights_verified],
    ['Semua creator sudah dibayar', r.closing_checklist.all_paid],
    ['Final report tersimpan', r.closing_checklist.report_saved],
  ];
  const funnel: [string, number][] = [
    ['Mendaftar', r.funnel.applied], ['Lolos screening', r.funnel.shortlisted], ['Menerima offer', r.funnel.offer_accepted],
    ['Disetujui Brand', r.funnel.brand_approved], ['Tayang terverifikasi', r.funnel.published], ['Insight terverifikasi', r.funnel.insight_verified], ['Dibayar', r.funnel.paid],
  ];
  const maxF = Math.max(1, ...funnel.map(([, n]) => n));

  return (
    <>
      <div className="no-print">
        <PageHeader back={<Link href="/reports" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" />Reports</Link>}
          title={c.title} description={<span className="flex flex-wrap items-center gap-2">{c.brand_name} — {period(c.start_date, c.end_date)} <CampaignStatus status={c.status} /></span>}
          actions={<ReportActions report={r} role={me.role as 'ADMIN' | 'BRAND'} />} />
      </div>

      {/* Print header */}
      <div className="mb-8 hidden print:block">
        <p className="text-sm text-muted">Campaign report — CreatorHub</p>
        <h1 className="mt-1 text-3xl font-bold">{c.title}</h1>
        <p className="mt-1 text-sm">{c.brand_name} — {period(c.start_date, c.end_date)} — dicetak {date(new Date().toISOString())}</p>
      </div>

      {r.saved_report?.summary && (
        <Panel className="mb-6 print-plain">
          <PanelTitle title="Ringkasan eksekutif" />
          <p className="max-w-[75ch] text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{r.saved_report.summary}</p>
          {r.saved_report.report_url && <p className="mt-3 text-sm">Final report: <ExternalA href={r.saved_report.report_url}>{r.saved_report.report_url}</ExternalA></p>}
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Creator final', `${s.final_creators} / ${s.creator_target}`, `${s.applicants} pendaftar`],
          ['Konten tayang', number(s.publications_verified), `${s.publications} link dikirim`],
          ['Views', compactNumber(m.views), `Reach ${compactNumber(m.reach)}`],
          ['Engagement rate', percent(m.aggregate_er), `${compactNumber(m.engagements)} interaksi`],
        ].map(([l, v, sub]) => (
          <div key={l} className="rounded-panel border border-line bg-surface p-5">
            <p className="text-[13px] text-muted">{l}</p><p className="mt-2 text-[26px] leading-none font-bold tabular">{v}</p><p className="mt-2 text-xs text-muted">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <Panel className="print-plain">
          <PanelTitle title="Funnel creator" />
          <ul className="space-y-2.5">
            {funnel.map(([l, n]) => (
              <li key={l} className="grid grid-cols-[150px_1fr_40px] items-center gap-3 text-sm">
                <span className="text-ink-2">{l}</span>
                <span className="h-2 rounded-full bg-line-2"><span className="block h-full rounded-full bg-iris" style={{ width: `${(n / maxF) * 100}%` }} /></span>
                <span className="text-right font-semibold tabular">{n}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-line-2 pt-5 sm:grid-cols-6">
            {[['Impressions', m.impressions], ['Likes', m.likes], ['Komentar', m.comments], ['Share', m.shares], ['Save', m.saves], ['Rata-rata ER', null]].map(([k, v]) => (
              <div key={k as string}><p className="text-xs text-muted">{k}</p><p className="mt-0.5 font-semibold tabular">{v === null ? percent(m.average_er) : compactNumber(v as number)}</p></div>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel className="print-plain">
            <PanelTitle title="Keuangan" />
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Total komitmen</dt><dd className="font-semibold tabular">{rupiah(f.committed)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Sudah dibayar</dt><dd className="font-semibold text-moss tabular">{rupiah(f.paid)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Belum dibayar</dt><dd className="font-semibold tabular">{rupiah(f.pending)}</dd></div>
            </dl>
          </Panel>
          <Panel className="print-plain">
            <PanelTitle title="Kesiapan closing" />
            <ul className="space-y-2 text-sm">
              {checklist.map(([l, ok]) => (
                <li key={l} className={cx('flex items-center gap-2', ok ? 'text-ink' : 'text-muted')}>
                  <span className={cx('grid size-5 place-items-center rounded-full', ok ? 'bg-moss-50 text-moss' : 'bg-ink/5 text-faint')}>{ok ? <Check className="size-3" /> : <X className="size-3" />}</span>{l}
                </li>
              ))}
            </ul>
            {c.status === 'CLOSED' && <p className="mt-4 text-sm text-ink-2">Ditutup {date(c.closed_at)}{c.closing_note ? ` — ${c.closing_note}` : ''}</p>}
          </Panel>
        </div>
      </div>

      <Panel className="mt-6 print-break print-plain" padded={false}>
        <div className="px-5 pt-5"><PanelTitle title="Performa per creator" /></div>
        {r.creators.length === 0 ? <p className="px-5 pb-6 text-sm text-muted">Belum ada creator final.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-semibold">Creator</th><th className="px-3 py-3 font-semibold">Postingan</th>
                <th className="px-3 py-3 text-right font-semibold">Views</th><th className="px-3 py-3 text-right font-semibold">Reach</th>
                <th className="px-3 py-3 text-right font-semibold">Interaksi</th><th className="px-3 py-3 text-right font-semibold">ER</th>
                <th className="px-3 py-3 text-right font-semibold">Fee</th><th className="px-5 py-3 font-semibold">Pembayaran</th>
              </tr></thead>
              <tbody className="divide-y divide-line-2">
                {r.creators.map((x: any) => {
                  const i = x.insight;
                  return (
                    <tr key={x.application_id}>
                      <td className="px-5 py-3"><p className="font-semibold">{x.talent_name}</p><div className="mt-1 no-print"><AppStatus status={x.status} /></div></td>
                      <td className="px-3 py-3">{x.publication ? <><ExternalA href={x.publication.content_url}>{platformLabel(x.publication.platform)}</ExternalA><p className="text-xs text-muted">{date(x.publication.published_at)}</p></> : <span className="text-faint">—</span>}</td>
                      <td className="px-3 py-3 text-right tabular">{i ? compactNumber(i.views) : '—'}</td>
                      <td className="px-3 py-3 text-right tabular">{i ? compactNumber(i.reach) : '—'}</td>
                      <td className="px-3 py-3 text-right tabular">{i ? compactNumber(i.likes + i.comments + i.shares + i.saves) : '—'}</td>
                      <td className="px-3 py-3 text-right tabular">{i ? percent(i.engagement_rate) : '—'}</td>
                      <td className="px-3 py-3 text-right tabular">{x.payment ? rupiah(x.payment.amount) : '—'}</td>
                      <td className="px-5 py-3">{x.payment ? <PaymentStatus status={x.payment.status} /> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

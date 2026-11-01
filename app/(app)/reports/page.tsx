import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { compactNumber, period } from '@/lib/format';
import { Empty, PageHeader, Panel } from '@/components/ui/primitives';
import { CampaignStatus } from '@/components/ui/status';
import { TrendingUp } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Reports' };

export default async function ReportsPage() {
  await requireUser(['ADMIN', 'BRAND']);
  const supabase = await createClient();
  const [{ data: campaigns }, { data: reports }, { data: insights }] = await Promise.all([
    supabase.from('campaigns').select('id, title, brand_name, status, start_date, end_date, creator_needed').neq('status', 'DRAFT').order('updated_at', { ascending: false }),
    supabase.from('campaign_reports').select('campaign_id, updated_at'),
    supabase.from('insights').select('campaign_id, views, reach').eq('status', 'VERIFIED'),
  ]);
  const saved = new Set((reports ?? []).map((r) => r.campaign_id));
  const agg = new Map<string, { views: number; reach: number; n: number }>();
  (insights ?? []).forEach((i) => {
    const a = agg.get(i.campaign_id) ?? { views: 0, reach: 0, n: 0 };
    a.views += Number(i.views); a.reach += Number(i.reach); a.n++;
    agg.set(i.campaign_id, a);
  });

  return (
    <>
      <PageHeader title="Reports" description="Performa, keuangan, dan kesiapan closing per campaign. Export ke Excel atau PDF dari halaman detail." />
      <Panel padded={false}>
        {(campaigns ?? []).length === 0 ? <Empty icon={<TrendingUp className="size-5" />} title="Belum ada campaign untuk dilaporkan" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-semibold">Campaign</th><th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Insight terverifikasi</th><th className="px-3 py-3 text-right font-semibold">Views</th>
                <th className="px-3 py-3 text-right font-semibold">Reach</th><th className="px-5 py-3 font-semibold">Final report</th>
              </tr></thead>
              <tbody className="divide-y divide-line-2">
                {(campaigns ?? []).map((c) => {
                  const a = agg.get(c.id);
                  return (
                    <tr key={c.id} className="group hover:bg-paper/70">
                      <td className="px-5 py-3.5"><Link href={`/reports/${c.id}`} className="font-semibold group-hover:underline">{c.title}</Link><p className="text-xs text-muted">{c.brand_name} — {period(c.start_date, c.end_date)}</p></td>
                      <td className="px-3 py-3.5"><CampaignStatus status={c.status} /></td>
                      <td className="px-3 py-3.5 text-right tabular">{a?.n ?? 0} / {c.creator_needed}</td>
                      <td className="px-3 py-3.5 text-right tabular">{compactNumber(a?.views)}</td>
                      <td className="px-3 py-3.5 text-right tabular">{compactNumber(a?.reach)}</td>
                      <td className="px-5 py-3.5 text-sm">{saved.has(c.id) ? <span className="font-medium text-moss">Tersimpan</span> : <span className="text-muted">Belum</span>}</td>
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

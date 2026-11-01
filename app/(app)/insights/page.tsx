import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { compactNumber, date, percent } from '@/lib/format';
import { Empty, PageHeader, Panel, Stat } from '@/components/ui/primitives';
import { ReviewStatus } from '@/components/ui/status';
import { Gauge } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Insights' };

export default async function InsightsPage() {
  const me = await requireUser(['TALENT']);
  const supabase = await createClient();
  const { data } = await supabase.from('insights').select('*, campaign:campaigns(title, brand_name)').eq('talent_id', me.id).order('submitted_at', { ascending: false });
  const rows = (data ?? []) as any[];
  const verified = rows.filter((r) => r.status === 'VERIFIED');
  const sum = (k: string) => verified.reduce((s, r) => s + Number(r[k] || 0), 0);
  const avgEr = verified.length ? verified.reduce((s, r) => s + Number(r.engagement_rate), 0) / verified.length : 0;

  return (
    <>
      <PageHeader title="Insights" description="Performa konten yang sudah Anda laporkan. Kirim insight baru dari menu Content & Publication." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Konten terverifikasi" value={verified.length} />
        <Stat label="Total views" value={compactNumber(sum('views'))} />
        <Stat label="Total reach" value={compactNumber(sum('reach'))} />
        <Stat label="Rata-rata ER" value={percent(avgEr)} />
      </div>
      <Panel className="mt-6" padded={false}>
        {rows.length === 0 ? (
          <Empty icon={<Gauge className="size-5" />} title="Belum ada insight" description="Insight dikirim setelah link tayang Anda terverifikasi."
            action={<Link href="/content" className="text-sm font-semibold text-iris hover:underline">Buka Content & Publication</Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-semibold">Campaign</th><th className="px-3 py-3 text-right font-semibold">Views</th><th className="px-3 py-3 text-right font-semibold">Reach</th>
                <th className="px-3 py-3 text-right font-semibold">Interaksi</th><th className="px-3 py-3 text-right font-semibold">ER</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Dikirim</th>
              </tr></thead>
              <tbody className="divide-y divide-line-2">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3"><p className="font-semibold">{r.campaign?.title}</p><p className="text-xs text-muted">{r.campaign?.brand_name}</p>{r.status === 'REJECTED' && r.review_note && <p className="mt-1 text-xs text-rose">{r.review_note}</p>}</td>
                    <td className="px-3 py-3 text-right tabular">{compactNumber(r.views)}</td>
                    <td className="px-3 py-3 text-right tabular">{compactNumber(r.reach)}</td>
                    <td className="px-3 py-3 text-right tabular">{compactNumber(Number(r.likes) + Number(r.comments) + Number(r.shares) + Number(r.saves))}</td>
                    <td className="px-3 py-3 text-right tabular">{percent(r.engagement_rate)}</td>
                    <td className="px-3 py-3"><ReviewStatus status={r.status} /></td>
                    <td className="px-5 py-3 text-muted">{date(r.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

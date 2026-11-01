import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { date, number, period, rupiah } from '@/lib/format';
import type { Campaign } from '@/lib/types';
import { Empty, LinkButton, PageHeader, Panel, TabLinks } from '@/components/ui/primitives';
import { CampaignStatus, RecruitmentBadge } from '@/components/ui/status';
import { Megaphone, Plus } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Campaigns' };

const FILTERS = [
  { key: 'active', label: 'Berjalan' },
  { key: 'draft', label: 'Draft' },
  { key: 'closed', label: 'Selesai' },
  { key: 'all', label: 'Semua' },
];

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const me = await requireUser(['ADMIN', 'BRAND']);
  const { f = 'active', q = '' } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: apps }] = await Promise.all([
    supabase.from('campaigns').select('*').order('updated_at', { ascending: false }),
    supabase.from('applications').select('campaign_id, status'),
  ]);
  const all = (data ?? []) as Campaign[];
  const counts = new Map<string, { total: number; final: number }>();
  (apps ?? []).forEach((a) => {
    const c = counts.get(a.campaign_id) ?? { total: 0, final: 0 };
    c.total++;
    if (['BRAND_APPROVED', 'BRIEF_SENT', 'PRODUCT_SHIPPED', 'CONTENT_IN_PROGRESS', 'DRAFT_SUBMITTED', 'REVISION_REQUESTED', 'CONTENT_APPROVED', 'READY_TO_PUBLISH', 'PUBLISHED', 'PUBLICATION_VERIFIED', 'INSIGHT_SUBMITTED', 'INSIGHT_VERIFIED', 'READY_FOR_PAYMENT', 'PAID', 'COMPLETED'].includes(a.status)) c.final++;
    counts.set(a.campaign_id, c);
  });
  const bucket = (c: Campaign) => (c.status === 'DRAFT' ? 'draft' : ['CLOSED', 'CANCELLED'].includes(c.status) ? 'closed' : 'active');
  const term = q.trim().toLowerCase();
  const list = all.filter((c) => (f === 'all' || bucket(c) === f) && (!term || `${c.title} ${c.brand_name} ${c.code}`.toLowerCase().includes(term)));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const regOpen = (c: Campaign) =>
    c.registration_status === 'OPEN' && !['CLOSED', 'CANCELLED'].includes(c.status) && (!c.open_date || c.open_date <= today) && (!c.close_date || c.close_date >= today) &&
    (!c.registration_target || (counts.get(c.id)?.total ?? 0) < c.registration_target);

  return (
    <>
      <PageHeader title="Campaigns" description="Kebutuhan creator, recruitment, dan progres tiap campaign."
        actions={<LinkButton href="/campaigns/new"><Plus className="size-4" />Campaign baru</LinkButton>} />
      <TabLinks active={`/campaigns?f=${f}`} tabs={FILTERS.map((x) => ({ href: `/campaigns?f=${x.key}`, label: x.label, count: x.key === 'all' ? undefined : all.filter((c) => bucket(c) === x.key).length }))} />
      <form className="mb-4" action="/campaigns">
        <input type="hidden" name="f" value={f} />
        <input name="q" defaultValue={q} placeholder="Cari judul, brand, atau kode campaign"
          className="h-10 w-full max-w-sm rounded-control border border-line bg-surface px-3 text-sm placeholder:text-faint focus:border-iris focus:outline-none" />
      </form>
      <Panel padded={false}>
        {list.length === 0 ? (
          <Empty icon={<Megaphone className="size-5" />} title={term ? 'Tidak ada campaign yang cocok' : 'Belum ada campaign di sini'}
            description={me.role === 'ADMIN' ? 'Campaign baru dimulai sebagai draft. Buka recruitment saat siap menerima pendaftar.' : undefined}
            action={!term && <LinkButton href="/campaigns/new" size="sm">Buat campaign</LinkButton>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-6 py-3 font-semibold">Campaign</th>
                  <th className="px-3 py-3 font-semibold">Workflow</th>
                  <th className="px-3 py-3 font-semibold">Recruitment</th>
                  <th className="px-3 py-3 text-right font-semibold">Pendaftar</th>
                  <th className="px-3 py-3 text-right font-semibold">Final / target</th>
                  <th className="px-3 py-3 text-right font-semibold">Fee</th>
                  <th className="px-6 py-3 font-semibold">Periode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-2">
                {list.map((c) => {
                  const n = counts.get(c.id) ?? { total: 0, final: 0 };
                  return (
                    <tr key={c.id} className="group hover:bg-paper/70">
                      <td className="px-6 py-3.5">
                        <Link href={`/campaigns/${c.id}`} className="block min-w-0">
                          <span className="font-semibold group-hover:underline">{c.title}</span>
                          <span className="mt-0.5 block text-xs text-muted">{c.brand_name} — {c.code}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3.5"><CampaignStatus status={c.status} /></td>
                      <td className="px-3 py-3.5">
                        <RecruitmentBadge ok={regOpen(c)} status={c.registration_status === 'OPEN' && c.open_date && c.open_date > today ? 'SCHEDULED' : undefined} />
                        {c.close_date && regOpen(c) && <span className="mt-1 block text-xs text-muted">s.d. {date(c.close_date)}</span>}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular">{number(n.total)}{c.registration_target ? <span className="text-muted"> / {c.registration_target}</span> : null}</td>
                      <td className="px-3 py-3.5 text-right tabular">{n.final} / {c.creator_needed}</td>
                      <td className="px-3 py-3.5 text-right tabular">{rupiah(c.payment_amount)}</td>
                      <td className="px-6 py-3.5 text-muted">{period(c.start_date, c.end_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="mt-3 text-xs text-muted">Status recruitment terpisah dari status workflow: recruitment dapat tetap dibuka selama produksi berjalan.</p>
    </>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser, rpc } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { APP_STATUS } from '@/lib/constants';
import { compactNumber, date, number, period, relative, rupiah } from '@/lib/format';
import type { Profile, SopRow } from '@/lib/types';
import { Empty, LinkButton, PageHeader, Panel, PanelTitle, Stat, Notice, cx } from '@/components/ui/primitives';
import { AppStatus, ApplicationRail, CampaignStatus, Recommendation, StageRail } from '@/components/ui/status';
import { ChevronRight, Inbox, Plus } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Overview' };

function greeting() {
  const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }));
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
}

export default async function DashboardPage() {
  const me = await requireUser();
  if (me.role === 'TALENT') return <TalentDashboard me={me} />;
  if (me.role === 'BRAND') return <BrandDashboard me={me} />;
  return <AdminDashboard me={me} />;
}

/* ---------------- Admin ---------------- */
async function AdminDashboard({ me }: { me: Profile }) {
  const [d, sop] = await Promise.all([rpc<any>('dashboard_summary'), rpc<SopRow[]>('campaign_sop')]);
  const queue = [
    { label: 'Pendaftar perlu ditinjau', n: d.pending_candidates, href: '/candidates?group=new' },
    { label: 'Creator bersedia, ajukan ke Brand', n: d.ready_for_brand, href: '/candidates?group=offer' },
    { label: 'Disetujui Brand, kirim brief', n: d.awaiting_brief, href: '/candidates?group=final' },
    { label: 'Draft menunggu review', n: d.drafts_to_review, href: '/content?tab=drafts' },
    { label: 'Link tayang perlu diverifikasi', n: d.publications_to_verify, href: '/content?tab=publications' },
    { label: 'Insight perlu diverifikasi', n: d.insights_to_verify, href: '/content?tab=insights' },
    { label: 'Pembayaran siap diproses', n: d.pending_payments, href: '/payments' },
    { label: 'Pesan creator belum dibaca', n: d.unread_chats, href: '/messages' },
  ];
  const open = queue.filter((q) => q.n > 0);
  const active = sop.filter((s) => !['CLOSED', 'CANCELLED'].includes(s.campaign.status));

  return (
    <>
      <PageHeader title={`${greeting()}, ${me.full_name.split(' ')[0]}`}
        description={open.length ? `Ada ${open.reduce((s, q) => s + q.n, 0)} hal yang menunggu tindakan Anda.` : 'Semua antrean kerja sudah bersih.'}
        actions={<LinkButton href="/campaigns/new"><Plus className="size-4" />Campaign baru</LinkButton>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Creator aktif" value={number(d.active_creators)} href="/talents" />
        <Stat label="Campaign berjalan" value={number(d.active_campaigns)} sub={`${d.open_recruitment} sedang recruitment`} href="/campaigns" />
        <Stat label="Pendaftar baru" value={number(d.pending_candidates)} tone={d.pending_candidates ? 'attention' : undefined} href="/candidates?group=new" />
        <Stat label="Pembayaran tertunda" value={number(d.pending_payments)} sub={rupiah(d.pending_payment_amount)} href="/payments" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <Panel padded={false}>
          <div className="px-6 pt-5"><PanelTitle title="Campaign berjalan" description="Posisi tiap campaign pada 11 tahap SOP." action={<Link href="/workflow" className="text-[13px] font-semibold text-iris hover:underline">Lihat SOP</Link>} /></div>
          {active.length === 0 ? (
            <Empty icon={<Inbox className="size-5" />} title="Belum ada campaign berjalan" description="Buat campaign, lalu buka recruitment untuk mulai menerima pendaftar."
              action={<LinkButton href="/campaigns/new" size="sm">Buat campaign</LinkButton>} />
          ) : (
            <ul className="divide-y divide-line-2">
              {active.slice(0, 7).map((s) => (
                <li key={s.campaign.id}>
                  <Link href={`/campaigns/${s.campaign.id}`} className="grid gap-3 px-6 py-4 transition-colors hover:bg-paper/70 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{s.campaign.title}</p>
                        <CampaignStatus status={s.campaign.status} />
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-muted">{s.campaign.brand_name} — {period(s.campaign.start_date, s.campaign.end_date)}</p>
                    </div>
                    <StageRail done={s.steps.map((x) => x.done)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelTitle title="Antrean kerja" />
            {open.length === 0 ? (
              <p className="text-sm text-muted">Tidak ada tindakan yang tertunda.</p>
            ) : (
              <ul className="-mx-2">
                {open.map((q) => (
                  <li key={q.label}>
                    <Link href={q.href} className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-paper">
                      <span className="grid h-6 min-w-6 place-items-center rounded-md bg-iris-50 px-1.5 text-xs font-bold text-iris-700 tabular">{q.n}</span>
                      <span className="flex-1 text-ink-2">{q.label}</span>
                      <ChevronRight className="size-4 text-faint" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel>
            <PanelTitle title="Pendaftar terbaru" action={<Link href="/candidates" className="text-[13px] font-semibold text-iris hover:underline">Semua</Link>} />
            {d.recent_applications.length === 0 ? <p className="text-sm text-muted">Belum ada pendaftar.</p> : (
              <ul className="space-y-3.5">
                {d.recent_applications.map((a: any) => (
                  <li key={a.id}>
                    <Link href={`/candidates?campaign=${a.campaign_id}&app=${a.id}`} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold hover:underline">{a.talent_name}</p>
                        <p className="truncate text-xs text-muted">{a.campaign_title} — {relative(a.applied_at)}</p>
                      </div>
                      <Recommendation value={a.recommendation} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ---------------- Brand ---------------- */
async function BrandDashboard({ me }: { me: Profile }) {
  const [d, sop] = await Promise.all([rpc<any>('dashboard_summary'), rpc<SopRow[]>('campaign_sop')]);
  return (
    <>
      <PageHeader title={`${greeting()}, ${me.full_name.split(' ')[0]}`} description="Ringkasan campaign dan kandidat yang menunggu keputusan Anda." />
      {d.candidates_to_review > 0 && (
        <Notice tone="amber" className="mb-6" title={`${d.candidates_to_review} creator menunggu keputusan Anda`}>
          <Link href="/candidates?group=brand" className="font-semibold underline">Tinjau kandidat</Link>
        </Notice>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Campaign aktif" value={number(d.active_campaigns)} sub={`${d.campaigns} total`} href="/campaigns" />
        <Stat label="Kandidat perlu review" value={number(d.candidates_to_review)} tone={d.candidates_to_review ? 'attention' : undefined} href="/candidates?group=brand" />
        <Stat label="Konten tayang" value={number(d.publications)} sub={`${d.approved_creators} creator final`} />
        <Stat label="Total views" value={compactNumber(d.views)} sub={`Reach ${compactNumber(d.reach)}`} href="/reports" />
      </div>
      <Panel className="mt-6" padded={false}>
        <div className="px-6 pt-5"><PanelTitle title="Campaign Anda" /></div>
        {sop.length === 0 ? (
          <Empty icon={<Inbox className="size-5" />} title="Belum ada campaign" description="Campaign yang dibuat tim CreatorHub untuk perusahaan Anda akan muncul di sini." />
        ) : (
          <ul className="divide-y divide-line-2">
            {sop.map((s) => (
              <li key={s.campaign.id}>
                <Link href={`/campaigns/${s.campaign.id}`} className="grid gap-3 px-6 py-4 hover:bg-paper/70 md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><p className="truncate font-semibold">{s.campaign.title}</p><CampaignStatus status={s.campaign.status} /></div>
                    <p className="mt-0.5 text-[13px] text-muted">{period(s.campaign.start_date, s.campaign.end_date)}</p>
                  </div>
                  <StageRail done={s.steps.map((x) => x.done)} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

/* ---------------- Talent ---------------- */
async function TalentDashboard({ me }: { me: Profile }) {
  const supabase = await createClient();
  const [d, market, { data: apps }] = await Promise.all([
    rpc<any>('dashboard_summary'),
    rpc<any[]>('marketplace_campaigns'),
    supabase.from('applications').select('id, status, updated_at, campaign:campaigns(id, title, brand_name, end_date)').eq('talent_id', me.id).order('updated_at', { ascending: false }),
  ]);
  const activeApps = (apps ?? []).filter((a: any) => !APP_STATUS[a.status]?.ended && a.status !== 'COMPLETED');
  const todo = activeApps.filter((a: any) => ['OFFER_SENT', 'BRIEF_SENT', 'PRODUCT_SHIPPED', 'REVISION_REQUESTED', 'READY_TO_PUBLISH', 'CONTENT_APPROVED', 'PUBLICATION_VERIFIED'].includes(a.status));
  const openCampaigns = market.filter((c) => !c.already_applied).slice(0, 3);

  return (
    <>
      <PageHeader title={`${greeting()}, ${me.full_name.split(' ')[0]}`}
        description={todo.length ? `${todo.length} campaign menunggu langkah dari Anda.` : 'Tidak ada tugas yang menunggu saat ini.'} />

      {(d.profile_completeness < 80 || !d.bank_complete) && (
        <Notice tone="iris" className="mb-6" title={d.profile_completeness < 80 ? `Profil Anda ${d.profile_completeness}% lengkap` : 'Data rekening belum lengkap'}>
          {d.profile_completeness < 80 ? 'Profil yang lengkap membantu tim mencocokkan Anda dengan campaign yang sesuai. ' : 'Rekening diperlukan agar pembayaran dapat diproses. '}
          <Link href="/profile" className="font-semibold underline">Lengkapi profil</Link>
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pendaftaran" value={number(d.applications)} href="/applications" />
        <Stat label="Pekerjaan aktif" value={number(d.active_jobs)} href="/content" />
        <Stat label="Sudah dibayar" value={rupiah(d.paid_earnings)} href="/payments" />
        <Stat label="Akan dibayar" value={rupiah(d.upcoming_earnings)} href="/payments" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <Panel padded={false}>
          <div className="px-6 pt-5"><PanelTitle title="Campaign Anda" description="Langkah berikutnya untuk setiap campaign." /></div>
          {activeApps.length === 0 ? (
            <Empty icon={<Inbox className="size-5" />} title="Belum ada campaign aktif" description="Daftar ke campaign yang sedang membuka recruitment."
              action={<LinkButton href="/marketplace" size="sm">Lihat campaign</LinkButton>} />
          ) : (
            <ul className="divide-y divide-line-2">
              {activeApps.map((a: any) => (
                <li key={a.id}>
                  <Link href={a.status === 'OFFER_SENT' || APP_STATUS[a.status]?.step <= 5 ? '/applications' : '/content'}
                    className="grid gap-3 px-6 py-4 hover:bg-paper/70 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><p className="truncate font-semibold">{a.campaign?.title}</p><AppStatus status={a.status} audience="talent" /></div>
                      <p className="mt-0.5 text-[13px] text-muted">{a.campaign?.brand_name}</p>
                    </div>
                    <ApplicationRail status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <PanelTitle title="Campaign terbuka" action={<Link href="/marketplace" className="text-[13px] font-semibold text-iris hover:underline">Semua</Link>} />
          {openCampaigns.length === 0 ? <p className="text-sm text-muted">Belum ada campaign baru yang membuka pendaftaran.</p> : (
            <ul className="space-y-4">
              {openCampaigns.map((c) => (
                <li key={c.id}>
                  <Link href={`/join/${c.code}`} className="block rounded-lg border border-line p-4 hover:border-ink/25">
                    <p className="text-xs text-muted">{c.brand_name}</p>
                    <p className="mt-0.5 font-semibold">{c.title}</p>
                    <p className={cx('mt-2 text-sm font-bold tabular', 'text-ink')}>{rupiah(c.payment_amount)}</p>
                    {c.close_date && <p className="mt-1 text-xs text-muted">Daftar sampai {date(c.close_date)}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

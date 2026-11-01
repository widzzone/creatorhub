import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireUser, rpc } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CAMPAIGN_STATUS, PIPELINE_GROUPS, QUESTION_TYPES, SCREENING_OPERATORS } from '@/lib/constants';
import { number, period, platformLabel, rupiah } from '@/lib/format';
import type { Availability, Campaign, SopRow } from '@/lib/types';
import { ExternalA, KeyValue, LinkButton, PageHeader, Panel, PanelTitle, Tag, cx } from '@/components/ui/primitives';
import { CampaignStatus, StageRail } from '@/components/ui/status';
import { ArrowLeft, Check, Pencil } from '@/components/ui/icons';
import { BroadcastBox, RecruitmentControl } from '@/components/campaign/recruitment-control';
import { CampaignAdminActions } from '@/components/campaign/campaign-admin-actions';

export const metadata: Metadata = { title: 'Campaign' };

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser(['ADMIN', 'BRAND']);
  const supabase = await createClient();
  const { data } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const c = data as Campaign;
  const [{ data: questions }, { data: apps }, availability, sopRows] = await Promise.all([
    supabase.from('campaign_questions').select('*').eq('campaign_id', id).eq('is_active', true).order('display_order'),
    supabase.from('applications').select('status').eq('campaign_id', id),
    rpc<Availability>('recruitment_status', { p_campaign: id }),
    rpc<SopRow[]>('campaign_sop', { p_campaign: id }),
  ]);
  const sop = sopRows[0];
  const closed = ['CLOSED', 'CANCELLED'].includes(c.status);
  const groupCounts = PIPELINE_GROUPS.map((g) => ({ ...g, n: (apps ?? []).filter((a) => g.statuses.includes(a.status)).length }));

  return (
    <>
      <PageHeader
        back={<Link href="/campaigns" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" />Campaigns</Link>}
        title={c.title}
        description={<span className="flex flex-wrap items-center gap-x-3 gap-y-1.5"><span>{c.brand_name}</span><span className="text-faint">/</span><span className="tabular">{c.code}</span><CampaignStatus status={c.status} /></span>}
        actions={
          <>
            {!closed && <LinkButton href={`/campaigns/${id}/edit`} variant="secondary"><Pencil className="size-4" />Edit</LinkButton>}
            <LinkButton href={`/reports/${id}`} variant="secondary">Report</LinkButton>
            <LinkButton href={`/candidates?campaign=${id}`}>Lihat kandidat</LinkButton>
            {me.role === 'ADMIN' && <CampaignAdminActions campaignId={id} status={c.status} title={c.title} />}
          </>
        }
      />

      {sop && (
        <Panel className="mb-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <PanelTitle title="Progres SOP" className="mb-3" />
              <StageRail done={sop.steps.map((s) => s.done)} />
            </div>
            <ol className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3 lg:grid-cols-4">
              {sop.steps.map((s, i) => (
                <li key={s.key} className={cx('flex items-center gap-1.5', s.done ? 'text-ink-2' : 'text-faint')}>
                  {s.done ? <Check className="size-3 text-iris" /> : <span className="w-3 text-center tabular">{i + 1}</span>}
                  <span className="truncate" title={s.detail}>{s.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Panel>
            <PanelTitle title="Kandidat" action={<Link href={`/candidates?campaign=${id}`} className="text-[13px] font-semibold text-iris hover:underline">Buka pipeline</Link>} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {groupCounts.map((g) => (
                <Link key={g.key} href={`/candidates?campaign=${id}&group=${g.key}`} className="rounded-control border border-line px-3 py-3 hover:border-ink/25">
                  <p className="text-[22px] font-bold tabular">{g.n}</p>
                  <p className="mt-0.5 text-xs text-muted">{g.label}</p>
                </Link>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted tabular">Target {c.creator_needed} creator final.</p>
          </Panel>

          <Panel>
            <PanelTitle title="Detail campaign" />
            <div className="space-y-6">
              <p className="text-sm leading-relaxed whitespace-pre-line text-ink-2">{c.description}</p>
              <KeyValue items={[
                { label: 'Objective', value: c.objective },
                { label: 'Profil creator', value: c.creator_profile },
                { label: 'Periode', value: period(c.start_date, c.end_date) },
                { label: 'Fee per creator', value: <span className="font-semibold tabular">{rupiah(c.payment_amount)}</span> },
                { label: 'Platform', value: <span className="flex flex-wrap gap-1">{c.platforms.map((p) => <Tag key={p}>{platformLabel(p)}</Tag>)}</span> },
                { label: 'Kategori', value: <span className="flex flex-wrap gap-1">{c.categories.map((p) => <Tag key={p}>{p}</Tag>)}</span> },
                { label: 'Followers', value: c.min_followers || c.max_followers ? `${number(c.min_followers)}${c.max_followers ? ` – ${number(c.max_followers)}` : '+'}` : 'Bebas' },
                { label: 'Minimum ER', value: c.min_engagement ? `${c.min_engagement}%` : 'Bebas' },
                { label: 'Domisili', value: c.preferred_city || 'Semua' },
                { label: 'Gender', value: { ALL: 'Semua', FEMALE: 'Perempuan', MALE: 'Laki-laki' }[c.gender_preference] },
                { label: 'Benefit', value: c.benefit },
                { label: 'Produk', value: c.product_required ? `Dikirim ke creator${c.product_notes ? ` — ${c.product_notes}` : ''}` : 'Tidak perlu' },
              ]} />
              <KeyValue cols={1} items={[
                { label: 'Deliverables', value: <span className="whitespace-pre-line">{c.deliverables}</span> },
                { label: 'Scope of work', value: <span className="whitespace-pre-line">{c.sow}</span> },
                { label: 'Catatan brief', value: <span className="whitespace-pre-line">{c.brief_note}</span> },
                { label: 'Link brief', value: c.brief_url && <ExternalA href={c.brief_url}>{c.brief_url}</ExternalA> },
              ]} />
            </div>
          </Panel>

          <Panel>
            <PanelTitle title="Pertanyaan pendaftaran" description={`${(questions ?? []).length} pertanyaan khusus, selain data profil standar.`} />
            {(questions ?? []).length === 0 ? <p className="text-sm text-muted">Tidak ada pertanyaan tambahan.</p> : (
              <ol className="divide-y divide-line-2">
                {(questions ?? []).map((q: any, i: number) => (
                  <li key={q.id} className="flex gap-3 py-3 text-sm">
                    <span className="w-5 text-faint tabular">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{q.question_text}{q.required && <span className="text-rose"> *</span>}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {QUESTION_TYPES.find((t) => t.value === q.question_type)?.label}
                        {q.screening_enabled && ` — screening: ${(SCREENING_OPERATORS.find((o) => o.value === q.screening_operator)?.label ?? q.screening_operator).toLowerCase()} "${q.screening_value}", bobot ${q.weight}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelTitle title="Recruitment" description="Diatur terpisah dari status workflow." />
            <RecruitmentControl campaignId={id} code={c.code} status={c.registration_status} openDate={c.open_date} closeDate={c.close_date}
              target={c.registration_target} availability={availability} disabled={closed} />
          </Panel>
          <Panel>
            <PanelTitle title="Pesan broadcast" />
            <BroadcastBox message={c.broadcast_message} code={c.code} title={c.title} />
            {c.recruitment_channels && <p className="mt-3 text-xs text-muted">Channel: {c.recruitment_channels}</p>}
          </Panel>
          {c.status === 'CLOSED' && (
            <Panel>
              <PanelTitle title="Campaign ditutup" />
              <p className="text-sm text-ink-2">{c.closing_note || 'Tanpa catatan.'}</p>
            </Panel>
          )}
          <p className="px-1 text-xs text-muted">Status workflow: {CAMPAIGN_STATUS[c.status]?.label}. Workflow bergerak otomatis mengikuti tindakan pada kandidat.</p>
        </div>
      </div>
    </>
  );
}

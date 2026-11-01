import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadFormRefs } from '@/lib/data/campaign-refs';
import type { Campaign, Question } from '@/lib/types';
import { Notice, PageHeader } from '@/components/ui/primitives';
import { ArrowLeft } from '@/components/ui/icons';
import { CampaignForm } from '@/components/campaign/campaign-form';

export const metadata: Metadata = { title: 'Edit campaign' };

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser(['ADMIN', 'BRAND']);
  const supabase = await createClient();
  const [{ data: campaign }, { data: questions }, refs, { count }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', id).maybeSingle(),
    supabase.from('campaign_questions').select('*').eq('campaign_id', id).eq('is_active', true).order('display_order'),
    loadFormRefs(me.role, me.id),
    supabase.from('applications').select('id', { count: 'exact', head: true }).eq('campaign_id', id),
  ]);
  if (!campaign) notFound();
  const c = campaign as Campaign;
  const closed = ['CLOSED', 'CANCELLED'].includes(c.status);
  return (
    <>
      <PageHeader title="Edit campaign" description={c.title}
        back={<Link href={`/campaigns/${id}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" />Kembali ke campaign</Link>} />
      {closed ? (
        <Notice tone="neutral" title="Campaign sudah ditutup">Campaign yang sudah selesai atau dibatalkan tidak dapat diubah.</Notice>
      ) : (
        <>
          {(count ?? 0) > 0 && (
            <Notice tone="amber" className="mb-6" title={`${count} creator sudah mendaftar`}>
              Jawaban yang sudah masuk tetap tersimpan apa adanya. Perubahan pertanyaan hanya berlaku untuk pendaftar berikutnya.
            </Notice>
          )}
          <CampaignForm campaign={c} questions={(questions ?? []) as Question[]} brands={refs.brands} templates={refs.templates} role={me.role as 'ADMIN' | 'BRAND'} />
        </>
      )}
    </>
  );
}

import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, TabLinks } from '@/components/ui/primitives';
import { ReviewQueue } from '@/components/content/review-queue';
import { TalentWorkspace } from '@/components/content/talent-workspace';

export const metadata: Metadata = { title: 'Content' };

const FINAL = ['BRAND_APPROVED', 'BRIEF_SENT', 'PRODUCT_SHIPPED', 'CONTENT_IN_PROGRESS', 'DRAFT_SUBMITTED', 'REVISION_REQUESTED', 'CONTENT_APPROVED', 'READY_TO_PUBLISH', 'PUBLISHED', 'PUBLICATION_VERIFIED', 'INSIGHT_SUBMITTED', 'INSIGHT_VERIFIED', 'READY_FOR_PAYMENT', 'PAID', 'COMPLETED'];

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireUser();
  const { tab = 'drafts' } = await searchParams;
  const supabase = await createClient();

  if (me.role === 'TALENT') {
    const { data: apps } = await supabase
      .from('applications')
      .select('*, campaign:campaigns(*), offer:job_offers(*), delivery:product_deliveries(*), submissions:content_submissions(*), publications(*), insights(*)')
      .eq('talent_id', me.id)
      .in('status', FINAL)
      .order('updated_at', { ascending: false });
    return (
      <>
        <PageHeader title="Content & Publication" description="Brief, draft, link tayang, dan insight untuk setiap campaign yang Anda jalankan." />
        <TalentWorkspace apps={(apps ?? []) as any[]} />
      </>
    );
  }

  const sel = '*, application:applications(talent_name, status), campaign:campaigns(title, code)';
  const [drafts, pubs, ins, histD, histP, histI] = await Promise.all([
    supabase.from('content_submissions').select(sel).eq('status', 'SUBMITTED').order('submitted_at'),
    supabase.from('publications').select(sel).eq('status', 'SUBMITTED').order('created_at'),
    supabase.from('insights').select(sel).eq('status', 'SUBMITTED').order('submitted_at'),
    supabase.from('content_submissions').select(sel).neq('status', 'SUBMITTED').order('reviewed_at', { ascending: false }).limit(20),
    supabase.from('publications').select(sel).neq('status', 'SUBMITTED').order('verified_at', { ascending: false }).limit(20),
    supabase.from('insights').select(sel).neq('status', 'SUBMITTED').order('verified_at', { ascending: false }).limit(20),
  ]);
  const tabs = [
    { href: '/content?tab=drafts', label: 'Draft', count: drafts.data?.length ?? 0 },
    { href: '/content?tab=publications', label: 'Link tayang', count: pubs.data?.length ?? 0 },
    { href: '/content?tab=insights', label: 'Insight', count: ins.data?.length ?? 0 },
    { href: '/content?tab=history', label: 'Riwayat' },
  ];
  return (
    <>
      <PageHeader title="Content Review" description="Setujui draft, verifikasi link tayang dan insight. Setiap keputusan langsung terkirim ke creator." />
      <TabLinks tabs={tabs} active={`/content?tab=${tab}`} />
      <ReviewQueue tab={tab} drafts={(drafts.data ?? []) as any[]} publications={(pubs.data ?? []) as any[]} insights={(ins.data ?? []) as any[]}
        history={{ drafts: (histD.data ?? []) as any[], publications: (histP.data ?? []) as any[], insights: (histI.data ?? []) as any[] }} />
    </>
  );
}

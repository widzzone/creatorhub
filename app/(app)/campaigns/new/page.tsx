import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { loadFormRefs } from '@/lib/data/campaign-refs';
import { PageHeader } from '@/components/ui/primitives';
import { ArrowLeft } from '@/components/ui/icons';
import { CampaignForm } from '@/components/campaign/campaign-form';

export const metadata: Metadata = { title: 'Campaign baru' };

export default async function NewCampaignPage() {
  const me = await requireUser(['ADMIN', 'BRAND']);
  const { brands, templates } = await loadFormRefs(me.role, me.id);
  return (
    <>
      <PageHeader title="Campaign baru" description="Mulai sebagai draft. Recruitment dapat dibuka kapan saja setelah tersimpan."
        back={<Link href="/campaigns" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" />Campaigns</Link>} />
      <CampaignForm questions={[]} brands={brands} templates={templates} role={me.role as 'ADMIN' | 'BRAND'} />
    </>
  );
}

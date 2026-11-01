import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/primitives';
import { ArrowLeft } from '@/components/ui/icons';
import { ShortlistTool } from '@/components/candidates/shortlist-tool';

export const metadata: Metadata = { title: 'Shortlist semi-otomatis' };

export default async function ShortlistPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  await requireUser(['ADMIN']);
  const { campaign } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from('campaigns').select('id, title, creator_needed, status').not('status', 'in', '(CLOSED,CANCELLED,DRAFT)').order('updated_at', { ascending: false });
  return (
    <>
      <PageHeader title="Shortlist semi-otomatis"
        description="Urutkan pendaftar berdasarkan kecocokan, saring dengan ambang minimum, lalu pilih kandidat. Tidak ada yang di-shortlist sebelum Anda konfirmasi."
        back={<Link href="/candidates" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" />Candidate Pipeline</Link>} />
      <ShortlistTool campaigns={(data ?? []) as any[]} initialCampaign={campaign ?? data?.[0]?.id ?? ''} />
    </>
  );
}

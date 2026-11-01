import type { Metadata } from 'next';
import { requireUser, rpc } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { PipelineRow } from '@/lib/types';
import { LinkButton, PageHeader } from '@/components/ui/primitives';
import { Sparkles } from '@/components/ui/icons';
import { PipelineBoard } from '@/components/candidates/pipeline-board';

export const metadata: Metadata = { title: 'Candidate Pipeline' };

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ campaign?: string; group?: string; app?: string; q?: string }> }) {
  const me = await requireUser(['ADMIN', 'BRAND']);
  const sp = await searchParams;
  const supabase = await createClient();
  const [rows, { data: campaigns }] = await Promise.all([
    rpc<PipelineRow[]>('candidate_pipeline', { p_campaign: null }),
    supabase.from('campaigns').select('id, title, code, status, product_required, payment_amount, deliverables, sow, start_date, end_date, description').order('updated_at', { ascending: false }),
  ]);
  const defaultGroup = sp.group ?? (me.role === 'BRAND' ? 'brand' : 'new');

  return (
    <>
      <PageHeader
        title={me.role === 'BRAND' ? 'Candidate Approval' : 'Candidate Pipeline'}
        description={me.role === 'BRAND'
          ? 'Creator yang sudah bersedia dan diajukan tim kami. Setujui atau tolak dengan catatan.'
          : 'Recommendation membantu urutan peninjauan. Keputusan shortlist dan final tetap di tangan tim.'}
        actions={me.role === 'ADMIN' && (
          <LinkButton href={`/candidates/shortlist${sp.campaign ? `?campaign=${sp.campaign}` : ''}`} variant="secondary"><Sparkles className="size-4" />Shortlist semi-otomatis</LinkButton>
        )}
      />
      <PipelineBoard rows={rows} campaigns={(campaigns ?? []) as any[]} role={me.role as 'ADMIN' | 'BRAND'}
        initial={{ campaign: sp.campaign ?? '', group: defaultGroup, app: sp.app ?? '', q: sp.q ?? '' }} />
    </>
  );
}

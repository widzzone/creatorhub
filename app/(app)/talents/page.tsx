import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/primitives';
import { TalentDatabase } from '@/components/accounts/talent-database';

export const metadata: Metadata = { title: 'Talent Database' };

export default async function TalentsPage() {
  await requireUser(['ADMIN']);
  const supabase = await createClient();
  const [{ data: talents }, { data: apps }] = await Promise.all([
    supabase.from('talent_profiles').select('*, profile:profiles!inner(email, phone, status, full_name, created_at, last_login)').order('created_at', { ascending: false }),
    supabase.from('applications').select('talent_id, status, campaign:campaigns(title)'),
  ]);
  const history: Record<string, { title: string; status: string }[]> = {};
  (apps ?? []).forEach((a: any) => { (history[a.talent_id] ??= []).push({ title: a.campaign?.title, status: a.status }); });
  return (
    <>
      <PageHeader title="Talent Database" description="Semua creator yang pernah mendaftar, dengan profil, verifikasi, dan riwayat campaign." />
      <TalentDatabase talents={(talents ?? []) as any[]} history={history} />
    </>
  );
}

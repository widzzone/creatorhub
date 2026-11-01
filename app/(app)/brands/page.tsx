import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/primitives';
import { BrandsTable } from '@/components/accounts/brands-table';

export const metadata: Metadata = { title: 'Brands & Clients' };

export default async function BrandsPage() {
  await requireUser(['ADMIN']);
  const supabase = await createClient();
  const [{ data: brands }, { data: campaigns }, { data: admins }] = await Promise.all([
    supabase.from('brand_profiles').select('*, profile:profiles!inner(email, status, phone, last_login)').order('company_name'),
    supabase.from('campaigns').select('brand_id, status'),
    supabase.from('profiles').select('id, email, full_name, status, last_login').eq('role', 'ADMIN').order('full_name'),
  ]);
  const counts: Record<string, { total: number; active: number }> = {};
  (campaigns ?? []).forEach((c) => {
    counts[c.brand_id] ??= { total: 0, active: 0 };
    counts[c.brand_id].total++;
    if (!['CLOSED', 'CANCELLED', 'DRAFT'].includes(c.status)) counts[c.brand_id].active++;
  });
  return (
    <>
      <PageHeader title="Brands & Clients" description="Akun Brand untuk review kandidat dan konten pada campaign miliknya. Brand tidak melihat rekening creator." />
      <BrandsTable brands={(brands ?? []) as any[]} counts={counts} admins={(admins ?? []) as any[]} />
    </>
  );
}

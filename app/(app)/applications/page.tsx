import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Empty, LinkButton, PageHeader, Panel } from '@/components/ui/primitives';
import { ClipboardList } from '@/components/ui/icons';
import { ApplicationCard } from '@/components/talent/application-card';

export const metadata: Metadata = { title: 'My Applications' };

export default async function ApplicationsPage() {
  const me = await requireUser(['TALENT']);
  const supabase = await createClient();
  const { data } = await supabase
    .from('applications')
    .select('id, status, applied_at, updated_at, offer_fee, campaign:campaigns(id, code, title, brand_name, start_date, end_date, deliverables, status), offer:job_offers(*)')
    .eq('talent_id', me.id)
    .order('updated_at', { ascending: false });
  const apps = (data ?? []) as any[];
  const offers = apps.filter((a) => a.status === 'OFFER_SENT' || a.status === 'NEGOTIATION');

  return (
    <>
      <PageHeader title="My Applications" description="Status setiap pendaftaran Anda, dari seleksi sampai pembayaran."
        actions={<LinkButton href="/marketplace" variant="secondary">Cari campaign</LinkButton>} />
      {apps.length === 0 ? (
        <Panel><Empty icon={<ClipboardList className="size-5" />} title="Belum ada pendaftaran" description="Daftar ke campaign yang sesuai dengan konten Anda."
          action={<LinkButton href="/marketplace" size="sm">Lihat campaign terbuka</LinkButton>} /></Panel>
      ) : (
        <div className="space-y-4">
          {offers.length > 0 && <h2 className="text-sm font-bold text-ink-2">Menunggu konfirmasi Anda</h2>}
          {offers.map((a) => <ApplicationCard key={a.id} a={a} />)}
          {offers.length > 0 && apps.length > offers.length && <h2 className="pt-4 text-sm font-bold text-ink-2">Pendaftaran lainnya</h2>}
          {apps.filter((a) => !offers.includes(a)).map((a) => <ApplicationCard key={a.id} a={a} />)}
        </div>
      )}
    </>
  );
}

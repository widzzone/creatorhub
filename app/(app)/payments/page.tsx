import type { Metadata } from 'next';
import { requireUser, rpc } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { PaymentRow } from '@/lib/types';
import { rupiah } from '@/lib/format';
import { PageHeader, Stat } from '@/components/ui/primitives';
import { AdminPayments, TalentPayments } from '@/components/payments/payments';

export const metadata: Metadata = { title: 'Payments' };

export default async function PaymentsPage() {
  const me = await requireUser(['ADMIN', 'TALENT', 'BRAND']);
  const rows = await rpc<PaymentRow[]>('payment_list');
  const { data: settings } = await (await createClient()).from('settings').select('value').eq('key', 'PAYMENT_TERM_DAYS').maybeSingle();
  const term = settings?.value ?? '7';
  const sum = (f: (r: PaymentRow) => boolean) => rows.filter(f).reduce((s, r) => s + Number(r.amount), 0);

  if (me.role === 'TALENT') {
    const { data: bank } = await (await createClient()).from('talent_bank_accounts').select('*').eq('user_id', me.id).maybeSingle();
    return (
      <>
        <PageHeader title="Payments" description={`Pembayaran diproses H+${term} hari setelah publikasi dan insight terverifikasi.`} />
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Sudah dibayar" value={rupiah(sum((r) => r.status === 'PAID'))} />
          <Stat label="Akan dibayar" value={rupiah(sum((r) => !['PAID', 'CANCELLED'].includes(r.status)))} />
        </div>
        <TalentPayments rows={rows} bank={bank ?? { bank_name: '', bank_account: '', bank_holder: '' }} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Payments"
        description={me.role === 'ADMIN'
          ? `Pembayaran siap diproses setelah publikasi dan insight terverifikasi (jatuh tempo H+${term}). Status Diproses dan Dibayar membutuhkan rekening lengkap; Dibayar membutuhkan bukti transfer.`
          : 'Status pembayaran creator pada campaign Anda.'} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Siap dibayar" value={rows.filter((r) => r.status === 'READY_FOR_PAYMENT').length} sub={rupiah(sum((r) => r.status === 'READY_FOR_PAYMENT'))} tone="attention" />
        <Stat label="Diproses" value={rows.filter((r) => r.status === 'PROCESSING').length} sub={rupiah(sum((r) => r.status === 'PROCESSING'))} />
        <Stat label="Dibayar" value={rows.filter((r) => r.status === 'PAID').length} sub={rupiah(sum((r) => r.status === 'PAID'))} />
        <Stat label="Menunggu verifikasi konten" value={rows.filter((r) => r.status === 'PENDING_VERIFICATION').length} sub={rupiah(sum((r) => r.status === 'PENDING_VERIFICATION'))} />
      </div>
      <AdminPayments rows={rows} readOnly={me.role === 'BRAND'} />
    </>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { APP_STATUS } from '@/lib/constants';
import { date, period, rupiah } from '@/lib/format';
import { Button, Field, Panel, Textarea } from '../ui/primitives';
import { useRpc } from '../ui/client';
import { Dialog } from '../ui/dialog';
import { AppStatus, ApplicationRail } from '../ui/status';

const one = (x: any) => (Array.isArray(x) ? x[0] : x) ?? null;

export function ApplicationCard({ a }: { a: any }) {
  const c = a.campaign ?? {};
  const offer = one(a.offer);
  const s = a.status as string;
  const meta = APP_STATUS[s];
  const [dlg, setDlg] = useState<'' | 'accept' | 'decline'>('');
  const [note, setNote] = useState('');
  const { call, pending } = useRpc();
  const waiting = s === 'OFFER_SENT' || s === 'NEGOTIATION';

  return (
    <Panel className={waiting ? 'border-iris/40' : ''}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_280px] md:items-start">
        <div className="min-w-0">
          <p className="text-xs text-muted">{c.brand_name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <h3 className="text-[16px] font-bold">{c.title}</h3>
            <AppStatus status={s} audience="talent" />
          </div>
          <p className="mt-1 text-[13px] text-muted">Mendaftar {date(a.applied_at)} — periode {period(c.start_date, c.end_date)}</p>
        </div>
        {!meta?.ended && <ApplicationRail status={s} />}
      </div>

      {waiting && offer && (
        <div className="mt-5 rounded-control bg-iris-50 p-5">
          <p className="text-sm font-bold text-iris-700">Job offer</p>
          <dl className="mt-3 grid gap-4 sm:grid-cols-3">
            <div><dt className="text-xs text-muted">Fee</dt><dd className="mt-0.5 text-lg font-bold tabular">{rupiah(offer.fee)}</dd></div>
            <div><dt className="text-xs text-muted">Periode</dt><dd className="mt-0.5 text-sm font-medium">{offer.period_text}</dd></div>
            <div><dt className="text-xs text-muted">Dikirim</dt><dd className="mt-0.5 text-sm font-medium">{date(offer.sent_at)}</dd></div>
          </dl>
          {offer.deliverables && <p className="mt-4 text-sm whitespace-pre-line text-ink-2"><span className="text-xs text-muted">Deliverables</span><br />{offer.deliverables}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => setDlg('accept')}>Saya bersedia</Button>
            <Button variant="secondary" onClick={() => setDlg('decline')}>Tidak bisa ikut</Button>
          </div>
        </div>
      )}

      {['BRIEF_SENT', 'PRODUCT_SHIPPED', 'REVISION_REQUESTED', 'CONTENT_APPROVED', 'READY_TO_PUBLISH', 'PUBLICATION_VERIFIED'].includes(s) && (
        <p className="mt-4 text-sm"><Link href="/content" className="font-semibold text-iris hover:underline">Lanjutkan di Content & Publication</Link></p>
      )}
      {['READY_FOR_PAYMENT', 'PAID'].includes(s) && <p className="mt-4 text-sm"><Link href="/payments" className="font-semibold text-iris hover:underline">Lihat pembayaran</Link></p>}

      <Dialog open={!!dlg} onClose={() => setDlg('')} title={dlg === 'accept' ? 'Konfirmasi kesediaan' : 'Tolak job offer'} width="sm"
        footer={<><Button variant="secondary" onClick={() => setDlg('')}>Batal</Button>
          <Button variant={dlg === 'accept' ? 'primary' : 'danger'} loading={pending} onClick={async () => {
            const r = await call('respond_job_offer', { p_app: a.id, p_accepted: dlg === 'accept', p_note: note }, { success: dlg === 'accept' ? 'Terima kasih! Profil Anda akan diajukan ke Brand.' : 'Job offer ditolak' });
            if (r.ok) setDlg('');
          }}>{dlg === 'accept' ? 'Saya bersedia' : 'Tolak offer'}</Button></>}>
        <p className="text-sm text-ink-2">{dlg === 'accept'
          ? 'Dengan menyetujui, Anda berkomitmen menjalankan deliverables sesuai periode campaign. Tim kami akan mengajukan profil Anda ke Brand.'
          : 'Tim kami akan mencari creator lain untuk campaign ini.'}</p>
        <Field label="Catatan (opsional)" className="mt-4"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={dlg === 'accept' ? 'Ketersediaan jadwal, pertanyaan' : 'Alasan singkat'} /></Field>
      </Dialog>
    </Panel>
  );
}

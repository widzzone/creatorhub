'use client';

import { useState } from 'react';
import { BANKS, PAYMENT_STATUS } from '@/lib/constants';
import { date, rupiah, todayISO, waLink } from '@/lib/format';
import type { PaymentRow } from '@/lib/types';
import { Button, Empty, ExternalA, Field, Input, Notice, Panel, PanelTitle, Select, Textarea, cx } from '../ui/primitives';
import { ActionButton, CopyButton, useRpc } from '../ui/client';
import { Dialog } from '../ui/dialog';
import { PaymentStatus } from '../ui/status';
import { Check, Wallet, X } from '../ui/icons';

const FILTERS = [
  { key: 'open', label: 'Perlu tindakan', match: (r: PaymentRow) => ['READY_FOR_PAYMENT', 'PROCESSING'].includes(r.status) },
  { key: 'pending', label: 'Menunggu verifikasi', match: (r: PaymentRow) => r.status === 'PENDING_VERIFICATION' },
  { key: 'paid', label: 'Dibayar', match: (r: PaymentRow) => r.status === 'PAID' },
  { key: 'all', label: 'Semua', match: () => true },
];

function Check3({ r }: { r: PaymentRow }) {
  const items: [string, boolean][] = [['SOW', r.sow_verified], ['Post', r.publication_verified], ['Insight', r.insight_verified]];
  return (
    <span className="flex gap-1.5">
      {items.map(([l, ok]) => (
        <span key={l} className={cx('inline-flex items-center gap-0.5 text-xs', ok ? 'text-moss' : 'text-faint')}>
          {ok ? <Check className="size-3" /> : <X className="size-3" />}{l}
        </span>
      ))}
    </span>
  );
}

export function AdminPayments({ rows, readOnly }: { rows: PaymentRow[]; readOnly?: boolean }) {
  const [f, setF] = useState(readOnly ? 'all' : 'open');
  const [edit, setEdit] = useState<PaymentRow | null>(null);
  const list = rows.filter(FILTERS.find((x) => x.key === f)!.match);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((x) => (
          <button key={x.key} onClick={() => setF(x.key)} aria-pressed={f === x.key}
            className={cx('h-8 rounded-full px-3.5 text-[13px] font-semibold', f === x.key ? 'bg-ink text-white' : 'text-ink-2 hover:bg-ink/5')}>
            {x.label} <span className="tabular opacity-70">{rows.filter(x.match).length}</span>
          </button>
        ))}
      </div>
      <Panel padded={false}>
        {list.length === 0 ? <Empty icon={<Wallet className="size-5" />} title="Tidak ada pembayaran di sini" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-semibold">Creator</th><th className="px-3 py-3 text-right font-semibold">Jumlah</th>
                <th className="px-3 py-3 font-semibold">Checklist</th>{!readOnly && <th className="px-3 py-3 font-semibold">Rekening</th>}
                <th className="px-3 py-3 font-semibold">Jatuh tempo</th><th className="px-3 py-3 font-semibold">Status</th>{!readOnly && <th className="px-5 py-3" />}
              </tr></thead>
              <tbody className="divide-y divide-line-2">
                {list.map((r) => {
                  const overdue = r.due_date && r.status !== 'PAID' && r.due_date < todayISO();
                  const bankText = r.bank ? `${r.bank.bank_name} ${r.bank.bank_account} a.n. ${r.bank.bank_holder}` : '';
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="px-5 py-3.5"><p className="font-semibold">{r.talent_name}</p><p className="text-xs text-muted">{r.campaign_title}</p></td>
                      <td className="px-3 py-3.5 text-right font-semibold tabular">{rupiah(r.amount)}</td>
                      <td className="px-3 py-3.5"><Check3 r={r} /></td>
                      {!readOnly && (
                        <td className="px-3 py-3.5">
                          {r.bank_complete && r.bank ? (
                            <div className="flex items-start gap-2">
                              <div className="text-xs leading-relaxed"><p className="font-semibold text-ink">{r.bank.bank_name}</p><p className="tabular">{r.bank.bank_account}</p><p className="text-muted">a.n. {r.bank.bank_holder}</p></div>
                              <CopyButton value={bankText} label="" variant="ghost" className="h-7 px-2" />
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <span className="text-xs font-semibold text-rose">Belum lengkap</span>
                              {r.bank_requested_at ? <p className="text-xs text-muted">Diminta {date(r.bank_requested_at)}</p> : (
                                <ActionButton fn="request_bank_details" args={{ p_payment: r.id }} success="Creator diminta melengkapi rekening" variant="quiet" className="-ml-3 h-7">Minta rekening</ActionButton>
                              )}
                              {r.talent_phone && <a className="block text-xs font-semibold text-iris hover:underline" target="_blank" rel="noopener noreferrer"
                                href={waLink(r.talent_phone, `Halo ${r.talent_name}, mohon lengkapi data rekening di menu Payments CreatorHub untuk pembayaran campaign ${r.campaign_title}.`)}>Ingatkan via WhatsApp</a>}
                            </div>
                          )}
                        </td>
                      )}
                      <td className={cx('px-3 py-3.5', overdue ? 'font-semibold text-rose' : 'text-ink-2')}>{date(r.due_date)}{overdue && <span className="block text-xs">Lewat jatuh tempo</span>}</td>
                      <td className="px-3 py-3.5"><PaymentStatus status={r.status} />{r.proof_url && <p className="mt-1 text-xs"><ExternalA href={r.proof_url}>Bukti transfer</ExternalA></p>}</td>
                      {!readOnly && <td className="px-5 py-3.5 text-right">{r.status !== 'PAID' && <Button size="sm" variant={r.status === 'READY_FOR_PAYMENT' || r.status === 'PROCESSING' ? 'primary' : 'secondary'} onClick={() => setEdit(r)}>Perbarui</Button>}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {edit && <PaymentDialog key={edit.id} r={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function PaymentDialog({ r, onClose }: { r: PaymentRow; onClose: () => void }) {
  const [v, setV] = useState({ status: r.status === 'READY_FOR_PAYMENT' ? 'PROCESSING' : r.status === 'PROCESSING' ? 'PAID' : r.status, proof_url: r.proof_url, scheduled_date: r.scheduled_date ?? '', amount: String(r.amount), note: r.note, invoice_url: r.invoice_url });
  const { call, pending } = useRpc();
  const blocked = ['PROCESSING', 'PAID'].includes(v.status) && !r.bank_complete;
  const notEligible = ['PROCESSING', 'PAID'].includes(v.status) && !r.eligible_at;
  return (
    <Dialog open onClose={onClose} title={`Pembayaran ${r.talent_name}`} description={r.campaign_title}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button loading={pending} disabled={blocked || notEligible || (v.status === 'PAID' && !v.proof_url.trim())}
          onClick={async () => { const x = await call('update_payment', { p_payment: r.id, p: v }, { success: v.status === 'PAID' ? 'Ditandai dibayar' : 'Pembayaran diperbarui' }); if (x.ok) onClose(); }}>
          {v.status === 'PAID' ? 'Tandai dibayar' : 'Simpan'}
        </Button></>}>
      <div className="space-y-4">
        {blocked && <Notice tone="rose" title="Rekening creator belum lengkap">Minta creator melengkapi nama bank, nomor rekening, dan pemilik rekening terlebih dahulu.</Notice>}
        {notEligible && !blocked && <Notice tone="amber" title="Belum eligible">Publikasi dan insight harus terverifikasi sebelum pembayaran diproses.</Notice>}
        {r.bank_complete && r.bank && (
          <div className="flex items-center justify-between gap-3 rounded-control bg-paper px-4 py-3">
            <div className="text-sm"><p className="font-semibold">{r.bank.bank_name} — <span className="tabular">{r.bank.bank_account}</span></p><p className="text-xs text-muted">a.n. {r.bank.bank_holder}</p></div>
            <CopyButton value={r.bank.bank_account} label="Salin no. rekening" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <Select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}>
              {Object.entries(PAYMENT_STATUS).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}
            </Select>
          </Field>
          <Field label="Jumlah (Rp)"><Input type="number" min={0} value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></Field>
        </div>
        <Field label="Tanggal transfer terjadwal" hint={r.due_date ? `Jatuh tempo ${date(r.due_date)}` : undefined}><Input type="date" value={v.scheduled_date} onChange={(e) => setV({ ...v, scheduled_date: e.target.value })} /></Field>
        <Field label="Link bukti transfer" required={v.status === 'PAID'} hint="Wajib untuk status Dibayar. Simpan di Drive organisasi lalu tempel link-nya.">
          <Input type="url" value={v.proof_url} onChange={(e) => setV({ ...v, proof_url: e.target.value })} placeholder="https://drive.google.com/…" />
        </Field>
        <Field label="Link invoice" hint="Opsional"><Input type="url" value={v.invoice_url} onChange={(e) => setV({ ...v, invoice_url: e.target.value })} /></Field>
        <Field label="Catatan"><Textarea rows={2} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></Field>
      </div>
    </Dialog>
  );
}

export function TalentPayments({ rows, bank }: { rows: PaymentRow[]; bank: { bank_name: string; bank_account: string; bank_holder: string } }) {
  const complete = !!(bank.bank_name && bank.bank_account && bank.bank_holder);
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
      <Panel padded={false}>
        {rows.length === 0 ? <Empty icon={<Wallet className="size-5" />} title="Belum ada pembayaran" description="Pembayaran tercatat setelah Brand menyetujui Anda pada sebuah campaign." /> : (
          <ul className="divide-y divide-line-2">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.campaign_title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {r.status === 'PAID' ? `Dibayar ${date(r.paid_at)}` : r.due_date ? `Jatuh tempo ${date(r.due_date)}` : 'Menunggu publikasi dan insight terverifikasi'}
                  </p>
                  {r.proof_url && <p className="mt-1 text-xs"><ExternalA href={r.proof_url}>Lihat bukti transfer</ExternalA></p>}
                </div>
                <p className="font-bold tabular">{rupiah(r.amount)}</p>
                <PaymentStatus status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <BankForm bank={bank} complete={complete} />
    </div>
  );
}

export function BankForm({ bank, complete }: { bank: { bank_name: string; bank_account: string; bank_holder: string }; complete: boolean }) {
  const [v, setV] = useState({ ...bank, other: bank.bank_name && !BANKS.includes(bank.bank_name) ? bank.bank_name : '' });
  const isOther = v.bank_name === 'Lainnya' || (!!v.bank_name && !BANKS.includes(v.bank_name));
  const { call, pending } = useRpc();
  return (
    <Panel className="h-fit">
      <PanelTitle title="Rekening pembayaran" description="Hanya terlihat oleh Anda dan admin keuangan. Brand tidak dapat melihatnya." />
      {!complete && <Notice tone="amber" className="mb-4">Lengkapi rekening agar pembayaran dapat diproses.</Notice>}
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        await call('save_bank_details', { p_bank_name: isOther ? v.other : v.bank_name, p_bank_account: v.bank_account, p_bank_holder: v.bank_holder }, { success: 'Rekening disimpan' });
      }}>
        <Field label="Bank">
          <Select value={isOther ? 'Lainnya' : v.bank_name} onChange={(e) => setV({ ...v, bank_name: e.target.value })}>
            <option value="">Pilih bank</option>
            {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
        </Field>
        {isOther && <Field label="Nama bank"><Input value={v.other} onChange={(e) => setV({ ...v, other: e.target.value })} /></Field>}
        <Field label="Nomor rekening"><Input inputMode="numeric" value={v.bank_account} onChange={(e) => setV({ ...v, bank_account: e.target.value })} /></Field>
        <Field label="Nama pemilik rekening" hint="Sesuai buku tabungan."><Input value={v.bank_holder} onChange={(e) => setV({ ...v, bank_holder: e.target.value })} /></Field>
        <Button type="submit" loading={pending}>Simpan rekening</Button>
      </form>
    </Panel>
  );
}

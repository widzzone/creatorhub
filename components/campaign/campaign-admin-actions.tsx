'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CAMPAIGN_STATUS } from '@/lib/constants';
import { Button, Field, Select } from '../ui/primitives';
import { Dialog } from '../ui/dialog';
import { useRpc } from '../ui/client';
import { Settings } from '../ui/icons';

const MANUAL = ['DRAFT', 'OPEN', 'SCREENING', 'OFFER_CONFIRMATION', 'CLIENT_APPROVAL', 'PRODUCTION', 'PUBLISHING', 'REPORTING', 'PAYMENT', 'READY_TO_CLOSE', 'CANCELLED'];

export function CampaignAdminActions({ campaignId, status, title }: { campaignId: string; status: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState(false);
  const [st, setSt] = useState(status);
  const [confirmText, setConfirmText] = useState('');
  const { call, pending } = useRpc();
  const router = useRouter();
  if (status === 'CLOSED') return null;

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} aria-label="Pengaturan campaign"><Settings className="size-4" /></Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Pengaturan campaign" width="sm"
        footer={<>
          <Button variant="danger" className="mr-auto" onClick={() => { setOpen(false); setDel(true); }}>Hapus campaign</Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
          <Button loading={pending} disabled={st === status} onClick={async () => {
            const r = await call('update_campaign_status', { p_campaign: campaignId, p_status: st }, { success: 'Status campaign diperbarui' });
            if (r.ok) setOpen(false);
          }}>Simpan</Button>
        </>}>
        <Field label="Status workflow" hint="Biasanya bergerak otomatis. Ubah manual hanya untuk koreksi atau pembatalan. Untuk menutup campaign, gunakan halaman Report.">
          <Select value={st} onChange={(e) => setSt(e.target.value)}>
            {MANUAL.map((s) => <option key={s} value={s}>{CAMPAIGN_STATUS[s].label}</option>)}
          </Select>
        </Field>
      </Dialog>
      <Dialog open={del} onClose={() => setDel(false)} title="Hapus campaign?" width="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setDel(false)}>Batal</Button>
          <Button variant="danger" loading={pending} disabled={confirmText !== 'HAPUS'} onClick={async () => {
            const r = await call('delete_campaign', { p_campaign: campaignId }, { success: 'Campaign dihapus', refresh: false });
            if (r.ok) router.replace('/campaigns');
          }}>Hapus permanen</Button>
        </>}>
        <p className="text-sm leading-relaxed text-ink-2">
          Semua pendaftar, jawaban, draft, publikasi, insight, dan pembayaran untuk <b>{title}</b> ikut terhapus. Tindakan ini tidak dapat dibatalkan.
        </p>
        <Field label="Ketik HAPUS untuk konfirmasi" className="mt-4"><input className="h-10 rounded-control border border-line px-3 text-sm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} /></Field>
      </Dialog>
    </>
  );
}

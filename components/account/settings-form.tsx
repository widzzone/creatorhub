'use client';

import { useState } from 'react';
import { dateTime } from '@/lib/format';
import { Button, Checkbox, Field, Input, Panel, PanelTitle } from '../ui/primitives';
import { useRpc } from '../ui/client';

export function SettingsForm({ settings, audit }: { settings: { key: string; value: string; description: string }[]; audit: any[] }) {
  const get = (k: string) => settings.find((s) => s.key === k)?.value ?? '';
  const [v, setV] = useState({
    PAYMENT_TERM_DAYS: get('PAYMENT_TERM_DAYS'),
    ALLOW_TALENT_REGISTRATION: get('ALLOW_TALENT_REGISTRATION') || 'TRUE',
    REGISTRATION_ADMIN_NAME: get('REGISTRATION_ADMIN_NAME'),
    REGISTRATION_ADMIN_WA: get('REGISTRATION_ADMIN_WA'),
    ORGANIZATION_NAME: get('ORGANIZATION_NAME'),
  });
  const { call, pending } = useRpc();
  return (
    <div className="space-y-6">
      <Panel>
        <PanelTitle title="Aplikasi" />
        <form className="space-y-5" onSubmit={async (e) => { e.preventDefault(); await call('update_settings', { p: v }, { success: 'Pengaturan disimpan' }); }}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nama organisasi" hint="Tampil di halaman pendaftaran."><Input value={v.ORGANIZATION_NAME} onChange={(e) => setV({ ...v, ORGANIZATION_NAME: e.target.value })} /></Field>
            <Field label="Jangka pembayaran (hari)" hint="Jatuh tempo dihitung sejak insight terverifikasi."><Input type="number" min={0} max={120} value={v.PAYMENT_TERM_DAYS} onChange={(e) => setV({ ...v, PAYMENT_TERM_DAYS: e.target.value })} /></Field>
            <Field label="Nama admin registrasi" hint="Dihubungi creator setelah mendaftar."><Input value={v.REGISTRATION_ADMIN_NAME} onChange={(e) => setV({ ...v, REGISTRATION_ADMIN_NAME: e.target.value })} /></Field>
            <Field label="WhatsApp admin registrasi" hint="Untuk tombol konfirmasi WhatsApp."><Input type="tel" value={v.REGISTRATION_ADMIN_WA} onChange={(e) => setV({ ...v, REGISTRATION_ADMIN_WA: e.target.value })} placeholder="08xx" /></Field>
          </div>
          <Checkbox label={<><b className="text-ink">Izinkan pendaftaran creator</b><span className="block text-xs text-muted">Bila dimatikan, semua link recruitment menolak pendaftar baru.</span></>}
            checked={v.ALLOW_TALENT_REGISTRATION === 'TRUE'} onChange={(e) => setV({ ...v, ALLOW_TALENT_REGISTRATION: e.target.checked ? 'TRUE' : 'FALSE' })} />
          <Button type="submit" loading={pending}>Simpan pengaturan</Button>
        </form>
      </Panel>
      <Panel padded={false}>
        <div className="px-5 pt-5"><PanelTitle title="Audit log" description="40 aktivitas terakhir." /></div>
        <ul className="divide-y divide-line-2 border-t border-line">
          {audit.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
              <span className="min-w-0 flex-1"><b className="font-semibold">{a.actor?.full_name ?? 'Sistem'}</b> <span className="text-ink-2">{a.action.toLowerCase().replace(/_/g, ' ')}</span> <span className="text-muted">({a.entity_type.toLowerCase()})</span></span>
              <span className="text-xs text-muted">{dateTime(a.created_at)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

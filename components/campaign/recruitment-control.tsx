'use client';

import { useState } from 'react';
import type { Availability } from '@/lib/types';
import { recruitmentUrl } from '@/lib/format';
import { Button, Field, Input, cx } from '../ui/primitives';
import { CopyButton, useRpc } from '../ui/client';
import { ExternalLink } from '../ui/icons';

export function RecruitmentControl({
  campaignId,
  code,
  status,
  openDate,
  closeDate,
  target,
  availability,
  disabled,
}: {
  campaignId: string;
  code: string;
  status: 'OPEN' | 'CLOSED';
  openDate: string | null;
  closeDate: string | null;
  target: number;
  availability: Availability;
  disabled?: boolean;
}) {
  const [od, setOd] = useState(openDate ?? '');
  const [cd, setCd] = useState(closeDate ?? '');
  const [tg, setTg] = useState(target ? String(target) : '');
  const { call, pending } = useRpc();
  const url = recruitmentUrl(code);
  const dirty = od !== (openDate ?? '') || cd !== (closeDate ?? '') || tg !== (target ? String(target) : '');

  const save = (st: 'OPEN' | 'CLOSED') =>
    call('update_recruitment', { p_campaign: campaignId, p_status: st, p_open_date: od || null, p_close_date: cd || null, p_target: Number(tg || 0) },
      { success: st === 'OPEN' ? (status === 'OPEN' ? 'Pengaturan recruitment disimpan' : 'Recruitment dibuka') : 'Recruitment ditutup' });

  return (
    <div className="space-y-5">
      <div className={cx('rounded-control px-4 py-3',
        availability.ok ? 'bg-moss-50 text-moss' : availability.status === 'SCHEDULED' ? 'bg-sky-50 text-sky' : 'bg-ink/[0.05] text-ink-2')}>
        <p className="text-sm font-semibold">{availability.ok ? 'Form pendaftaran menerima pendaftar' : availability.message}</p>
        <p className="mt-0.5 text-xs opacity-80 tabular">
          {availability.count ?? 0} pendaftar{availability.target ? ` dari target ${availability.target}` : ''}
          {availability.ok && closeDate ? ` — ditutup setelah ${new Date(closeDate + 'T00:00:00+07:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}` : ''}
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Link pendaftaran</p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-control border border-line bg-paper px-3 py-2 text-[13px] text-ink-2">{url}</code>
          <CopyButton value={url} label="Salin" />
          <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-md p-2 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Buka halaman pendaftaran">
            <ExternalLink className="size-4" />
          </a>
        </div>
      </div>

      {!disabled && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Dibuka mulai" hint="Opsional"><Input type="date" value={od} onChange={(e) => setOd(e.target.value)} /></Field>
            <Field label="Ditutup setelah" hint="Tanggal ini masih bisa daftar"><Input type="date" value={cd} onChange={(e) => setCd(e.target.value)} /></Field>
            <Field label="Target pendaftar" hint="Kosongkan bila tanpa batas. Berbeda dari jumlah creator yang dibutuhkan." className="col-span-2"><Input type="number" min={0} value={tg} onChange={(e) => setTg(e.target.value)} /></Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {status === 'OPEN' ? (
              <>
                {dirty && <Button size="sm" loading={pending} onClick={() => save('OPEN')}>Simpan pengaturan</Button>}
                <Button size="sm" variant="secondary" loading={pending && !dirty} onClick={() => save('CLOSED')}>Tutup recruitment</Button>
              </>
            ) : (
              <Button size="sm" loading={pending} onClick={() => save('OPEN')}>Buka recruitment</Button>
            )}
          </div>
          <p className="text-xs leading-relaxed text-muted">Recruitment tetap mengikuti pengaturan ini selama produksi berjalan, dan otomatis tertutup saat campaign ditutup.</p>
        </>
      )}
    </div>
  );
}

export function BroadcastBox({ message, code, title }: { message: string; code: string; title: string }) {
  const url = recruitmentUrl(code);
  const text = `${message?.trim() || `Halo creator! Kami sedang mencari creator untuk campaign ${title}.`}\n\nDaftar di sini: ${url}`;
  return (
    <div>
      <pre className="max-h-56 overflow-auto rounded-control bg-paper p-4 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2 scrollbar-thin">{text}</pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton value={text} label="Salin pesan" />
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-2 rounded-control border border-line px-3 text-[13px] font-semibold hover:bg-paper">
          Bagikan ke WhatsApp
        </a>
      </div>
    </div>
  );
}


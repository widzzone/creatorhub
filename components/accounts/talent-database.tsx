'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CATEGORIES, PLATFORMS } from '@/lib/constants';
import { compactNumber, date, platformLabel, waLink } from '@/lib/format';
import { resetUserPassword } from '@/lib/actions/accounts';
import { Badge, Button, Empty, ExternalA, Input, KeyValue, Notice, Panel, Select, Tag } from '../ui/primitives';
import { ActionButton, CopyButton } from '../ui/client';
import { Dialog } from '../ui/dialog';
import { AppStatus } from '../ui/status';
import { Contact, Search } from '../ui/icons';

const VER: Record<string, { label: string; tone: 'moss' | 'neutral' | 'rose' }> = {
  VERIFIED: { label: 'Terverifikasi', tone: 'moss' }, PENDING: { label: 'Belum diverifikasi', tone: 'neutral' }, REJECTED: { label: 'Ditolak', tone: 'rose' },
};

export function TalentDatabase({ talents, history }: { talents: any[]; history: Record<string, { title: string; status: string }[]> }) {
  const [q, setQ] = useState('');
  const [platform, setPlatform] = useState('');
  const [category, setCategory] = useState('');
  const [ver, setVer] = useState('');
  const [openId, setOpenId] = useState('');
  const term = q.trim().toLowerCase();
  const list = useMemo(() => talents.filter((t) =>
    (!term || `${t.display_name} ${t.profile.email} ${t.instagram} ${t.tiktok} ${t.youtube}`.toLowerCase().includes(term)) &&
    (!platform || t.platforms.includes(platform)) && (!category || t.categories.includes(category)) && (!ver || t.verification_status === ver)), [talents, term, platform, category, ver]);
  const open = talents.find((t) => t.user_id === openId);

  const csv = () => {
    const head = ['Nama', 'Email', 'WhatsApp', 'Domisili', 'Platform', 'Kategori', 'Instagram', 'Followers IG', 'TikTok', 'Followers TikTok', 'YouTube', 'Subscribers', 'ER', 'Verifikasi', 'Kelengkapan'];
    const rows = list.map((t) => [t.display_name, t.profile.email, t.profile.phone, t.city, t.platforms.join('|'), t.categories.join('|'), t.instagram, t.followers_instagram, t.tiktok, t.followers_tiktok, t.youtube, t.followers_youtube, t.engagement_rate, t.verification_status, t.profile_completeness]);
    const body = [head, ...rows].map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }));
    a.download = `talent-database-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, email, atau username" className="pl-9" />
        </div>
        <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="lg:w-40"><option value="">Semua platform</option>{PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="lg:w-48"><option value="">Semua kategori</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
        <Select value={ver} onChange={(e) => setVer(e.target.value)} className="lg:w-48"><option value="">Semua verifikasi</option>{Object.entries(VER).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
        <Button variant="secondary" className="lg:ml-auto" onClick={csv}>Export CSV</Button>
      </div>
      <Panel padded={false}>
        {list.length === 0 ? <Empty icon={<Contact className="size-5" />} title={talents.length ? 'Tidak ada creator yang cocok' : 'Belum ada creator'} description={talents.length ? 'Ubah filter pencarian.' : 'Creator tercatat otomatis saat mendaftar lewat link recruitment.'} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-semibold">Creator</th><th className="px-3 py-3 font-semibold">Platform</th><th className="px-3 py-3 font-semibold">Kategori</th>
                <th className="px-3 py-3 text-right font-semibold">Followers</th><th className="px-3 py-3 text-right font-semibold">ER</th>
                <th className="px-3 py-3 text-right font-semibold">Campaign</th><th className="px-5 py-3 font-semibold">Verifikasi</th>
              </tr></thead>
              <tbody className="divide-y divide-line-2">
                {list.map((t) => (
                  <tr key={t.user_id} onClick={() => setOpenId(t.user_id)} className="cursor-pointer hover:bg-paper/70">
                    <td className="px-5 py-3"><p className="font-semibold">{t.display_name || t.profile.full_name}</p><p className="text-xs text-muted">{t.city || '—'} — {t.profile.email}</p></td>
                    <td className="px-3 py-3 text-ink-2">{t.platforms.map(platformLabel).join(', ') || '—'}</td>
                    <td className="max-w-[200px] truncate px-3 py-3 text-ink-2">{t.categories.join(', ') || '—'}</td>
                    <td className="px-3 py-3 text-right tabular">{compactNumber(Math.max(t.followers_instagram, t.followers_tiktok, t.followers_youtube))}</td>
                    <td className="px-3 py-3 text-right tabular">{t.engagement_rate ? `${t.engagement_rate}%` : '—'}</td>
                    <td className="px-3 py-3 text-right tabular">{history[t.user_id]?.length ?? 0}</td>
                    <td className="px-5 py-3"><Badge tone={VER[t.verification_status].tone}>{VER[t.verification_status].label}</Badge>{t.profile.status !== 'ACTIVE' && <Badge className="ml-1" tone="rose">Nonaktif</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="mt-3 text-xs text-muted tabular">{list.length} dari {talents.length} creator</p>
      {open && <TalentSheet t={open} history={history[open.user_id] ?? []} onClose={() => setOpenId('')} />}
    </>
  );
}

function TalentSheet({ t, history, onClose }: { t: any; history: { title: string; status: string }[]; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [pw, setPw] = useState('');
  return (
    <Dialog open onClose={onClose} variant="sheet" title={t.display_name || t.profile.full_name} description={t.profile.email}>
      <div className="space-y-7">
        <div className="flex flex-wrap gap-2">
          {t.verification_status !== 'VERIFIED' && <ActionButton variant="primary" size="md" fn="set_talent_verification" args={{ p_user: t.user_id, p_status: 'VERIFIED' }} success="Creator terverifikasi">Verifikasi profil</ActionButton>}
          {t.verification_status === 'VERIFIED' && <ActionButton size="md" fn="set_talent_verification" args={{ p_user: t.user_id, p_status: 'PENDING' }} success="Verifikasi dibatalkan">Batalkan verifikasi</ActionButton>}
          <ActionButton size="md" fn="set_user_status" args={{ p_user: t.user_id, p_status: t.profile.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }} success="Status akun diperbarui"
            variant={t.profile.status === 'ACTIVE' ? 'danger' : 'secondary'}
            confirm={t.profile.status === 'ACTIVE' ? { title: 'Nonaktifkan akun creator?', body: 'Creator tidak dapat masuk dan tidak bisa mendaftar campaign baru.', cta: 'Nonaktifkan', danger: true } : undefined}>
            {t.profile.status === 'ACTIVE' ? 'Nonaktifkan akun' : 'Aktifkan akun'}
          </ActionButton>
          <Button variant="ghost" loading={pending} onClick={() => start(async () => { const r = await resetUserPassword(t.user_id); if (!r.ok) return void toast.error(r.message); setPw(r.tempPassword!); })}>Reset password</Button>
          {t.profile.phone && <a href={waLink(t.profile.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center px-3 text-sm font-semibold text-iris hover:underline">WhatsApp</a>}
        </div>
        {pw && (
          <Notice tone="amber" title="Password sementara">
            <span className="tabular font-semibold">{pw}</span> — kirim ke creator lewat kanal pribadi.
            <div className="mt-2"><CopyButton value={pw} label="Salin" /></div>
          </Notice>
        )}
        <KeyValue items={[
          { label: 'WhatsApp', value: t.profile.phone ? `+${t.profile.phone}` : '' },
          { label: 'Domisili', value: t.city },
          { label: 'Gender', value: t.gender === 'FEMALE' ? 'Perempuan' : t.gender === 'MALE' ? 'Laki-laki' : '' },
          { label: 'Engagement rate', value: t.engagement_rate ? `${t.engagement_rate}%` : '' },
          { label: 'Instagram', value: t.instagram && `${t.instagram} — ${compactNumber(t.followers_instagram)}` },
          { label: 'TikTok', value: t.tiktok && `${t.tiktok} — ${compactNumber(t.followers_tiktok)}` },
          { label: 'YouTube', value: t.youtube && `${t.youtube} — ${compactNumber(t.followers_youtube)}` },
          { label: 'Portfolio', value: t.portfolio_url && <ExternalA href={t.portfolio_url}>{t.portfolio_url}</ExternalA> },
          { label: 'Kategori', value: t.categories.length ? <span className="flex flex-wrap gap-1">{t.categories.map((c: string) => <Tag key={c}>{c}</Tag>)}</span> : '' },
          { label: 'Kelengkapan profil', value: `${t.profile_completeness}%` },
          { label: 'Terdaftar', value: date(t.profile.created_at) },
          { label: 'Login terakhir', value: date(t.profile.last_login) },
        ]} />
        {t.bio && <p className="text-sm leading-relaxed text-ink-2">{t.bio}</p>}
        <section>
          <h3 className="mb-3 text-sm font-bold">Riwayat campaign</h3>
          {history.length === 0 ? <p className="text-sm text-muted">Belum ada.</p> : (
            <ul className="space-y-2">{history.map((h, i) => <li key={i} className="flex items-center justify-between gap-3 text-sm"><span className="truncate">{h.title}</span><AppStatus status={h.status} /></li>)}</ul>
          )}
        </section>
      </div>
    </Dialog>
  );
}

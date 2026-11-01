'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { APP_STATUS, PIPELINE_GROUPS, RECOMMENDATION } from '@/lib/constants';
import { compactNumber, platformLabel, relative } from '@/lib/format';
import type { PipelineRow } from '@/lib/types';
import { Empty, Input, Panel, Select, cx } from '../ui/primitives';
import { AppStatus, ReasonList, Recommendation } from '../ui/status';
import { Search, Users } from '../ui/icons';
import { CandidateSheet } from './candidate-sheet';

export function PipelineBoard({
  rows,
  campaigns,
  role,
  initial,
}: {
  rows: PipelineRow[];
  campaigns: any[];
  role: 'ADMIN' | 'BRAND';
  initial: { campaign: string; group: string; app: string; q: string };
}) {
  const pathname = usePathname();
  const [campaign, setCampaign] = useState(initial.campaign);
  const [group, setGroup] = useState(initial.group);
  const [q, setQ] = useState(initial.q);
  const [rec, setRec] = useState('');
  const [openId, setOpenId] = useState(initial.app);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (campaign) sp.set('campaign', campaign);
    if (group) sp.set('group', group);
    if (openId) sp.set('app', openId);
    window.history.replaceState(null, '', `${pathname}?${sp.toString()}`);
  }, [campaign, group, openId, pathname]);

  const scoped = rows.filter((r) => !campaign || r.campaign_id === campaign);
  const groups = PIPELINE_GROUPS.map((g) => ({ ...g, n: scoped.filter((r) => g.statuses.includes(r.status)).length }));
  const term = q.trim().toLowerCase();
  const list = useMemo(
    () =>
      scoped.filter((r) =>
        (group === 'all' || PIPELINE_GROUPS.find((g) => g.key === group)?.statuses.includes(r.status)) &&
        (!rec || r.recommendation === rec) &&
        (!term || `${r.talent_name} ${r.email} ${r.instagram} ${r.tiktok}`.toLowerCase().includes(term)),
      ),
    [scoped, group, rec, term],
  );
  const open = rows.find((r) => r.id === openId);
  const showCampaignCol = !campaign;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Select value={campaign} onChange={(e) => setCampaign(e.target.value)} className="lg:w-72">
          <option value="">Semua campaign</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </Select>
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, email, atau username" className="pl-9" />
        </div>
        <Select value={rec} onChange={(e) => setRec(e.target.value)} className="lg:w-60" aria-label="Filter recommendation">
          <option value="">Semua recommendation</option>
          {Object.entries(RECOMMENDATION).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>

      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line scrollbar-thin" aria-label="Tahap kandidat">
        {[...groups, { key: 'all', label: 'Semua', n: scoped.length, statuses: [] }].map((g) => (
          <button key={g.key} onClick={() => setGroup(g.key)} aria-current={group === g.key ? 'page' : undefined}
            className={cx('-mb-px flex items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-semibold whitespace-nowrap',
              group === g.key ? 'border-iris text-ink' : 'border-transparent text-muted hover:text-ink')}>
            {g.label}
            <span className={cx('rounded-full px-1.5 text-xs tabular', group === g.key ? 'bg-iris text-white' : 'bg-ink/[0.07] text-ink-2')}>{g.n}</span>
          </button>
        ))}
      </nav>

      <Panel padded={false}>
        {list.length === 0 ? (
          <Empty icon={<Users className="size-5" />} title="Tidak ada kandidat pada tahap ini"
            description={scoped.length === 0 ? 'Bagikan link recruitment untuk mulai menerima pendaftar.' : 'Coba tahap lain atau ubah filter.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3 font-semibold">Creator</th>
                  {showCampaignCol && <th className="px-3 py-3 font-semibold">Campaign</th>}
                  <th className="px-3 py-3 font-semibold">Recommendation</th>
                  <th className="px-3 py-3 font-semibold">Alasan</th>
                  <th className="px-3 py-3 text-right font-semibold">Followers</th>
                  <th className="px-3 py-3 text-right font-semibold">ER</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-2">
                {list.map((r) => (
                  <tr key={r.id} onClick={() => setOpenId(r.id)} className={cx('cursor-pointer hover:bg-paper/70', openId === r.id && 'bg-iris-50/50')}>
                    <td className="px-5 py-3.5">
                      <button className="text-left font-semibold hover:underline" onClick={(e) => { e.stopPropagation(); setOpenId(r.id); }}>{r.talent_name}</button>
                      <p className="mt-0.5 text-xs text-muted">{r.city || '—'} — {r.platforms.map(platformLabel).join(', ') || 'platform belum diisi'}</p>
                    </td>
                    {showCampaignCol && <td className="max-w-[200px] truncate px-3 py-3.5 text-ink-2">{r.campaign_title}</td>}
                    <td className="px-3 py-3.5"><Recommendation value={r.recommendation} /></td>
                    <td className="max-w-[300px] px-3 py-3.5"><ReasonList reasons={r.reasons.some((x) => x.ok) ? r.reasons.filter((x) => x.ok) : r.reasons} limit={3} compact /></td>
                    <td className="px-3 py-3.5 text-right tabular">{compactNumber(r.followers)}</td>
                    <td className="px-3 py-3.5 text-right tabular">{r.engagement_rate ? `${r.engagement_rate}%` : '—'}</td>
                    <td className="px-5 py-3.5">
                      <AppStatus status={r.status} />
                      <p className="mt-1 text-xs text-muted">{role === 'ADMIN' && APP_STATUS[r.status]?.next ? APP_STATUS[r.status].next : relative(r.updated_at)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="mt-3 text-xs text-muted">Recommendation: Recommended (kecocokan tinggi), Consider (sebagian sesuai), Low match. Creator tidak melihat penilaian ini.</p>

      {open && (
        <CandidateSheet key={open.id} row={open} role={role} campaign={campaigns.find((c) => c.id === open.campaign_id)} onClose={() => setOpenId('')} />
      )}
    </>
  );
}

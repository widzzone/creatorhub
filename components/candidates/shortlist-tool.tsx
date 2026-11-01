'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { compactNumber, platformLabel } from '@/lib/format';
import { Button, Empty, Field, Input, Panel, Select, Textarea, cx } from '../ui/primitives';
import { cleanError, useRpc } from '../ui/client';
import { Dialog } from '../ui/dialog';
import { ReasonList, Recommendation } from '../ui/status';
import { ListChecks, LoaderCircle } from '../ui/icons';

const LEVELS = [
  { value: '0', label: 'Semua' },
  { value: '50', label: 'Consider ke atas' },
  { value: '70', label: 'Recommended saja' },
];

export function ShortlistTool({ campaigns, initialCampaign }: { campaigns: { id: string; title: string; creator_needed: number }[]; initialCampaign: string }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(initialCampaign);
  const [minScore, setMinScore] = useState('50');
  const [minFollowers, setMinFollowers] = useState('');
  const [minEr, setMinEr] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState('');
  const { call, pending } = useRpc();

  const preview = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    const { data, error } = await createClient().rpc('shortlist_preview', {
      p_campaign: campaign, p_min_score: Number(minScore), p_min_followers: Number(minFollowers || 0), p_min_er: Number(minEr || 0), p_max: 100,
    });
    setLoading(false);
    if (error) return toast.error(cleanError(error.message));
    setData(data);
    setSelected([]);
  }, [campaign, minScore, minFollowers, minEr]);

  useEffect(() => { preview(); }, [campaign]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!campaigns.length) return <Panel><Empty icon={<ListChecks className="size-5" />} title="Tidak ada campaign aktif" description="Shortlist tersedia untuk campaign yang sedang berjalan." /></Panel>;

  const cands: any[] = data?.candidates ?? [];
  const target = data?.summary?.target ?? 1;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
      <Panel className="h-fit lg:sticky lg:top-6">
        <div className="space-y-4">
          <Field label="Campaign">
            <Select value={campaign} onChange={(e) => setCampaign(e.target.value)}>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
          <Field label="Minimum recommendation">
            <Select value={minScore} onChange={(e) => setMinScore(e.target.value)}>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</Select>
          </Field>
          <Field label="Minimum followers"><Input type="number" min={0} value={minFollowers} onChange={(e) => setMinFollowers(e.target.value)} placeholder="0" /></Field>
          <Field label="Minimum ER (%)"><Input type="number" min={0} step="0.1" value={minEr} onChange={(e) => setMinEr(e.target.value)} placeholder="0" /></Field>
          <Button className="w-full" variant="secondary" loading={loading} onClick={preview}>Terapkan filter</Button>
        </div>
      </Panel>

      <div>
        {data && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-2 tabular">
              <b>{data.summary.eligible}</b> dari {data.summary.total} pendaftar lolos filter. Target {target} creator.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected(cands.slice(0, target).map((c) => c.id))}>Pilih {Math.min(target, cands.length)} teratas</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(cands.map((c) => c.id))}>Pilih semua</Button>
              {selected.length > 0 && <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Kosongkan</Button>}
            </div>
          </div>
        )}
        <Panel padded={false}>
          {loading && !data ? (
            <div className="flex justify-center py-16 text-muted"><LoaderCircle className="size-5 animate-spin" /></div>
          ) : cands.length === 0 ? (
            <Empty icon={<ListChecks className="size-5" />} title="Tidak ada kandidat yang lolos filter" description="Turunkan ambang minimum atau tunggu pendaftar baru." />
          ) : (
            <ul className="divide-y divide-line-2">
              {cands.map((c) => {
                const on = selected.includes(c.id);
                return (
                  <li key={c.id}>
                    <label className={cx('flex cursor-pointer gap-4 px-5 py-4', on ? 'bg-iris-50/60' : 'hover:bg-paper/70')}>
                      <input type="checkbox" className="mt-1 size-4 accent-iris" checked={on} onChange={() => toggle(c.id)} />
                      <span className="w-6 pt-0.5 text-sm text-faint tabular">{c.rank}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{c.talent_name}</span>
                          <Recommendation value={c.recommendation} />
                          {c.suggested && <span className="text-xs font-medium text-iris">Dalam target</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted tabular">
                          {c.city || '—'} — {(c.platforms ?? []).map(platformLabel).join(', ')} — {compactNumber(c.followers)} followers — ER {c.engagement_rate || 0}%
                        </p>
                        <div className="mt-2"><ReasonList reasons={c.reasons} limit={6} compact /></div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        {selected.length > 0 && (
          <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-3 rounded-panel border border-line bg-ink px-5 py-3 text-white">
            <span className="text-sm tabular">{selected.length} kandidat dipilih</span>
            <Button size="sm" className="bg-white text-ink hover:bg-white/90" onClick={() => setConfirm(true)}>Shortlist kandidat terpilih</Button>
          </div>
        )}
      </div>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title={`Shortlist ${selected.length} kandidat?`} width="sm"
        footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Batal</Button>
          <Button loading={pending} onClick={async () => {
            const r = await call<number>('apply_shortlist', { p_campaign: campaign, p_apps: selected, p_note: note }, { success: 'Kandidat masuk shortlist' });
            if (r.ok) { setConfirm(false); router.push(`/candidates?campaign=${campaign}&group=offer`); }
          }}>Shortlist</Button></>}>
        <p className="text-sm text-ink-2">Creator mendapat notifikasi bahwa mereka masuk shortlist. Langkah berikutnya adalah mengirim job offer.</p>
        <Field label="Catatan internal (opsional)" className="mt-4"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Dialog>
    </div>
  );
}

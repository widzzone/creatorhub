'use client';

import { useState } from 'react';
import { compactNumber, date, dateTime, platformLabel, relative } from '@/lib/format';
import { Button, Empty, ExternalA, Field, Notice, Panel, Textarea } from '../ui/primitives';
import { useRpc } from '../ui/client';
import { Dialog } from '../ui/dialog';
import { ReviewStatus } from '../ui/status';
import { CircleCheck, ExternalLink } from '../ui/icons';

type Decision = { kind: 'draft' | 'publication' | 'insight'; id: string; approve: boolean; title: string } | null;

export function ReviewQueue({ tab, drafts, publications, insights, history }: {
  tab: string; drafts: any[]; publications: any[]; insights: any[];
  history: { drafts: any[]; publications: any[]; insights: any[] };
}) {
  const [decision, setDecision] = useState<Decision>(null);
  const [note, setNote] = useState('');
  const { call, pending } = useRpc();

  const submit = async () => {
    if (!decision) return;
    const { kind, id, approve } = decision;
    const r =
      kind === 'draft'
        ? await call('review_submission', { p_submission: id, p_status: approve ? 'APPROVED' : 'REVISION', p_note: note }, { success: approve ? 'Draft disetujui — creator diminta publish' : 'Permintaan revisi dikirim' })
        : kind === 'publication'
          ? await call('verify_publication', { p_publication: id, p_approved: approve, p_note: note }, { success: approve ? 'Publikasi terverifikasi' : 'Link tayang ditolak' })
          : await call('verify_insight', { p_insight: id, p_approved: approve, p_note: note }, { success: approve ? 'Insight terverifikasi' : 'Insight ditolak — creator dapat kirim ulang' });
    if (r.ok) { setDecision(null); setNote(''); }
  };
  const open = (d: Decision) => { setNote(''); setDecision(d); };

  const empty = (what: string) => (
    <Panel><Empty icon={<CircleCheck className="size-5" />} title={`Tidak ada ${what} yang menunggu`} description="Antrean bersih. Item baru muncul di sini saat creator mengirimkannya." /></Panel>
  );

  let body: React.ReactNode = null;
  if (tab === 'drafts') {
    body = drafts.length === 0 ? empty('draft') : (
      <div className="space-y-3">
        {drafts.map((s) => (
          <Item key={s.id} who={s.application?.talent_name} campaign={s.campaign?.title} when={s.submitted_at}
            meta={`Draft versi ${s.version}`} link={s.draft_url} caption={s.caption}
            actions={<>
              <Button variant="secondary" onClick={() => open({ kind: 'draft', id: s.id, approve: false, title: 'Minta revisi' })}>Minta revisi</Button>
              <Button onClick={() => open({ kind: 'draft', id: s.id, approve: true, title: 'Setujui draft' })}>Setujui draft</Button>
            </>} />
        ))}
      </div>
    );
  } else if (tab === 'publications') {
    body = publications.length === 0 ? empty('link tayang') : (
      <div className="space-y-3">
        {publications.map((p) => (
          <Item key={p.id} who={p.application?.talent_name} campaign={p.campaign?.title} when={p.created_at}
            meta={`${platformLabel(p.platform)} — tayang ${date(p.published_at)}`} link={p.content_url}
            actions={<>
              <Button variant="secondary" onClick={() => open({ kind: 'publication', id: p.id, approve: false, title: 'Tolak link tayang' })}>Tolak</Button>
              <Button onClick={() => open({ kind: 'publication', id: p.id, approve: true, title: 'Verifikasi publikasi' })}>Verifikasi</Button>
            </>} />
        ))}
      </div>
    );
  } else if (tab === 'insights') {
    body = insights.length === 0 ? empty('insight') : (
      <div className="space-y-3">
        {insights.map((i) => (
          <Item key={i.id} who={i.application?.talent_name} campaign={i.campaign?.title} when={i.submitted_at} meta="Data performa konten" link={i.evidence_url} linkLabel="Bukti insight"
            extra={
              <>
                <dl className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
                  {[['Views', i.views], ['Reach', i.reach], ['Impr.', i.impressions], ['Likes', i.likes], ['Komentar', i.comments], ['Share', i.shares], ['Save', i.saves]].map(([k, v]) => (
                    <div key={k as string}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 text-sm font-semibold tabular">{compactNumber(v as number)}</dd></div>
                  ))}
                  <div><dt className="text-xs text-muted">ER</dt><dd className="mt-0.5 text-sm font-semibold tabular">{i.engagement_rate}%</dd></div>
                </dl>
                {i.engagement_rate > 25 && <Notice tone="amber" className="mt-3">ER di atas 25% jarang terjadi. Cocokkan angka dengan screenshot bukti sebelum verifikasi.</Notice>}
                {i.audience_data_url && <p className="mt-2 text-sm">Data audience: <ExternalA href={i.audience_data_url}>buka</ExternalA></p>}
              </>
            }
            actions={<>
              <Button variant="secondary" onClick={() => open({ kind: 'insight', id: i.id, approve: false, title: 'Tolak insight' })}>Tolak</Button>
              <Button onClick={() => open({ kind: 'insight', id: i.id, approve: true, title: 'Verifikasi insight' })}>Verifikasi</Button>
            </>} />
        ))}
      </div>
    );
  } else {
    const rows = [
      ...history.drafts.map((x) => ({ ...x, kind: `Draft v${x.version}`, at: x.reviewed_at, url: x.draft_url })),
      ...history.publications.map((x) => ({ ...x, kind: `Tayang ${platformLabel(x.platform)}`, at: x.verified_at, url: x.content_url })),
      ...history.insights.map((x) => ({ ...x, kind: 'Insight', at: x.verified_at, url: x.evidence_url })),
    ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    body = (
      <Panel padded={false}>
        {rows.length === 0 ? <Empty title="Belum ada riwayat review" /> : (
          <ul className="divide-y divide-line-2">
            {rows.map((x) => (
              <li key={`${x.kind}-${x.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="min-w-0 flex-1"><b>{x.application?.talent_name}</b> — {x.kind} — <span className="text-muted">{x.campaign?.title}</span></span>
                {x.review_note && <span className="max-w-xs truncate text-xs text-muted" title={x.review_note}>{x.review_note}</span>}
                <ReviewStatus status={x.status} />
                <span className="w-28 text-right text-xs text-muted">{dateTime(x.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    );
  }

  const needsNote = decision && !decision.approve;
  return (
    <>
      {body}
      <Dialog open={!!decision} onClose={() => setDecision(null)} title={decision?.title ?? ''} width="sm"
        footer={<><Button variant="secondary" onClick={() => setDecision(null)}>Batal</Button>
          <Button variant={decision?.approve ? 'primary' : 'danger'} loading={pending} disabled={!!needsNote && !note.trim()} onClick={submit}>{decision?.title}</Button></>}>
        <Field label={needsNote ? 'Catatan untuk creator' : 'Catatan (opsional)'} required={!!needsNote}
          hint={needsNote ? 'Jelaskan apa yang perlu diperbaiki. Catatan ini dikirim ke creator dan Revision Chat.' : undefined}>
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
        </Field>
      </Dialog>
    </>
  );
}

function Item({ who, campaign, when, meta, link, linkLabel = 'Buka link', caption, extra, actions }: any) {
  return (
    <Panel>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">{who}</p>
          <p className="mt-0.5 text-[13px] text-muted">{campaign} — {meta} — {relative(when)}</p>
          <a href={link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-iris hover:underline">
            <ExternalLink className="size-4 shrink-0" /><span className="truncate">{linkLabel}</span>
          </a>
          {caption && <p className="mt-3 max-w-2xl rounded-control bg-paper px-3 py-2 text-sm whitespace-pre-line text-ink-2">{caption}</p>}
          {extra}
        </div>
        <div className="flex shrink-0 gap-2">{actions}</div>
      </div>
    </Panel>
  );
}


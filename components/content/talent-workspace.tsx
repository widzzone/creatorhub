'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PLATFORMS } from '@/lib/constants';
import { number, percent, period, platformLabel, rupiah, todayISO } from '@/lib/format';
import { Button, Empty, ExternalA, Field, Input, LinkButton, Notice, Panel, Select, Textarea, cx } from '../ui/primitives';
import { useRpc } from '../ui/client';
import { AppStatus, ApplicationRail, ReviewStatus } from '../ui/status';
import { Clapperboard, ExternalLink, FileText, Truck } from '../ui/icons';

const one = (x: any) => (Array.isArray(x) ? x[0] : x) ?? null;
const DRAFTABLE = ['BRIEF_SENT', 'PRODUCT_SHIPPED', 'CONTENT_IN_PROGRESS', 'REVISION_REQUESTED'];

export function TalentWorkspace({ apps }: { apps: any[] }) {
  const [active, setActive] = useState(apps[0]?.id ?? '');
  if (!apps.length) {
    return (
      <Panel><Empty icon={<Clapperboard className="size-5" />} title="Belum ada campaign yang berjalan"
        description="Setelah Brand menyetujui Anda, brief dan langkah produksi konten muncul di sini."
        action={<LinkButton href="/applications" size="sm" variant="secondary">Lihat pendaftaran saya</LinkButton>} /></Panel>
    );
  }
  const a = apps.find((x) => x.id === active) ?? apps[0];
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <nav className="space-y-2" aria-label="Campaign">
        {apps.map((x) => (
          <button key={x.id} onClick={() => setActive(x.id)} aria-current={x.id === a.id}
            className={cx('block w-full rounded-panel border p-4 text-left transition-colors',
              x.id === a.id ? 'border-iris/40 bg-surface' : 'border-line bg-surface/60 hover:border-ink/25')}>
            <p className="text-xs text-muted">{x.campaign?.brand_name}</p>
            <p className="mt-0.5 text-sm font-semibold">{x.campaign?.title}</p>
            <div className="mt-2"><AppStatus status={x.status} audience="talent" /></div>
          </button>
        ))}
      </nav>
      <Work key={a.id} a={a} />
    </div>
  );
}

function Work({ a }: { a: any }) {
  const c = a.campaign ?? {};
  const offer = one(a.offer);
  const delivery = one(a.delivery);
  const subs = [...(a.submissions ?? [])].sort((x, y) => y.version - x.version);
  const pubs = [...(a.publications ?? [])].sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
  const ins = [...(a.insights ?? [])].sort((x, y) => String(y.submitted_at).localeCompare(String(x.submitted_at)));
  const s = a.status as string;
  const closed = ['CLOSED', 'CANCELLED'].includes(c.status);

  return (
    <div className="min-w-0 space-y-6">
      <Panel>
        <div className="mb-5"><ApplicationRail status={s} /></div>
        <NextStep a={a} subs={subs} pubs={pubs} ins={ins} closed={closed} />
      </Panel>

      <Panel>
        <div className="mb-5 flex items-center gap-2"><FileText className="size-4 text-iris" /><h2 className="text-[15px] font-bold">Brief campaign</h2></div>
        {!a.brief_sent_at ? (
          <p className="text-sm text-muted">Brief sedang disiapkan tim kami. Anda akan mendapat notifikasi saat brief tersedia.</p>
        ) : (
          <div className="space-y-6">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
              <div><dt className="text-xs text-muted">Brand</dt><dd className="mt-1 text-sm font-medium">{c.brand_name}</dd></div>
              <div><dt className="text-xs text-muted">Fee</dt><dd className="mt-1 text-sm font-semibold tabular">{rupiah(offer?.fee ?? a.offer_fee ?? c.payment_amount)}</dd></div>
              <div><dt className="text-xs text-muted">Periode</dt><dd className="mt-1 text-sm font-medium">{offer?.period_text || period(c.start_date, c.end_date)}</dd></div>
            </dl>
            {(offer?.deliverables || c.deliverables) && <Block title="Deliverables">{offer?.deliverables || c.deliverables}</Block>}
            {c.sow && <Block title="Scope of work">{c.sow}</Block>}
            {c.brief_note && <Block title="Catatan brief">{c.brief_note}</Block>}
            {(offer?.campaign_summary || c.description) && <Block title="Ringkasan campaign">{offer?.campaign_summary || c.description}</Block>}
            {c.brief_url && (
              <a href={c.brief_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-iris hover:underline">
                <ExternalLink className="size-4" />Buka dokumen brief
              </a>
            )}
            {c.product_required && (
              <div className="flex items-start gap-3 rounded-control bg-paper px-4 py-3">
                <Truck className="mt-0.5 size-4 shrink-0 text-muted" />
                <div className="text-sm">
                  <p className="font-semibold">Pengiriman produk</p>
                  <p className="mt-0.5 text-ink-2">
                    {!delivery ? 'Produk akan dikirim sebelum produksi.' : (
                      <>{{ PREPARING: 'Sedang disiapkan', SHIPPED: 'Dalam pengiriman', RECEIVED: 'Sudah diterima', RETURNED: 'Dikembalikan' }[delivery.status as string]}
                        {delivery.product_name && ` — ${delivery.product_name}`}
                        {delivery.tracking_number && ` — ${delivery.courier} ${delivery.tracking_number}`}</>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>

      {(subs.length > 0 || pubs.length > 0 || ins.length > 0) && (
        <Panel>
          <h2 className="mb-4 text-[15px] font-bold">Riwayat kiriman</h2>
          <ul className="space-y-2.5 text-sm">
            {subs.map((x) => (
              <li key={x.id} className="rounded-control border border-line px-4 py-3">
                <div className="flex items-center justify-between gap-3"><span>Draft v{x.version} — <ExternalA href={x.draft_url}>buka</ExternalA></span><ReviewStatus status={x.status} /></div>
                {x.review_note && <p className="mt-1.5 text-[13px] text-ink-2">Catatan: {x.review_note}</p>}
              </li>
            ))}
            {pubs.map((x) => (
              <li key={x.id} className="rounded-control border border-line px-4 py-3">
                <div className="flex items-center justify-between gap-3"><span>Tayang {platformLabel(x.platform)} — <ExternalA href={x.content_url}>buka</ExternalA></span><ReviewStatus status={x.status} /></div>
                {x.review_note && <p className="mt-1.5 text-[13px] text-ink-2">Catatan: {x.review_note}</p>}
              </li>
            ))}
            {ins.map((x) => (
              <li key={x.id} className="rounded-control border border-line px-4 py-3">
                <div className="flex items-center justify-between gap-3"><span className="tabular">Insight — {number(x.views)} views, ER {percent(x.engagement_rate)}</span><ReviewStatus status={x.status} /></div>
                {x.review_note && <p className="mt-1.5 text-[13px] text-ink-2">Catatan: {x.review_note}</p>}
              </li>
            ))}
          </ul>
          <Link href={`/messages?app=${a.id}`} className="mt-4 inline-block text-[13px] font-semibold text-iris hover:underline">Diskusikan di Revision Chat</Link>
        </Panel>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{title}</p>
      <p className="mt-1 max-w-[70ch] text-sm leading-relaxed whitespace-pre-line text-ink">{children}</p>
    </div>
  );
}

function NextStep({ a, subs, pubs, ins, closed }: { a: any; subs: any[]; pubs: any[]; ins: any[]; closed: boolean }) {
  const s = a.status as string;
  const { call, pending } = useRpc();
  const [draft, setDraft] = useState({ url: '', caption: '' });
  const [pub, setPub] = useState({ platform: a.campaign?.platforms?.[0] ?? 'instagram', url: '', date: todayISO() });
  const [m, setM] = useState({ views: '', reach: '', impressions: '', likes: '', comments: '', shares: '', saves: '', evidence_url: '', audience_data_url: '' });

  if (closed) return <Notice tone="neutral" title="Campaign selesai">Terima kasih atas kolaborasinya.</Notice>;

  if (!a.brief_sent_at) return <Notice tone="sky" title="Menunggu brief">Anda sudah disetujui Brand. Brief akan dikirim oleh tim campaign.</Notice>;

  if (DRAFTABLE.includes(s)) {
    const lastRevision = s === 'REVISION_REQUESTED' ? subs.find((x) => x.status === 'REVISION') : null;
    return (
      <form onSubmit={async (e) => {
        e.preventDefault();
        const r = await call('submit_draft', { p_app: a.id, p_url: draft.url, p_caption: draft.caption }, { success: 'Draft terkirim untuk direview' });
        if (r.ok) setDraft({ url: '', caption: '' });
      }} className="space-y-4">
        <div>
          <h2 className="text-[17px] font-bold">{lastRevision ? `Kirim revisi (versi ${subs[0].version + 1})` : 'Kirim draft konten'}</h2>
          <p className="mt-1 text-sm text-muted">File tetap di Google Drive Anda. Kirim link-nya saja dengan akses &ldquo;Anyone with the link can view&rdquo;.</p>
        </div>
        {lastRevision && <Notice tone="rose" title="Catatan revisi">{lastRevision.review_note}</Notice>}
        <Field label="Link draft" required><Input type="url" required value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://drive.google.com/…" /></Field>
        <Field label="Caption"><Textarea rows={4} value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} placeholder="Caption, hashtag, dan mention yang akan dipakai" /></Field>
        <Button type="submit" loading={pending}>{lastRevision ? 'Kirim revisi' : 'Kirim draft'}</Button>
      </form>
    );
  }

  if (s === 'DRAFT_SUBMITTED') return <Notice tone="amber" title={`Draft v${subs[0]?.version ?? ''} sedang direview`}>Anda akan mendapat notifikasi saat draft disetujui atau perlu revisi.</Notice>;

  if (['CONTENT_APPROVED', 'READY_TO_PUBLISH'].includes(s)) {
    const rejected = pubs.find((x) => x.status === 'REJECTED');
    return (
      <form onSubmit={async (e) => {
        e.preventDefault();
        await call('submit_publication', { p_app: a.id, p_platform: pub.platform, p_url: pub.url, p_published_at: pub.date }, { success: 'Link tayang terkirim' });
      }} className="space-y-4">
        <div>
          <h2 className="text-[17px] font-bold">Draft disetujui. Publish konten Anda.</h2>
          <p className="mt-1 text-sm text-muted">Setelah tayang, kirim link postingan untuk diverifikasi.</p>
        </div>
        {rejected && pubs[0]?.id === rejected.id && <Notice tone="rose" title="Link sebelumnya ditolak">{rejected.review_note}</Notice>}
        <div className="grid gap-4 sm:grid-cols-[180px_1fr_180px]">
          <Field label="Platform"><Select value={pub.platform} onChange={(e) => setPub({ ...pub, platform: e.target.value })}>{PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></Field>
          <Field label="Link postingan" required><Input type="url" required value={pub.url} onChange={(e) => setPub({ ...pub, url: e.target.value })} placeholder="https://www.instagram.com/reel/…" /></Field>
          <Field label="Tanggal tayang" required><Input type="date" max={todayISO()} value={pub.date} onChange={(e) => setPub({ ...pub, date: e.target.value })} /></Field>
        </div>
        <Button type="submit" loading={pending}>Kirim link tayang</Button>
      </form>
    );
  }

  if (s === 'PUBLISHED') return <Notice tone="amber" title="Link tayang sedang diverifikasi">Insight dapat dikirim setelah publikasi terverifikasi.</Notice>;

  if (s === 'PUBLICATION_VERIFIED') {
    const rejected = ins[0]?.status === 'REJECTED' ? ins[0] : null;
    const eng = ['likes', 'comments', 'shares', 'saves'].reduce((t, k) => t + Number((m as any)[k] || 0), 0);
    const er = Number(m.reach) > 0 ? (eng / Number(m.reach)) * 100 : 0;
    return (
      <form onSubmit={async (e) => {
        e.preventDefault();
        const r = await call('submit_insight', { p_app: a.id, p: m }, { success: 'Insight terkirim untuk diverifikasi' });
        if (r.ok) setM({ views: '', reach: '', impressions: '', likes: '', comments: '', shares: '', saves: '', evidence_url: '', audience_data_url: '' });
      }} className="space-y-4">
        <div>
          <h2 className="text-[17px] font-bold">{rejected ? 'Kirim ulang insight' : 'Kirim insight performa'}</h2>
          <p className="mt-1 text-sm text-muted">Ambil angka dari insight platform, idealnya 3–7 hari setelah tayang. Lampirkan screenshot sebagai bukti.</p>
        </div>
        {rejected && <Notice tone="rose" title="Insight sebelumnya ditolak">{rejected.review_note}</Notice>}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {([['views', 'Views'], ['reach', 'Reach'], ['impressions', 'Impressions'], ['likes', 'Likes'], ['comments', 'Komentar'], ['shares', 'Share'], ['saves', 'Save']] as const).map(([k, l]) => (
            <Field key={k} label={l}><Input type="number" min={0} inputMode="numeric" value={(m as any)[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} /></Field>
          ))}
          <div className="flex flex-col justify-end">
            <p className="text-xs text-muted">Engagement rate</p>
            <p className={cx('mt-1 text-xl font-bold tabular', er > 100 ? 'text-rose' : 'text-ink')}>{er ? percent(er) : '—'}</p>
          </div>
        </div>
        {er > 100 && <p className="text-sm text-rose">Interaksi melebihi reach. Periksa kembali angkanya.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Link bukti insight" required hint="Folder Drive berisi screenshot insight."><Input type="url" required value={m.evidence_url} onChange={(e) => setM({ ...m, evidence_url: e.target.value })} placeholder="https://drive.google.com/…" /></Field>
          <Field label="Link data audience" hint="Opsional"><Input type="url" value={m.audience_data_url} onChange={(e) => setM({ ...m, audience_data_url: e.target.value })} /></Field>
        </div>
        <Button type="submit" loading={pending} disabled={er > 100}>Kirim insight</Button>
      </form>
    );
  }

  if (s === 'INSIGHT_SUBMITTED') return <Notice tone="amber" title="Insight sedang diverifikasi">Setelah terverifikasi, pembayaran dijadwalkan otomatis.</Notice>;

  if (['INSIGHT_VERIFIED', 'READY_FOR_PAYMENT'].includes(s)) {
    return (
      <Notice tone="moss" title="Pekerjaan terverifikasi">
        Pembayaran sudah dijadwalkan. Pastikan data rekening Anda lengkap. <Link href="/payments" className="font-semibold underline">Buka Payments</Link>
      </Notice>
    );
  }
  if (['PAID', 'COMPLETED'].includes(s)) return <Notice tone="moss" title="Pembayaran selesai">Bukti transfer tersedia di menu <Link href="/payments" className="font-semibold underline">Payments</Link>.</Notice>;
  return <p className="text-sm text-muted">Tidak ada langkah yang perlu Anda lakukan saat ini.</p>;
}


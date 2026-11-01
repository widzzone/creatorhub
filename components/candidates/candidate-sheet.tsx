'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { compactNumber, date, dateTime, platformLabel, rupiah, waLink } from '@/lib/format';
import type { PipelineRow } from '@/lib/types';
import { Button, ExternalA, Field, Input, KeyValue, Notice, Select, Tag, Textarea, cx } from '../ui/primitives';
import { ActionButton, cleanError, useRpc } from '../ui/client';
import { Dialog } from '../ui/dialog';
import { AppStatus, ApplicationRail, PaymentStatus, ReasonList, Recommendation, ReviewStatus } from '../ui/status';
import { LoaderCircle, MessagesSquare, Phone, Send, Truck } from '../ui/icons';

const ACTION_LABEL: Record<string, string> = {
  REGISTER_CAMPAIGN: 'Mendaftar', UPDATE_STATUS: 'Status diubah', APPLY_SHORTLIST: 'Masuk shortlist', SEND_JOB_OFFER: 'Job offer dikirim',
  RESPOND_JOB_OFFER: 'Creator merespons offer', SUBMIT_TO_BRAND: 'Diajukan ke Brand', BRAND_DECISION: 'Keputusan Brand', BRIEF_SENT: 'Brief dikirim',
  BRIEF_UPDATED: 'Brief diperbarui', PRODUCT_DELIVERY: 'Pengiriman produk', SUBMIT_DRAFT: 'Draft dikirim', REVIEW_CONTENT: 'Draft direview',
  SUBMIT_PUBLICATION: 'Link tayang dikirim', VERIFY_PUBLICATION: 'Publikasi diverifikasi', SUBMIT_INSIGHT: 'Insight dikirim',
  VERIFY_INSIGHT: 'Insight diverifikasi', UPDATE_PAYMENT: 'Pembayaran diperbarui', REQUEST_BANK_DETAILS: 'Rekening diminta',
};

export function CandidateSheet({ row, role, campaign, onClose }: { row: PipelineRow; role: 'ADMIN' | 'BRAND'; campaign: any; onClose: () => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc('application_detail', { p_app: row.id });
    if (error) setErr(cleanError(error.message));
    else setD(data);
  }, [row.id]);
  useEffect(() => { load(); }, [load, row.status]);

  const a = d?.application;
  const t = d?.talent ?? {};
  const status = a?.status ?? row.status;

  return (
    <Dialog open onClose={onClose} variant="sheet" width="lg"
      title={<span className="flex flex-wrap items-center gap-2">{row.talent_name}<AppStatus status={status} /></span>}
      description={row.campaign_title}>
      {err ? <Notice tone="rose">{err}</Notice> : !d ? (
        <div className="flex justify-center py-16 text-muted"><LoaderCircle className="size-5 animate-spin" /></div>
      ) : (
        <div className="space-y-7">
          <ApplicationRail status={status} />

          <Actions d={d} role={role} campaign={campaign} reload={load} />

          {d.score && (
            <section>
              <div className="mb-2 flex items-center gap-2"><h3 className="text-sm font-bold">Recommendation</h3><Recommendation value={d.score.recommendation} /></div>
              <ReasonList reasons={d.score.reasons} />
              <p className="mt-2 text-xs text-muted">Hanya terlihat oleh tim dan Brand. Gunakan sebagai bahan pertimbangan, bukan keputusan otomatis.</p>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-sm font-bold">Profil creator</h3>
            <KeyValue items={[
              { label: 'Email', value: d.person?.email },
              { label: 'WhatsApp', value: d.person?.phone && (role === 'ADMIN'
                  ? <a className="font-medium text-iris hover:underline" href={waLink(d.person.phone)} target="_blank" rel="noopener noreferrer">+{d.person.phone}</a> : `+${d.person.phone}`) },
              { label: 'Domisili', value: t.city },
              { label: 'Gender', value: t.gender === 'FEMALE' ? 'Perempuan' : t.gender === 'MALE' ? 'Laki-laki' : '' },
              { label: 'Kategori', value: t.categories?.length ? <span className="flex flex-wrap gap-1">{t.categories.map((x: string) => <Tag key={x}>{x}</Tag>)}</span> : '' },
              { label: 'Engagement rate', value: t.engagement_rate ? `${t.engagement_rate}%` : '' },
              ...(['instagram', 'tiktok', 'youtube'] as const).filter((p) => t[p] || t[`followers_${p}`]).map((p) => ({
                label: platformLabel(p), value: `${t[p] || '—'} — ${compactNumber(t[`followers_${p}`])} ${p === 'youtube' ? 'subscribers' : 'followers'}`,
              })),
              { label: 'Portfolio', value: t.portfolio_url && <ExternalA href={t.portfolio_url}>{t.portfolio_url}</ExternalA> },
              { label: 'Kelengkapan profil', value: `${t.profile_completeness ?? 0}%` },
              { label: 'Verifikasi', value: t.verification_status === 'VERIFIED' ? 'Terverifikasi' : 'Belum diverifikasi' },
            ]} />
            {t.bio && <p className="mt-4 text-sm leading-relaxed text-ink-2">{t.bio}</p>}
          </section>

          {d.answers.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-bold">Jawaban pendaftaran</h3>
              <dl className="space-y-3">
                {d.answers.map((x: any, i: number) => (
                  <div key={i} className="rounded-control bg-paper px-4 py-3">
                    <dt className="text-xs text-muted">{x.question_text}</dt>
                    <dd className="mt-1 text-sm break-words">{x.question_type === 'CONSENT' ? (x.answer_value === 'true' ? 'Setuju' : '—') : x.answer_value || '—'}</dd>
                  </div>
                ))}
              </dl>
              {a.note && <p className="mt-3 text-sm text-ink-2">Catatan creator: {a.note}</p>}
            </section>
          )}

          {d.offer && (
            <section>
              <h3 className="mb-3 text-sm font-bold">Job offer</h3>
              <KeyValue items={[
                { label: 'Fee', value: <b className="tabular">{rupiah(d.offer.fee)}</b> },
                { label: 'Status', value: { SENT: 'Menunggu jawaban', ACCEPTED: 'Diterima', DECLINED: 'Ditolak' }[d.offer.status as string] },
                { label: 'Periode', value: d.offer.period_text },
                { label: 'Dikirim', value: dateTime(d.offer.sent_at) },
              ]} />
              {d.offer.response_note && <p className="mt-3 text-sm text-ink-2">Catatan creator: {d.offer.response_note}</p>}
            </section>
          )}

          {(d.submissions.length > 0 || d.publications.length > 0 || d.insights.length > 0) && (
            <section>
              <h3 className="mb-3 text-sm font-bold">Konten</h3>
              <ul className="space-y-2 text-sm">
                {d.submissions.map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2.5">
                    <span>Draft v{s.version} — <ExternalA href={s.draft_url}>buka</ExternalA></span><ReviewStatus status={s.status} />
                  </li>
                ))}
                {d.publications.map((p: any) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2.5">
                    <span>Tayang di {platformLabel(p.platform)} {date(p.published_at)} — <ExternalA href={p.content_url}>buka</ExternalA></span><ReviewStatus status={p.status} />
                  </li>
                ))}
                {d.insights.map((x: any) => (
                  <li key={x.id} className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2.5">
                    <span className="tabular">Insight: {compactNumber(x.views)} views, reach {compactNumber(x.reach)}, ER {x.engagement_rate}%</span><ReviewStatus status={x.status} />
                  </li>
                ))}
              </ul>
              <Link href="/content" className="mt-2 inline-block text-[13px] font-semibold text-iris hover:underline">Buka Content Review</Link>
            </section>
          )}

          {d.payment && (
            <section className="flex items-center justify-between rounded-control border border-line px-4 py-3">
              <div><p className="text-xs text-muted">Pembayaran</p><p className="font-semibold tabular">{rupiah(d.payment.amount)}</p></div>
              <PaymentStatus status={d.payment.status} />
            </section>
          )}

          {d.timeline && d.timeline.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-bold">Riwayat</h3>
              <ol className="relative space-y-3 border-l border-line pl-4">
                {d.timeline.map((x: any, i: number) => (
                  <li key={i} className="text-sm">
                    <span className="absolute -left-[4.5px] mt-1.5 size-2 rounded-full bg-line" />
                    <p className="font-medium">{ACTION_LABEL[x.action] ?? x.action}</p>
                    <p className="text-xs text-muted">{x.actor ?? 'Sistem'} — {dateTime(x.at)}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}

/* ---------------- Stage actions ---------------- */
function Actions({ d, role, campaign, reload }: { d: any; role: 'ADMIN' | 'BRAND'; campaign: any; reload: () => void }) {
  const a = d.application;
  const c = d.campaign ?? campaign ?? {};
  const s = a.status as string;
  const closed = ['CLOSED', 'CANCELLED'].includes(c.status);
  const [dlg, setDlg] = useState<'' | 'offer' | 'reject' | 'brand' | 'brief' | 'delivery' | 'submit'>('');
  const { call, pending } = useRpc();
  const done = async (fn: string, args: any, success: string) => {
    const r = await call(fn, args, { success });
    if (r.ok) { setDlg(''); reload(); }
  };

  if (closed) return <Notice tone="neutral">Campaign sudah {c.status === 'CLOSED' ? 'ditutup' : 'dibatalkan'}. Tidak ada aksi lanjutan.</Notice>;

  const final = ['BRAND_APPROVED', 'BRIEF_SENT', 'PRODUCT_SHIPPED', 'CONTENT_IN_PROGRESS', 'DRAFT_SUBMITTED', 'REVISION_REQUESTED', 'CONTENT_APPROVED', 'READY_TO_PUBLISH', 'PUBLISHED', 'PUBLICATION_VERIFIED', 'INSIGHT_SUBMITTED', 'INSIGHT_VERIFIED', 'READY_FOR_PAYMENT', 'PAID'];
  const buttons: React.ReactNode[] = [];

  if (role === 'ADMIN') {
    if (['APPLIED', 'SCREENING', 'INVITED'].includes(s)) {
      buttons.push(<ActionButton key="sl" variant="primary" size="md" fn="update_application_status" args={{ p_app: a.id, p_status: 'SHORTLISTED', p_note: '' }} success="Masuk shortlist" onDone={reload}>Shortlist</ActionButton>);
      if (s !== 'SCREENING') buttons.push(<ActionButton key="sc" size="md" fn="update_application_status" args={{ p_app: a.id, p_status: 'SCREENING', p_note: '' }} success="Ditandai sedang ditinjau" onDone={reload}>Tandai ditinjau</ActionButton>);
      buttons.push(<Button key="rj" variant="danger" onClick={() => setDlg('reject')}>Tidak lolos</Button>);
    }
    if (['SHORTLISTED', 'NEGOTIATION', 'OFFER_SENT'].includes(s)) {
      buttons.push(<Button key="of" onClick={() => setDlg('offer')}><Send className="size-4" />{s === 'OFFER_SENT' ? 'Kirim ulang offer' : 'Kirim job offer'}</Button>);
      if (s !== 'NEGOTIATION' && s === 'OFFER_SENT') buttons.push(<ActionButton key="ng" size="md" fn="update_application_status" args={{ p_app: a.id, p_status: 'NEGOTIATION', p_note: '' }} success="Ditandai negosiasi" onDone={reload}>Tandai negosiasi</ActionButton>);
    }
    if (s === 'CREATOR_CONFIRMED') buttons.push(<Button key="sb" onClick={() => setDlg('submit')}>Ajukan ke Brand</Button>);
    if (s === 'SUBMITTED_TO_BRAND') buttons.push(<Button key="bd" variant="secondary" onClick={() => setDlg('brand')}>Catat keputusan Brand</Button>);
    if (final.includes(s)) {
      buttons.push(<Button key="br" variant={s === 'BRAND_APPROVED' ? 'primary' : 'secondary'} onClick={() => setDlg('brief')}>{a.brief_sent_at ? 'Perbarui brief' : 'Kirim brief'}</Button>);
      if (c.product_required) buttons.push(<Button key="dl" variant="secondary" onClick={() => setDlg('delivery')}><Truck className="size-4" />Pengiriman produk</Button>);
    }
    if (['BRAND_REJECTED', 'CREATOR_DECLINED'].includes(s)) {
      buttons.push(<ActionButton key="rp" size="md" fn="update_application_status" args={{ p_app: a.id, p_status: 'REPLACEMENT_REQUIRED', p_note: '' }} success="Ditandai perlu pengganti" onDone={reload}>Tandai perlu pengganti</ActionButton>);
    }
    if (!['APPLIED', 'SCREENING', 'INVITED', 'REJECTED'].includes(s)) {
      buttons.push(<Link key="ch" href={`/messages?app=${a.id}`} className="inline-flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-ink-2 hover:bg-ink/5"><MessagesSquare className="size-4" />Chat</Link>);
    }
    if (d.person?.phone) {
      buttons.push(<a key="wa" href={waLink(d.person.phone, `Halo ${a.talent_name}, terkait campaign ${c.title}: `)} target="_blank" rel="noopener noreferrer"
        className="inline-flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-ink-2 hover:bg-ink/5"><Phone className="size-4" />WhatsApp</a>);
    }
  } else if (s === 'SUBMITTED_TO_BRAND') {
    buttons.push(<Button key="bd" onClick={() => setDlg('brand')}>Beri keputusan</Button>);
  }

  return (
    <>
      {buttons.length > 0 ? <div className="flex flex-wrap gap-2">{buttons}</div> : (
        <p className="text-sm text-muted">{role === 'BRAND' ? 'Tidak ada keputusan yang diperlukan dari Anda saat ini.' : 'Menunggu tindakan dari creator atau Brand.'}</p>
      )}

      <OfferDialog open={dlg === 'offer'} onClose={() => setDlg('')} c={c} a={a} pending={pending}
        onSubmit={(v) => done('send_job_offer', { p_app: a.id, p_fee: Number(v.fee), p_summary: v.summary, p_deliverables: v.deliverables, p_period: v.period }, 'Job offer dikirim ke creator')} />
      <NoteDialog open={dlg === 'reject'} onClose={() => setDlg('')} title="Tandai tidak lolos" cta="Tandai tidak lolos" danger pending={pending}
        label="Catatan internal (opsional)" onSubmit={(note) => done('update_application_status', { p_app: a.id, p_status: 'REJECTED', p_note: note }, 'Kandidat ditandai tidak lolos')} />
      <NoteDialog open={dlg === 'submit'} onClose={() => setDlg('')} title="Ajukan ke Brand" cta="Ajukan ke Brand" pending={pending}
        label="Catatan untuk Brand (opsional)" placeholder="Alasan creator ini cocok" onSubmit={(note) => done('submit_to_brand', { p_app: a.id, p_note: note }, 'Diajukan ke Brand')} />
      <BrandDialog open={dlg === 'brand'} onClose={() => setDlg('')} pending={pending}
        onSubmit={(decision, note) => done('brand_decision', { p_app: a.id, p_decision: decision, p_note: note }, decision === 'APPROVED' ? 'Creator disetujui' : 'Creator ditolak')} />
      <BriefDialog open={dlg === 'brief'} onClose={() => setDlg('')} c={c} pending={pending} first={!a.brief_sent_at}
        onSubmit={(note, url) => done('send_brief', { p_app: a.id, p_note: note, p_brief_url: url }, a.brief_sent_at ? 'Brief diperbarui' : 'Brief dikirim ke creator')} />
      <DeliveryDialog open={dlg === 'delivery'} onClose={() => setDlg('')} current={d.delivery} pending={pending}
        onSubmit={(v) => done('save_product_delivery', { p_app: a.id, p: v }, 'Status pengiriman disimpan')} />
    </>
  );
}

function OfferDialog({ open, onClose, c, a, onSubmit, pending }: any) {
  const [v, setV] = useState({
    fee: String(a.offer_fee ?? c.payment_amount ?? ''),
    summary: c.description ?? '',
    deliverables: c.deliverables || c.sow || '',
    period: c.start_date ? `${date(c.start_date)} – ${date(c.end_date)}` : '',
  });
  return (
    <Dialog open={open} onClose={onClose} title="Kirim job offer" description={`Creator akan diminta mengonfirmasi kesediaan untuk ${c.title}.`}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={pending} onClick={() => onSubmit(v)}>Kirim job offer</Button></>}>
      <div className="space-y-4">
        <Field label="Fee (Rp)" hint={v.fee ? rupiah(v.fee) : undefined}><Input type="number" min={0} value={v.fee} onChange={(e) => setV({ ...v, fee: e.target.value })} /></Field>
        <Field label="Deliverables"><Textarea rows={3} value={v.deliverables} onChange={(e) => setV({ ...v, deliverables: e.target.value })} /></Field>
        <Field label="Periode"><Input value={v.period} onChange={(e) => setV({ ...v, period: e.target.value })} /></Field>
        <Field label="Ringkasan campaign"><Textarea rows={3} value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} /></Field>
      </div>
    </Dialog>
  );
}

function NoteDialog({ open, onClose, title, cta, label, placeholder, onSubmit, pending, danger }: any) {
  const [note, setNote] = useState('');
  return (
    <Dialog open={open} onClose={onClose} title={title} width="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant={danger ? 'danger' : 'primary'} loading={pending} onClick={() => onSubmit(note)}>{cta}</Button></>}>
      <Field label={label}><Textarea rows={3} value={note} placeholder={placeholder} onChange={(e) => setNote(e.target.value)} /></Field>
    </Dialog>
  );
}

function BrandDialog({ open, onClose, onSubmit, pending }: any) {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [note, setNote] = useState('');
  return (
    <Dialog open={open} onClose={onClose} title="Keputusan Brand" width="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button variant={decision === 'REJECTED' ? 'danger' : 'primary'} loading={pending} onClick={() => onSubmit(decision, note)}>{decision === 'APPROVED' ? 'Setujui creator' : 'Tolak creator'}</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['APPROVED', 'REJECTED'] as const).map((x) => (
            <button key={x} type="button" onClick={() => setDecision(x)} aria-pressed={decision === x}
              className={cx('h-11 rounded-control border text-sm font-semibold',
                decision === x ? (x === 'APPROVED' ? 'border-moss bg-moss-50 text-moss' : 'border-rose bg-rose-50 text-rose') : 'border-line text-ink-2')}>
              {x === 'APPROVED' ? 'Setujui' : 'Tolak'}
            </button>
          ))}
        </div>
        <Field label="Catatan" hint={decision === 'REJECTED' ? 'Alasan membantu tim mencari pengganti yang lebih sesuai.' : undefined}>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

function BriefDialog({ open, onClose, c, onSubmit, pending, first }: any) {
  const [note, setNote] = useState(c.brief_note ?? '');
  const [url, setUrl] = useState(c.brief_url ?? '');
  return (
    <Dialog open={open} onClose={onClose} title={first ? 'Kirim brief' : 'Perbarui brief'} description="Brief tampil di menu Content & Publication milik creator."
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={pending} onClick={() => onSubmit(note, url)}>{first ? 'Kirim brief' : 'Simpan brief'}</Button></>}>
      <div className="space-y-4">
        <Notice tone="neutral">Creator juga melihat deliverables, SOW, fee, dan periode campaign. Link dokumen bersifat opsional.</Notice>
        <Field label="Catatan brief"><Textarea rows={6} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Key message, do & don't, hashtag, mention, timeline" /></Field>
        <Field label="Link brief (opsional)"><Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/…" /></Field>
      </div>
    </Dialog>
  );
}

function DeliveryDialog({ open, onClose, current, onSubmit, pending }: any) {
  const [v, setV] = useState({
    product_name: current?.product_name ?? '', courier: current?.courier ?? '', tracking_number: current?.tracking_number ?? '',
    status: current?.status ?? 'PREPARING', note: current?.note ?? '',
  });
  return (
    <Dialog open={open} onClose={onClose} title="Pengiriman produk" width="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={pending} onClick={() => onSubmit(v)}>Simpan</Button></>}>
      <div className="space-y-4">
        <Field label="Produk"><Input value={v.product_name} onChange={(e) => setV({ ...v, product_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kurir"><Input value={v.courier} onChange={(e) => setV({ ...v, courier: e.target.value })} placeholder="JNE, SiCepat" /></Field>
          <Field label="Nomor resi"><Input value={v.tracking_number} onChange={(e) => setV({ ...v, tracking_number: e.target.value })} /></Field>
        </div>
        <Field label="Status">
          <Select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}>
            <option value="PREPARING">Disiapkan</option><option value="SHIPPED">Dikirim</option><option value="RECEIVED">Diterima creator</option><option value="RETURNED">Dikembalikan</option>
          </Select>
        </Field>
        <Field label="Catatan"><Textarea rows={2} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></Field>
      </div>
    </Dialog>
  );
}


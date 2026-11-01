'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CATEGORIES, PLATFORMS } from '@/lib/constants';
import type { Campaign, Question } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Button, Checkbox, Field, Input, Panel, PanelTitle, Select, Textarea } from '../ui/primitives';
import { ChipSelect, cleanError } from '../ui/client';
import { QuestionBuilder } from './question-builder';

type Brand = { id: string; name: string };

export function CampaignForm({
  campaign,
  questions,
  brands,
  templates,
  role,
}: {
  campaign?: Campaign;
  questions: Question[];
  brands: Brand[];
  templates: { id: string; name: string; questions: Question[] }[];
  role: 'ADMIN' | 'BRAND';
}) {
  const router = useRouter();
  const c = campaign;
  const [v, setV] = useState({
    brand_id: c?.brand_id ?? (brands.length === 1 ? brands[0].id : ''),
    title: c?.title ?? '',
    description: c?.description ?? '',
    objective: c?.objective ?? '',
    creator_profile: c?.creator_profile ?? '',
    job_type: c?.job_type ?? '',
    creator_needed: String(c?.creator_needed ?? 1),
    platforms: c?.platforms ?? [],
    categories: c?.categories ?? [],
    min_followers: c?.min_followers ? String(c.min_followers) : '',
    max_followers: c?.max_followers ? String(c.max_followers) : '',
    min_engagement: c?.min_engagement ? String(c.min_engagement) : '',
    preferred_city: c?.preferred_city ?? '',
    gender_preference: c?.gender_preference ?? 'ALL',
    payment_amount: c?.payment_amount ? String(c.payment_amount) : '',
    benefit: c?.benefit ?? '',
    start_date: c?.start_date ?? '',
    end_date: c?.end_date ?? '',
    deliverables: c?.deliverables ?? '',
    sow: c?.sow ?? '',
    brief_url: c?.brief_url ?? '',
    brief_note: c?.brief_note ?? '',
    product_required: c?.product_required ?? false,
    product_notes: c?.product_notes ?? '',
    recruitment_channels: c?.recruitment_channels ?? '',
    broadcast_message: c?.broadcast_message ?? '',
  });
  const [qs, setQs] = useState<Question[]>(questions);
  const [saving, setSaving] = useState<'' | 'draft' | 'open'>('');
  const set = (k: keyof typeof v, val: unknown) => setV((s) => ({ ...s, [k]: val }));
  const bind = (k: keyof typeof v) => ({ value: v[k] as string, onChange: (e: { target: { value: string } }) => set(k, e.target.value) });

  async function save(mode: 'draft' | 'open') {
    setSaving(mode);
    const supabase = createClient();
    const cleanQs = qs.map((q) => ({ ...q, options: q.options.map((o) => o.trim()).filter(Boolean) }));
    const { data: id, error } = await supabase.rpc('save_campaign', { p_id: c?.id ?? null, p: v, p_questions: cleanQs });
    if (error) {
      setSaving('');
      return toast.error(cleanError(error.message));
    }
    if (mode === 'open') {
      const { error: e2 } = await supabase.rpc('update_recruitment', { p_campaign: id, p_status: 'OPEN', p_open_date: null, p_close_date: null, p_target: 0 });
      if (e2) toast.error(cleanError(e2.message));
      else toast.success('Campaign disimpan dan recruitment dibuka');
    } else {
      toast.success(c ? 'Perubahan disimpan' : 'Campaign disimpan sebagai draft');
    }
    router.push(`/campaigns/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save('draft'); }} className="space-y-6">
      <Panel>
        <PanelTitle title="Informasi campaign" description="Bagian ini tampil di halaman pendaftaran creator." />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {role === 'ADMIN' && (
            <Field label="Brand / client" required hint={brands.length === 0 ? 'Belum ada Brand. Tambahkan dulu di Brands & Clients.' : undefined}>
              <Select {...bind('brand_id')} required>
                <option value="">Pilih brand</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Judul campaign" required className={role === 'ADMIN' ? '' : 'md:col-span-2'}>
            <Input {...bind('title')} placeholder="Contoh: Kopi Senja Ramadan Series" required />
          </Field>
          <Field label="Deskripsi" required className="md:col-span-2">
            <Textarea {...bind('description')} rows={4} placeholder="Apa yang dipromosikan dan seperti apa kontennya." />
          </Field>
          <Field label="Objective"><Textarea {...bind('objective')} rows={2} placeholder="Awareness menu baru di Jabodetabek" /></Field>
          <Field label="Profil creator yang dicari"><Textarea {...bind('creator_profile')} rows={2} placeholder="Food reviewer, gaya hangat, audiens 18–34" /></Field>
          <Field label="Jenis pekerjaan"><Input {...bind('job_type')} placeholder="Paid endorsement, review, unboxing" /></Field>
        </div>
      </Panel>

      <Panel>
        <PanelTitle title="Kriteria creator" description="Dipakai untuk Recommendation kandidat. Keputusan akhir tetap oleh tim." />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Platform" required className="md:col-span-2">
            <ChipSelect options={PLATFORMS} value={v.platforms} onChange={(x) => set('platforms', x)} name="Platform" />
          </Field>
          <Field label="Kategori konten" required className="md:col-span-2">
            <ChipSelect options={CATEGORIES.map((x) => ({ value: x, label: x }))} value={v.categories} onChange={(x) => set('categories', x)} name="Kategori" />
          </Field>
          <Field label="Jumlah creator dibutuhkan" required><Input type="number" min={1} {...bind('creator_needed')} /></Field>
          <Field label="Preferensi gender">
            <Select {...bind('gender_preference')}>
              <option value="ALL">Semua</option><option value="FEMALE">Perempuan</option><option value="MALE">Laki-laki</option>
            </Select>
          </Field>
          <Field label="Minimum followers"><Input type="number" min={0} {...bind('min_followers')} placeholder="0" /></Field>
          <Field label="Maksimum followers" hint="Kosongkan bila tidak ada batas."><Input type="number" min={0} {...bind('max_followers')} /></Field>
          <Field label="Minimum engagement rate (%)"><Input type="number" min={0} step="0.1" {...bind('min_engagement')} placeholder="0" /></Field>
          <Field label="Domisili">
            <Select {...bind('preferred_city')}>
              <option value="">Semua domisili</option><option value="Jabodetabek">Jabodetabek</option><option value="Luar Jabodetabek">Luar Jabodetabek</option>
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelTitle title="Fee, periode, dan deliverables" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Fee per creator (Rp)"><Input type="number" min={0} step="1000" {...bind('payment_amount')} placeholder="1500000" /></Field>
          <Field label="Benefit lain"><Input {...bind('benefit')} placeholder="Produk gratis, voucher" /></Field>
          <Field label="Tanggal mulai" required><Input type="date" {...bind('start_date')} /></Field>
          <Field label="Tanggal selesai" required><Input type="date" {...bind('end_date')} /></Field>
          <Field label="Deliverables" className="md:col-span-2" hint="Ditampilkan di job offer dan brief creator.">
            <Textarea {...bind('deliverables')} rows={3} placeholder="1 Reels 30–60 detik, 3 Story dengan link sticker" />
          </Field>
          <Field label="Scope of work (SOW)" className="md:col-span-2"><Textarea {...bind('sow')} rows={3} /></Field>
        </div>
      </Panel>

      <Panel>
        <PanelTitle title="Brief & produk" description="Brief boleh berupa teks saja. Link dokumen bersifat opsional." />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Catatan brief" className="md:col-span-2"><Textarea {...bind('brief_note')} rows={4} placeholder="Key message, do & don't, hashtag, mention" /></Field>
          <Field label="Link brief (opsional)" hint="Google Docs / Drive dengan akses ‘Anyone with the link’."><Input type="url" {...bind('brief_url')} placeholder="https://docs.google.com/…" /></Field>
          <div className="flex flex-col gap-3 pt-6">
            <Checkbox label="Campaign ini membutuhkan pengiriman produk ke creator" checked={v.product_required} onChange={(e) => set('product_required', e.target.checked)} />
          </div>
          {v.product_required && <Field label="Catatan produk" className="md:col-span-2"><Textarea {...bind('product_notes')} rows={2} /></Field>}
        </div>
      </Panel>

      <Panel>
        <PanelTitle title="Pertanyaan pendaftaran" description="Pertanyaan khusus campaign beserta aturan screening." />
        <QuestionBuilder value={qs} onChange={setQs} templates={templates} />
      </Panel>

      <Panel>
        <PanelTitle title="Materi broadcast" description="Teks untuk dibagikan di grup WhatsApp atau media sosial. Link pendaftaran ditambahkan otomatis." />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Channel recruitment"><Input {...bind('recruitment_channels')} placeholder="Grup WA creator, Instagram StarCore" /></Field>
          <Field label="Pesan broadcast" className="md:col-span-2"><Textarea {...bind('broadcast_message')} rows={5} /></Field>
        </div>
      </Panel>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Batal</Button>
        <Button type="submit" variant={c ? 'primary' : 'secondary'} loading={saving === 'draft'} disabled={!!saving}>{c ? 'Simpan perubahan' : 'Simpan sebagai draft'}</Button>
        {!c && <Button type="button" loading={saving === 'open'} disabled={!!saving} onClick={() => save('open')}>Simpan & buka recruitment</Button>}
      </div>
    </form>
  );
}

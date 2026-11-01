'use client';

import { useState } from 'react';
import { CATEGORIES, PLATFORMS } from '@/lib/constants';
import { platformLabel } from '@/lib/format';
import type { Profile } from '@/lib/types';
import { Button, Field, Input, Panel, PanelTitle, Textarea } from '../ui/primitives';
import { ChipSelect, useRpc } from '../ui/client';

export function TalentProfileForm({ me, t }: { me: Profile; t: any }) {
  const [v, setV] = useState({
    full_name: me.full_name ?? '', phone: me.phone ?? '', bio: t.bio ?? '', city: t.city ?? '', gender: t.gender ?? '', birth_date: t.birth_date ?? '',
    platforms: (t.platforms ?? []) as string[], categories: (t.categories ?? []) as string[],
    instagram: t.instagram ?? '', tiktok: t.tiktok ?? '', youtube: t.youtube ?? '',
    followers_instagram: String(t.followers_instagram ?? ''), followers_tiktok: String(t.followers_tiktok ?? ''), followers_youtube: String(t.followers_youtube ?? ''),
    engagement_rate: String(t.engagement_rate ?? ''), portfolio_url: t.portfolio_url ?? '', rate_card: String(t.rate_card ?? ''),
  });
  const { call, pending } = useRpc();
  const b = (k: keyof typeof v) => ({ value: v[k] as string, onChange: (e: any) => setV({ ...v, [k]: e.target.value }) });

  return (
    <Panel>
      <form className="space-y-7" onSubmit={async (e) => { e.preventDefault(); await call<number>('save_talent_profile', { p: v, p_user: null }, { success: 'Profil disimpan' }); }}>
        <section className="space-y-5">
          <PanelTitle title="Data diri" className="mb-0" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nama lengkap" required><Input {...b('full_name')} /></Field>
            <Field label="WhatsApp"><Input type="tel" {...b('phone')} /></Field>
            <Field label="Domisili">
              <ChipSelect single options={[{ value: 'Jabodetabek', label: 'Jabodetabek' }, { value: 'Luar Jabodetabek', label: 'Luar Jabodetabek' }]} value={v.city ? [v.city] : []} onChange={(x) => setV({ ...v, city: x[0] })} name="Domisili" />
            </Field>
            <Field label="Gender">
              <ChipSelect single options={[{ value: 'FEMALE', label: 'Perempuan' }, { value: 'MALE', label: 'Laki-laki' }]} value={v.gender ? [v.gender] : []} onChange={(x) => setV({ ...v, gender: x[0] })} name="Gender" />
            </Field>
            <Field label="Tanggal lahir"><Input type="date" {...b('birth_date')} /></Field>
            <Field label="Rate card (Rp)" hint="Opsional, sebagai referensi tim."><Input type="number" min={0} {...b('rate_card')} /></Field>
          </div>
          <Field label="Bio" hint="Ceritakan gaya konten dan audiens Anda."><Textarea rows={3} {...b('bio')} /></Field>
        </section>

        <section className="space-y-5 border-t border-line pt-7">
          <PanelTitle title="Profil konten" className="mb-0" />
          <Field label="Platform"><ChipSelect options={PLATFORMS} value={v.platforms} onChange={(x) => setV({ ...v, platforms: x })} name="Platform" /></Field>
          {v.platforms.map((pl) => (
            <div key={pl} className="grid gap-4 sm:grid-cols-2">
              <Field label={pl === 'youtube' ? 'Channel YouTube' : `Username ${platformLabel(pl)}`}><Input {...b(pl as 'instagram')} /></Field>
              <Field label={pl === 'youtube' ? 'Subscribers' : 'Followers'}><Input type="number" min={0} {...b(`followers_${pl}` as 'followers_instagram')} /></Field>
            </div>
          ))}
          <Field label="Kategori konten"><ChipSelect options={CATEGORIES.map((c) => ({ value: c, label: c }))} value={v.categories} onChange={(x) => setV({ ...v, categories: x })} name="Kategori" /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Engagement rate (%)"><Input type="number" min={0} step="0.1" {...b('engagement_rate')} /></Field>
            <Field label="Link portfolio"><Input type="url" {...b('portfolio_url')} placeholder="https://" /></Field>
          </div>
        </section>
        <Button type="submit" loading={pending}>Simpan profil</Button>
      </form>
    </Panel>
  );
}

export function BrandProfileForm({ b }: { b: any }) {
  const [v, setV] = useState({ company_name: b.company_name ?? '', industry: b.industry ?? '', pic_name: b.pic_name ?? '', pic_phone: b.pic_phone ?? '', website: b.website ?? '', address: b.address ?? '' });
  const { call, pending } = useRpc();
  const bind = (k: keyof typeof v) => ({ value: v[k], onChange: (e: any) => setV({ ...v, [k]: e.target.value }) });
  return (
    <Panel>
      <form className="space-y-5" onSubmit={async (e) => { e.preventDefault(); await call('save_brand_profile', { p: v, p_user: null }, { success: 'Profil perusahaan disimpan' }); }}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nama perusahaan" required className="sm:col-span-2"><Input {...bind('company_name')} /></Field>
          <Field label="Nama PIC"><Input {...bind('pic_name')} /></Field>
          <Field label="WhatsApp PIC"><Input type="tel" {...bind('pic_phone')} /></Field>
          <Field label="Industri"><Input {...bind('industry')} /></Field>
          <Field label="Website"><Input type="url" {...bind('website')} /></Field>
          <Field label="Alamat" className="sm:col-span-2"><Textarea rows={2} {...bind('address')} /></Field>
        </div>
        <Button type="submit" loading={pending}>Simpan</Button>
      </form>
    </Panel>
  );
}

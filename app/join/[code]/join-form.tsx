'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, PLATFORMS } from '@/lib/constants';
import { platformLabel, waLink } from '@/lib/format';
import { Button, Field, Input, LinkButton, cx } from '@/components/ui/primitives';
import { ChipSelect } from '@/components/ui/client';
import { CircleCheck, Eye, EyeOff } from '@/components/ui/icons';
import { QuestionInput, type PublicQuestion } from '@/components/campaign/question-input';

type Me = { role: string; email: string; full_name: string; phone: string; talent: any } | null;

export function JoinForm({ campaign: c, me }: { campaign: any; me: Me }) {
  const router = useRouter();
  const t = me?.talent ?? {};
  const signedIn = !!me;
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [p, setP] = useState({
    full_name: me?.full_name ?? '',
    phone: me?.phone ?? '',
    city: t.city ?? '',
    gender: t.gender ?? '',
    platforms: (t.platforms?.length ? t.platforms : c.platforms) as string[],
    categories: (t.categories ?? []) as string[],
    instagram: t.instagram ?? '',
    tiktok: t.tiktok ?? '',
    youtube: t.youtube ?? '',
    followers_instagram: t.followers_instagram ? String(t.followers_instagram) : '',
    followers_tiktok: t.followers_tiktok ? String(t.followers_tiktok) : '',
    followers_youtube: t.followers_youtube ? String(t.followers_youtube) : '',
    engagement_rate: t.engagement_rate ? String(t.engagement_rate) : '',
    portfolio_url: t.portfolio_url ?? '',
    note: '',
  });
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<null | { already: boolean; newAccount: boolean }>(null);
  const set = (k: keyof typeof p, v: any) => setP((s) => ({ ...s, [k]: v }));
  const questions: PublicQuestion[] = c.questions ?? [];
  const wrongRole = me && me.role !== 'TALENT';

  const avail = c.availability;
  const closed = !avail?.ok || !c.registration_enabled;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!signedIn) {
      if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Masukkan email yang valid.';
      if (password.length < 8) e.password = 'Password minimal 8 karakter.';
      if (mode === 'new' && password !== confirm) e.confirm = 'Konfirmasi password tidak sama.';
    }
    if (!p.full_name.trim()) e.full_name = 'Nama lengkap wajib diisi.';
    if (p.phone.replace(/\D/g, '').length < 9) e.phone = 'Nomor WhatsApp tidak valid.';
    if (!p.city) e.city = 'Pilih domisili.';
    if (!p.platforms.length) e.platforms = 'Pilih minimal satu platform.';
    questions.forEach((q) => {
      const v = answers[q.id];
      const empty = Array.isArray(v) ? v.length === 0 : !String(v ?? '').trim();
      if (q.required && empty) e[q.id] = q.question_type === 'CONSENT' ? 'Persetujuan ini wajib dicentang.' : 'Pertanyaan ini wajib dijawab.';
    });
    setErrors(e);
    if (Object.keys(e).length) {
      const first = document.querySelector('[aria-invalid="true"], [data-error="true"]');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return Object.keys(e).length === 0;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c.code, mode, email, password, confirm, profile: p, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'EXISTS') setMode('existing');
        if (data.field) setErrors((s) => ({ ...s, [data.field]: data.message }));
        else setFormError(data.message || 'Pendaftaran gagal. Coba lagi.');
        if (data.signedIn) router.refresh();
        return;
      }
      setDone({ already: !!data.already_applied, newAccount: !!data.newAccount });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      router.refresh();
    } catch {
      setFormError('Koneksi terputus. Periksa internet Anda lalu kirim ulang.');
    } finally {
      setLoading(false);
    }
  }

  const waText = useMemo(
    () => `Halo ${c.registration_admin?.name || 'Admin'}, saya ${p.full_name} sudah mendaftar campaign "${c.title}" (${c.code}) di CreatorHub.`,
    [c, p.full_name],
  );

  if (done || c.already_applied) {
    const wa = waLink(c.registration_admin?.wa, waText);
    return (
      <div className="rounded-panel border border-line p-7 sm:p-9">
        <CircleCheck className="size-9 text-moss" />
        <h2 className="mt-4 text-2xl font-bold tracking-[-0.02em]">{done?.already || c.already_applied ? 'Anda sudah terdaftar' : 'Pendaftaran terkirim'}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          {done?.already || c.already_applied
            ? 'Pendaftaran Anda untuk campaign ini sudah kami terima sebelumnya. Tidak ada pendaftaran ganda yang dibuat.'
            : 'Tim kami akan meninjau profil Anda. Status seleksi dapat dipantau dari dashboard CreatorHub.'}
        </p>
        {done?.newAccount && (
          <p className="mt-4 rounded-control bg-iris-50 px-4 py-3 text-sm text-iris-700">
            Akun CreatorHub Anda sudah dibuat. Gunakan email dan password tadi untuk masuk berikutnya.
          </p>
        )}
        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          {wa && !c.already_applied && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-control bg-iris px-5 text-sm font-semibold text-white hover:bg-iris-700">
              Konfirmasi ke {c.registration_admin?.name || 'admin'} via WhatsApp
            </a>
          )}
          <LinkButton href="/applications" variant="secondary" size="lg" className="h-11">Lihat status pendaftaran</LinkButton>
        </div>
      </div>
    );
  }

  if (wrongRole) {
    return (
      <div className="rounded-panel border border-line p-7">
        <h2 className="text-lg font-bold">Anda masuk sebagai akun {me!.role === 'ADMIN' ? 'Admin' : 'Brand'}</h2>
        <p className="mt-2 text-sm text-muted">Pendaftaran campaign hanya untuk akun creator. Keluar terlebih dahulu untuk mendaftar dengan email creator.</p>
        <form action="/auth/signout" method="post" className="mt-5"><Button variant="secondary">Keluar</Button></form>
      </div>
    );
  }

  if (closed) {
    return (
      <div className="rounded-panel border border-line p-7 sm:p-9">
        <h2 className="text-xl font-bold">{avail?.status === 'SCHEDULED' ? 'Pendaftaran belum dibuka' : 'Pendaftaran ditutup'}</h2>
        <p className="mt-2 text-[15px] text-ink-2">{c.registration_enabled ? avail?.message : 'Pendaftaran creator sedang dinonaktifkan.'}</p>
        <p className="mt-6 text-sm text-muted">Pantau campaign lain di <Link href="/marketplace" className="font-semibold text-iris hover:underline">Campaign Marketplace</Link> setelah masuk.</p>
      </div>
    );
  }

  const section = 'space-y-5 border-t border-line pt-7 first:border-t-0 first:pt-0';

  return (
    <form onSubmit={submit} noValidate className="rounded-panel border border-line p-6 sm:p-8">
      <h2 className="text-xl font-bold tracking-[-0.01em]">Daftar sebagai creator</h2>
      <p className="mt-1 text-sm text-muted">Sekitar 3 menit. Jawaban tersimpan ke profil Anda untuk pendaftaran berikutnya.</p>

      <div className="mt-8 space-y-7">
        <div className={section}>
          <h3 className="text-[15px] font-bold">Akun</h3>
          {signedIn ? (
            <p className="rounded-control bg-paper px-4 py-3 text-sm text-ink-2">Mendaftar sebagai <b>{me!.email}</b></p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1 rounded-control bg-paper p-1 text-sm font-semibold" role="tablist">
                {(['new', 'existing'] as const).map((m) => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                    className={cx('h-9 rounded-md transition-colors', mode === m ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]' : 'text-muted')}>
                    {m === 'new' ? 'Akun baru' : 'Sudah punya akun'}
                  </button>
                ))}
              </div>
              <Field label="Email" required error={errors.email} htmlFor="j-email">
                <Input id="j-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
              </Field>
              <Field label="Password" required error={errors.password} hint={mode === 'new' ? 'Minimal 8 karakter. Dipakai untuk masuk ke dashboard creator.' : undefined} htmlFor="j-pw">
                <div className="relative">
                  <Input id="j-pw" type={showPw ? 'text' : 'password'} autoComplete={mode === 'new' ? 'new-password' : 'current-password'}
                    value={password} onChange={(e) => setPassword(e.target.value)} className="pr-11" aria-invalid={!!errors.password} />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 text-muted" aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}>
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>
              {mode === 'new' && (
                <Field label="Ulangi password" required error={errors.confirm} htmlFor="j-pw2">
                  <Input id="j-pw2" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} />
                </Field>
              )}
            </>
          )}
        </div>

        <div className={section}>
          <h3 className="text-[15px] font-bold">Data diri</h3>
          <Field label="Nama lengkap" required error={errors.full_name} htmlFor="j-name">
            <Input id="j-name" autoComplete="name" value={p.full_name} onChange={(e) => set('full_name', e.target.value)} aria-invalid={!!errors.full_name} />
          </Field>
          <Field label="Nomor WhatsApp" required error={errors.phone} htmlFor="j-phone">
            <Input id="j-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xx" value={p.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={!!errors.phone} />
          </Field>
          <Field label="Domisili" required error={errors.city}>
            <div data-error={!!errors.city}><ChipSelect single options={[{ value: 'Jabodetabek', label: 'Jabodetabek' }, { value: 'Luar Jabodetabek', label: 'Luar Jabodetabek' }]}
              value={p.city ? [p.city] : []} onChange={(v) => set('city', v[0])} name="Domisili" /></div>
          </Field>
          <Field label="Gender">
            <ChipSelect single options={[{ value: 'FEMALE', label: 'Perempuan' }, { value: 'MALE', label: 'Laki-laki' }]} value={p.gender ? [p.gender] : []} onChange={(v) => set('gender', v[0])} name="Gender" />
          </Field>
        </div>

        <div className={section}>
          <h3 className="text-[15px] font-bold">Profil konten</h3>
          <Field label="Platform yang Anda gunakan" required error={errors.platforms}>
            <div data-error={!!errors.platforms}><ChipSelect options={PLATFORMS} value={p.platforms} onChange={(v) => set('platforms', v)} name="Platform" /></div>
          </Field>
          {p.platforms.map((pl) => {
            const handle = pl as 'instagram' | 'tiktok' | 'youtube';
            const fk = `followers_${pl}` as keyof typeof p;
            return (
              <div key={pl} className="grid gap-4 sm:grid-cols-2">
                <Field label={pl === 'youtube' ? 'Channel YouTube' : `Username ${platformLabel(pl)}`}>
                  <Input value={p[handle] as string} onChange={(e) => set(handle, e.target.value)} placeholder={pl === 'youtube' ? 'youtube.com/@channel' : '@username'} />
                </Field>
                <Field label={pl === 'youtube' ? 'Subscribers' : 'Followers'}>
                  <Input type="number" min={0} inputMode="numeric" value={p[fk] as string} onChange={(e) => set(fk, e.target.value)} />
                </Field>
              </div>
            );
          })}
          <Field label="Kategori konten">
            <ChipSelect options={CATEGORIES.map((x) => ({ value: x, label: x }))} value={p.categories} onChange={(v) => set('categories', v)} name="Kategori" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rata-rata engagement rate (%)" hint="Opsional. Contoh: 3.5">
              <Input type="number" min={0} step="0.1" inputMode="decimal" value={p.engagement_rate} onChange={(e) => set('engagement_rate', e.target.value)} />
            </Field>
            <Field label="Link portfolio" hint="Opsional">
              <Input type="url" placeholder="https://" value={p.portfolio_url} onChange={(e) => set('portfolio_url', e.target.value)} />
            </Field>
          </div>
        </div>

        {questions.length > 0 && (
          <div className={section}>
            <h3 className="text-[15px] font-bold">Pertanyaan dari {c.brand_name}</h3>
            {questions.map((q) => (
              <div key={q.id} data-error={!!errors[q.id]}>
                <QuestionInput q={q} value={answers[q.id]} onChange={(v) => setAnswers((s) => ({ ...s, [q.id]: v }))} error={errors[q.id]} />
              </div>
            ))}
          </div>
        )}
      </div>

      {formError && <p className="mt-6 rounded-control bg-rose-50 px-4 py-3 text-sm text-rose" role="alert">{formError}</p>}
      <Button type="submit" size="lg" className="mt-8 w-full" loading={loading}>Kirim pendaftaran</Button>
    </form>
  );
}

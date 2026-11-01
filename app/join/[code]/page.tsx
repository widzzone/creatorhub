import Link from 'next/link';
import type { Metadata } from 'next';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { date, daysUntil, number, period, platformLabel, rupiah } from '@/lib/format';
import { BrandMark } from '@/components/app/brand-mark';
import { JoinForm } from './join-form';

type Params = { params: Promise<{ code: string }> };

const load = cache(async (code: string) => {
  const supabase = await createClient();
  const [{ data: campaign }, { data: auth }] = await Promise.all([
    supabase.rpc('get_public_campaign', { p_code: code }),
    supabase.auth.getUser(),
  ]);
  let me: any = null;
  if (auth?.user) {
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from('profiles').select('role, email, full_name, phone').eq('id', auth.user.id).maybeSingle(),
      supabase.from('talent_profiles').select('*').eq('user_id', auth.user.id).maybeSingle(),
    ]);
    me = p ? { ...p, talent: t } : null;
  }
  return { campaign, me };
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const { campaign } = await load(code);
  return campaign
    ? { title: `Daftar: ${campaign.title}`, description: `${campaign.brand_name} mencari creator. ${String(campaign.description).slice(0, 140)}` }
    : { title: 'Campaign tidak ditemukan' };
}

export default async function JoinPage({ params }: Params) {
  const { code } = await params;
  const { campaign: c, me } = await load(code);

  if (!c) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <BrandMark className="mb-10" />
        <h1 className="text-2xl font-bold">Campaign tidak ditemukan</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">Link pendaftaran mungkin salah ketik atau campaign belum dipublikasikan. Periksa kembali link dari tim kami.</p>
      </main>
    );
  }

  const left = c.close_date ? daysUntil(c.close_date) : null;
  const facts: [string, React.ReactNode][] = [
    ['Periode konten', period(c.start_date, c.end_date)],
    ['Platform', c.platforms.map(platformLabel).join(', ')],
    ['Kategori', c.categories.join(', ')],
    ['Creator dibutuhkan', `${c.creator_needed} orang`],
  ];
  if (c.min_followers) facts.push(['Followers', `Minimal ${number(c.min_followers)}`]);
  if (c.preferred_city) facts.push(['Domisili', c.preferred_city]);
  if (c.product_required) facts.push(['Produk', 'Dikirim ke creator terpilih']);

  return (
    <main className="min-h-dvh bg-surface">
      <header className="border-b border-line-2">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <BrandMark />
          {me ? (
            <Link href="/dashboard" className="text-[13px] font-semibold text-iris hover:underline">Dashboard saya</Link>
          ) : (
            <Link href={`/login?next=/join/${c.code}`} className="text-[13px] font-semibold text-ink-2 hover:text-ink">Sudah punya akun? Masuk</Link>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-16 lg:py-16">
        <section className="lg:sticky lg:top-10 lg:self-start">
          <p className="text-sm font-semibold text-iris">{c.brand_name}</p>
          <h1 className="mt-3 text-[38px] leading-[1.04] font-bold tracking-[-0.035em] text-balance sm:text-[52px]">{c.title}</h1>
          <p className="mt-5 max-w-xl text-[16px] leading-[1.7] whitespace-pre-line text-ink-2">{c.description}</p>

          <div className="mt-9 flex flex-wrap items-end gap-x-10 gap-y-6 border-t border-line pt-7">
            <div>
              <p className="text-[13px] text-muted">Fee per creator</p>
              <p className="mt-1 text-[34px] leading-none font-bold tracking-[-0.03em] tabular">{c.payment_amount ? rupiah(c.payment_amount) : 'Sesuai kesepakatan'}</p>
              {c.benefit && <p className="mt-2 text-sm text-muted">+ {c.benefit}</p>}
            </div>
            {c.close_date && (
              <div>
                <p className="text-[13px] text-muted">Pendaftaran ditutup</p>
                <p className="mt-1 text-[17px] font-semibold">{date(c.close_date, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {left !== null && left >= 0 && <p className="mt-0.5 text-sm text-iris">{left === 0 ? 'Hari terakhir' : `${left} hari lagi`}</p>}
              </div>
            )}
          </div>

          <dl className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[13px] text-muted">{k}</dt>
                <dd className="mt-0.5 text-[15px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {c.deliverables && (
            <div className="mt-8">
              <p className="text-[13px] text-muted">Deliverables</p>
              <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-line">{c.deliverables}</p>
            </div>
          )}
          {c.creator_profile && (
            <div className="mt-6">
              <p className="text-[13px] text-muted">Creator yang kami cari</p>
              <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-line">{c.creator_profile}</p>
            </div>
          )}
        </section>

        <section>
          <JoinForm campaign={c} me={me} />
          <p className="mt-6 text-center text-xs leading-relaxed text-muted">
            {c.organization && c.organization.trim().toLowerCase() !== 'creatorhub' ? `Diselenggarakan oleh ${c.organization} melalui CreatorHub.` : 'Diselenggarakan melalui CreatorHub.'} Data Anda hanya digunakan untuk proses seleksi dan kerja sama campaign.
          </p>
        </section>
      </div>
    </main>
  );
}

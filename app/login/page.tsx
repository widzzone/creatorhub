import type { Metadata } from 'next';
import { BrandMark } from '@/components/app/brand-mark';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Masuk' };

const STAGES = ['Recruitment', 'Screening', 'Job offer', 'Brand approval', 'Brief', 'Draft', 'Publikasi', 'Insight', 'Pembayaran', 'Report'];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const { next, reason } = await searchParams;
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink px-14 py-12 text-white lg:flex">
        <BrandMark inverted />
        <div className="max-w-xl">
          <h1 className="text-[44px] leading-[1.06] font-bold tracking-[-0.035em] xl:text-[54px]">
            Satu jalur kerja untuk setiap creator campaign.
          </h1>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-white/65">
            Pantau pendaftar, keputusan Brand, draft, link tayang, insight, dan pembayaran tanpa berpindah antara spreadsheet dan chat.
          </p>
          <ol className="mt-12 space-y-0" aria-label="Tahapan workflow">
            {STAGES.map((s, i) => (
              <li key={s} className="flex items-center gap-4 border-t border-white/10 py-2.5 text-sm">
                <span className="w-6 text-white/35 tabular">{String(i + 1).padStart(2, '0')}</span>
                <span className={i < 6 ? 'text-white' : 'text-white/45'}>{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-white/40">StarCore Analytics</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><BrandMark /></div>
          <h2 className="text-[26px] font-bold tracking-[-0.02em]">Masuk ke CreatorHub</h2>
          <p className="mt-1.5 text-sm text-muted">Gunakan email dan password akun Anda.</p>
          {reason === 'inactive' && (
            <p className="mt-5 rounded-control bg-rose-50 px-4 py-3 text-sm text-rose">Akun Anda tidak aktif. Hubungi administrator.</p>
          )}
          <LoginForm next={next} />
          <p className="mt-8 text-[13px] leading-relaxed text-muted">
            Creator baru? Daftar melalui link recruitment campaign yang dibagikan tim kami. Akun dibuat otomatis saat mendaftar.
          </p>
        </div>
      </section>
    </main>
  );
}

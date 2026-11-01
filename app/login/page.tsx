import type { Metadata } from 'next';
import { BrandMark } from '@/components/app/brand-mark';
import { LoginShowcase } from '@/components/app/login-showcase';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Masuk' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const { next, reason } = await searchParams;
  const year = new Date().getFullYear();

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Panel kiri: identitas produk dan animasi 11 tahap SOP */}
      <section className="hidden flex-col bg-ink px-12 py-11 text-white lg:flex xl:px-16">
        <BrandMark inverted animated />

        <div className="flex flex-1 flex-col justify-center py-16">
          <h1 className="max-w-[19ch] text-[34px] leading-[1.15] font-semibold tracking-[-0.028em] xl:text-[42px]">
            Kelola creator campaign dari pendaftaran sampai laporan akhir.
          </h1>
          <p className="mt-6 max-w-[42ch] text-[15px] leading-[1.7] text-white/60">
            Pendaftar, keputusan Brand, draft, link tayang, insight, dan pembayaran tercatat di satu tempat untuk tim, Brand, dan creator.
          </p>
        </div>

        <div className="border-t border-white/10 pt-7">
          <LoginShowcase />
          <p className="mt-10 flex justify-between text-xs text-white/35">
            <span>StarCore Analytics</span>
            <span className="tabular">© {year}</span>
          </p>
        </div>
      </section>

      {/* Panel kanan: form masuk */}
      <section className="flex flex-col px-5 py-10 sm:px-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[400px]">
            <div className="mb-8 lg:hidden"><BrandMark /></div>

            <div className="rounded-panel border border-line bg-surface px-6 py-8 sm:px-9 sm:py-10">
              <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Masuk</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">Gunakan email dan password akun Anda.</p>
              {reason === 'inactive' && (
                <p className="mt-6 rounded-control bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose" role="alert">
                  Akun Anda tidak aktif. Hubungi administrator untuk mengaktifkannya kembali.
                </p>
              )}
              <LoginForm next={next} />
            </div>

            <p className="mx-auto mt-6 max-w-[40ch] text-center text-[13px] leading-relaxed text-balance text-muted">
              Creator baru? Akun dibuat otomatis saat Anda mendaftar lewat link recruitment campaign.
            </p>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-faint lg:hidden">StarCore Analytics</p>
      </section>
    </main>
  );
}

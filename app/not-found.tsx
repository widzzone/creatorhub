import { LinkButton } from '@/components/ui/primitives';
import { BrandMark } from '@/components/app/brand-mark';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <BrandMark className="mb-10" />
      <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">Link mungkin sudah tidak berlaku, atau Anda tidak memiliki akses ke data ini.</p>
      <LinkButton href="/dashboard" className="mt-6">Ke Overview</LinkButton>
    </main>
  );
}

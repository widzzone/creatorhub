'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { BrandMark } from '@/components/app/brand-mark';
import { Button, Field, Input } from '@/components/ui/primitives';

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const code = params.get('code');
    (async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return setError('Link reset sudah kedaluwarsa atau sudah dipakai. Minta link baru dari halaman masuk.');
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setError('Link reset tidak valid. Minta link baru dari halaman masuk.');
      setReady(true);
    })();
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error('Password minimal 8 karakter.');
    if (pw !== pw2) return toast.error('Konfirmasi password tidak sama.');
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Password diperbarui.');
    router.replace('/dashboard');
  }

  return (
    <div className="w-full max-w-sm">
      <BrandMark className="mb-10" />
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Buat password baru</h1>
      {error ? (
        <p className="mt-4 text-sm text-rose">{error}</p>
      ) : !ready ? (
        <p className="mt-4 text-sm text-muted">Memeriksa link…</p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="Password baru" hint="Minimal 8 karakter."><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
          <Field label="Ulangi password"><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></Field>
          <Button type="submit" size="lg" className="w-full" loading={loading}>Simpan password</Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <Suspense><ResetForm /></Suspense>
    </main>
  );
}

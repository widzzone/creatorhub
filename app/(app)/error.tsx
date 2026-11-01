'use client';

import { useEffect } from 'react';
import { Button, LinkButton, Panel } from '@/components/ui/primitives';
import { CircleAlert } from '@/components/ui/icons';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const offline = /fetch|network/i.test(error.message);
  return (
    <Panel className="mx-auto mt-10 max-w-lg text-center">
      <CircleAlert className="mx-auto size-8 text-rose" />
      <h1 className="mt-4 text-lg font-bold">{offline ? 'Server tidak dapat dihubungi' : 'Halaman ini tidak dapat dimuat'}</h1>
      <p className="mt-2 text-sm text-muted">
        {offline ? 'Periksa koneksi internet Anda, lalu coba lagi.' : error.message && !error.digest ? error.message : 'Terjadi kesalahan saat memuat data. Coba lagi, atau kembali ke Overview.'}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={reset}>Coba lagi</Button>
        <LinkButton href="/dashboard" variant="secondary">Ke Overview</LinkButton>
      </div>
    </Panel>
  );
}

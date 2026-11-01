'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button, Field, Input } from '@/components/ui/primitives';
import { Dialog } from '@/components/ui/dialog';
import { Eye, EyeOff } from '@/components/ui/icons';

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      setLoading(false);
      setError(/invalid/i.test(error.message) ? 'Email atau password tidak sesuai.' : error.message);
      return;
    }
    await supabase.rpc('touch_last_login');
    const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
    router.replace(target);
    router.refresh();
  }

  async function sendReset() {
    if (!resetEmail.includes('@')) return toast.error('Masukkan email akun Anda.');
    setResetLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setResetLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Link reset password dikirim. Periksa inbox email Anda.');
    setResetOpen(false);
  }

  return (
    <>
      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
        </Field>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="text-[13px] font-semibold text-ink-2">Password</label>
            <button type="button" onClick={() => { setResetEmail(email); setResetOpen(true); }}
              className="text-[13px] font-medium text-iris hover:text-iris-700 hover:underline">
              Lupa password?
            </button>
          </div>
          <div className="relative">
            <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} className="pr-11" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-ink"
              aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        {error && <p className="rounded-control bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose" role="alert">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>Masuk</Button>
      </form>
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} title="Reset password" description="Kami kirim link untuk membuat password baru." width="sm"
        footer={<><Button variant="secondary" onClick={() => setResetOpen(false)}>Batal</Button><Button loading={resetLoading} onClick={sendReset}>Kirim link reset</Button></>}>
        <Field label="Email akun"><Input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} /></Field>
      </Dialog>
    </>
  );
}

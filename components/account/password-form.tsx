'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button, Field, Input, Panel, PanelTitle } from '../ui/primitives';

export function PasswordForm({ email }: { email: string }) {
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <Panel>
      <PanelTitle title="Ganti password" />
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        if (pw.length < 8) return toast.error('Password baru minimal 8 karakter.');
        if (pw !== pw2) return toast.error('Konfirmasi password tidak sama.');
        setLoading(true);
        const supabase = createClient();
        const { error: e1 } = await supabase.auth.signInWithPassword({ email, password: cur });
        if (e1) { setLoading(false); return toast.error('Password saat ini tidak sesuai.'); }
        const { error } = await supabase.auth.updateUser({ password: pw });
        setLoading(false);
        if (error) return toast.error(error.message);
        setCur(''); setPw(''); setPw2('');
        toast.success('Password diperbarui');
      }}>
        <Field label="Password saat ini"><Input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label="Password baru" hint="Minimal 8 karakter."><Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Field label="Ulangi password baru"><Input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
        <Button type="submit" variant="secondary" loading={loading}>Ganti password</Button>
      </form>
    </Panel>
  );
}

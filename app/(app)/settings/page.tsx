import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/primitives';
import { SettingsForm } from '@/components/account/settings-form';
import { PasswordForm } from '@/components/account/password-form';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const me = await requireUser(['ADMIN']);
  const supabase = await createClient();
  const [{ data: settings }, { data: audit }] = await Promise.all([
    supabase.from('settings').select('*').order('key'),
    supabase.from('audit_log').select('id, action, entity_type, created_at, actor:profiles(full_name)').order('created_at', { ascending: false }).limit(40),
  ]);
  return (
    <>
      <PageHeader title="Settings" description="Pengaturan aplikasi, akun Anda, dan jejak aktivitas." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        <SettingsForm settings={(settings ?? []) as any[]} audit={(audit ?? []) as any[]} />
        <PasswordForm email={me.email} />
      </div>
    </>
  );
}

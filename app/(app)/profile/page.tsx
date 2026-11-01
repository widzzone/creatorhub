import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/primitives';
import { PasswordForm } from '@/components/account/password-form';
import { BrandProfileForm, TalentProfileForm } from '@/components/account/profile-forms';
import { BankForm } from '@/components/payments/payments';

export const metadata: Metadata = { title: 'Profil' };

export default async function ProfilePage() {
  const me = await requireUser(['TALENT', 'BRAND']);
  const supabase = await createClient();

  if (me.role === 'BRAND') {
    const { data: b } = await supabase.from('brand_profiles').select('*').eq('user_id', me.id).maybeSingle();
    return (
      <>
        <PageHeader title="Company Profile" description="Informasi perusahaan yang tampil pada campaign Anda." />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
          <BrandProfileForm b={b ?? {}} />
          <PasswordForm email={me.email} />
        </div>
      </>
    );
  }

  const [{ data: t }, { data: bank }] = await Promise.all([
    supabase.from('talent_profiles').select('*').eq('user_id', me.id).maybeSingle(),
    supabase.from('talent_bank_accounts').select('*').eq('user_id', me.id).maybeSingle(),
  ]);
  const bk = bank ?? { bank_name: '', bank_account: '', bank_holder: '' };
  return (
    <>
      <PageHeader title="My Profile" description={`Profil ${t?.profile_completeness ?? 0}% lengkap. Profil yang lengkap memudahkan tim mencocokkan Anda dengan campaign.`} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <TalentProfileForm me={me} t={t ?? {}} />
        <div className="space-y-6">
          <BankForm bank={bk} complete={!!(bk.bank_name && bk.bank_account && bk.bank_holder)} />
          <PasswordForm email={me.email} />
        </div>
      </div>
    </>
  );
}

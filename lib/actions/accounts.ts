'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

type Result = { ok: true; message: string; tempPassword?: string } | { ok: false; message: string };

async function assertAdmin() {
  const me = await getCurrentUser();
  if (!me || me.role !== 'ADMIN' || me.status !== 'ACTIVE') throw new Error('Hanya admin yang dapat mengelola akun.');
  return me;
}

function tempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('') + '!7';
}

export async function createAccount(input: {
  role: 'BRAND' | 'ADMIN';
  email: string;
  full_name: string;
  password?: string;
  company_name?: string;
  industry?: string;
  pic_phone?: string;
  website?: string;
  address?: string;
}): Promise<Result> {
  try {
    const me = await assertAdmin();
    const email = String(input.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: 'Format email tidak valid.' };
    if (!input.full_name?.trim()) return { ok: false, message: 'Nama PIC wajib diisi.' };
    if (input.role === 'BRAND' && !input.company_name?.trim()) return { ok: false, message: 'Nama perusahaan wajib diisi.' };
    const password = input.password?.trim() || tempPassword();
    if (password.length < 8) return { ok: false, message: 'Password minimal 8 karakter.' };

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: input.role, company_name: input.company_name?.trim() ?? '' },
      user_metadata: { full_name: input.full_name.trim(), phone: input.pic_phone ?? '' },
    });
    if (error) {
      return { ok: false, message: /already|exists|registered/i.test(error.message) ? 'Email ini sudah terdaftar sebagai akun lain.' : error.message };
    }
    const uid = data.user.id;
    if (input.role === 'BRAND') {
      await admin.from('brand_profiles').update({
        company_name: input.company_name!.trim(), industry: input.industry ?? '', pic_name: input.full_name.trim(),
        pic_phone: (input.pic_phone ?? '').replace(/\D/g, '').replace(/^0/, '62'), website: input.website ?? '', address: input.address ?? '',
      }).eq('user_id', uid);
    }
    await admin.from('profiles').update({ phone: (input.pic_phone ?? '').replace(/\D/g, '').replace(/^0/, '62') }).eq('id', uid);
    await admin.from('audit_log').insert({ actor_id: me.id, action: 'CREATE_ACCOUNT', entity_type: 'USER', entity_id: uid, details: { role: input.role, email } });
    revalidatePath('/brands');
    return { ok: true, message: 'Akun dibuat.', tempPassword: input.password ? undefined : password };
  } catch (e: any) {
    return { ok: false, message: e.message || 'Gagal membuat akun.' };
  }
}

export async function resetUserPassword(userId: string, password?: string): Promise<Result> {
  try {
    const me = await assertAdmin();
    const pw = password?.trim() || tempPassword();
    if (pw.length < 8) return { ok: false, message: 'Password minimal 8 karakter.' };
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, { password: pw });
    if (error) return { ok: false, message: error.message };
    await admin.from('audit_log').insert({ actor_id: me.id, action: 'RESET_PASSWORD', entity_type: 'USER', entity_id: userId, details: {} });
    return { ok: true, message: 'Password direset.', tempPassword: password ? undefined : pw };
  } catch (e: any) {
    return { ok: false, message: e.message || 'Gagal mereset password.' };
  }
}

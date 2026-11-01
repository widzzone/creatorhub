import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Public campaign registration.
 * 1. Creates the creator account (new) or signs in (existing) server-side, so the
 *    flow works regardless of the project's email-confirmation setting.
 * 2. Calls register_for_campaign() as that user — all business rules live in SQL.
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Permintaan tidak valid.' }, { status: 400 });
  }
  const code = String(body.code || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const mode = body.mode === 'existing' ? 'existing' : 'new';
  const profile = body.profile ?? {};
  if (!code) return NextResponse.json({ message: 'Campaign tidak ditemukan.' }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let newAccount = false;
  if (!user) {
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ field: 'email', message: 'Format email tidak valid.' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ field: 'password', message: 'Password minimal 8 karakter.' }, { status: 400 });

    if (mode === 'new') {
      if (password !== String(body.confirm || '')) {
        return NextResponse.json({ field: 'confirm', message: 'Konfirmasi password tidak sama.' }, { status: 400 });
      }
      // Validate campaign before creating any account.
      const { data: pub } = await supabase.rpc('get_public_campaign', { p_code: code });
      if (!pub) return NextResponse.json({ message: 'Campaign tidak ditemukan.' }, { status: 404 });
      if (!pub.availability?.ok) return NextResponse.json({ message: pub.availability?.message }, { status: 409 });

      const admin = createAdminClient();
      const { error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: String(profile.full_name || '').trim(), phone: String(profile.phone || '') },
      });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) {
          return NextResponse.json(
            { code: 'EXISTS', field: 'password', message: 'Email ini sudah punya akun CreatorHub. Masukkan password akun tersebut untuk melanjutkan.' },
            { status: 409 },
          );
        }
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      newAccount = true;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      return NextResponse.json(
        { field: 'password', message: mode === 'existing' ? 'Email atau password tidak sesuai.' : 'Akun dibuat, tetapi gagal masuk. Coba masuk dari halaman login.' },
        { status: 401 },
      );
    }
  }

  const { data, error } = await supabase.rpc('register_for_campaign', {
    p_code: code,
    p: { ...profile, answers: body.answers ?? {} },
  });
  if (error) return NextResponse.json({ message: error.message, signedIn: true, newAccount }, { status: 400 });
  return NextResponse.json({ ok: true, newAccount, ...data });
}

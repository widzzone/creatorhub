// Membuat akun Admin pertama.
// Pemakaian: npm run create-admin -- admin@perusahaan.com "PasswordKuat123" "Nama Admin"
import { createClient } from '@supabase/supabase-js';

const [email, password, name = 'Admin CreatorHub'] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local');
if (!email || !password || password.length < 8) {
  console.error('Pemakaian: npm run create-admin -- <email> <password min 8 karakter> "<nama>"');
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await admin.auth.admin.createUser({
  email: email.toLowerCase(), password, email_confirm: true,
  app_metadata: { role: 'ADMIN' }, user_metadata: { full_name: name },
});
if (error) { console.error('Gagal:', error.message); process.exit(1); }
console.log(`Admin dibuat: ${data.user.email}. Masuk di /login lalu ganti password dari menu Settings.`);

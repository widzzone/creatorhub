# CreatorHub V5 — Next.js + Supabase

Recruitment OS untuk creator campaign: recruitment, screening, job offer, approval Brand, brief, draft, publikasi, insight, pembayaran, report, dan closing — dibangun ulang dari CreatorHub V4.1.1 (Apps Script + Google Sheets) ke **Next.js di Vercel** dan **Supabase (Postgres + Auth + Realtime)**.

## Apa yang berubah dari V4.1.1

| Area | V4.1.1 | V5 |
|---|---|---|
| Database | Google Sheets | Supabase Postgres dengan foreign key, constraint, dan index |
| Backend | Apps Script `doPost` + proxy Vercel | Fungsi Postgres (RPC) — atomik per transaksi, tanpa cold start |
| Auth | Tabel Users + hash manual + token sesi | Supabase Auth (bcrypt, refresh token, reset password via email) |
| Hak akses | Dicek di kode Apps Script | Row Level Security di database + cek role di setiap fungsi |
| Rekening & Fit Score | Disaring di response | Tabel terpisah (`talent_bank_accounts`, `application_scores`) yang secara fisik tidak bisa dibaca Brand / Talent |
| Chat & notifikasi | Polling | Realtime |
| Export PDF | Temporary Google Spreadsheet + UrlFetch | Print stylesheet (Simpan sebagai PDF dari browser) |
| Export Excel | Apps Script | ExcelJS di browser (Summary, Creator Performance, Funnel) |

Semua aturan bisnis V4.1.1 dipertahankan: recruitment independen dari workflow, `closeDate` inclusive, target pendaftar ≠ creator dibutuhkan, Recommendation (≥70 / 50–69 / <50) tanpa angka untuk Admin/Brand dan tersembunyi dari Talent, brief boleh tanpa link, insight hanya setelah publikasi terverifikasi, PROCESSING/PAID diblokir tanpa rekening lengkap, PAID wajib bukti transfer, closing butuh semua creator dibayar + final report (atau tutup paksa dengan alasan).

## Struktur

```
app/                    Halaman (App Router)
  (app)/                Area login: dashboard, campaigns, candidates, content, messages, ...
  join/[code]/          Halaman pendaftaran publik (link recruitment)
  api/register/         Pembuatan akun creator + pendaftaran campaign
components/             UI (design system di components/ui)
lib/                    Supabase client, konstanta status, format, export Excel, server actions
supabase/
  migrations/           Skema + fungsi workflow (untuk Supabase CLI)
  setup.sql             Gabungan kedua migrasi — untuk ditempel di SQL Editor
  tests/                Skenario uji end-to-end SQL
scripts/                create-admin & seed-demo
```

## Deploy (±20 menit)

### 1. Supabase

1. Buat project di [supabase.com](https://supabase.com) — region **Southeast Asia (Singapore)**.
2. **SQL Editor → New query**, tempel seluruh isi `supabase/setup.sql`, klik **Run**.
   (Atau dengan CLI: `supabase link` lalu `supabase db push`.)
3. **Authentication → Sign In / Providers → Email**: biarkan Email aktif. Pendaftaran creator berjalan lewat server (akun langsung terkonfirmasi), jadi pengaturan *Confirm email* tidak menghalangi alur registrasi.
4. **Authentication → URL Configuration**: isi *Site URL* dengan domain Vercel Anda dan tambahkan `https://<domain>/auth/reset` ke *Redirect URLs* (untuk reset password).
5. **Project Settings → API**: catat `Project URL`, `anon`/publishable key, dan `service_role`/secret key.

### 2. Vercel

1. Push folder ini ke repository GitHub (private), lalu **Import** di Vercel. Framework terdeteksi otomatis sebagai Next.js.
2. Environment Variables (Production + Preview):

| Nama | Nilai |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key — tandai **Sensitive** |
| `NEXT_PUBLIC_SITE_URL` | `https://creatorhub-starcore.vercel.app` (domain produksi) |

3. Deploy.

### 3. Admin pertama

```bash
cp .env.example .env.local   # isi nilainya
npm install
npm run create-admin -- admin@starcore.co "PasswordKuat123" "Nama Admin"
```

Alternatif tanpa terminal: buat user di Supabase **Authentication → Users → Add user** (centang *Auto confirm*), lalu jalankan di SQL Editor:

```sql
update public.profiles set role = 'ADMIN' where email = 'admin@starcore.co';
```

Setelah login, buka **Settings** untuk mengisi nama & WhatsApp admin registrasi dan jangka pembayaran (default H+7).

### 4. (Opsional) Data demo

```bash
DEMO_ADMIN_EMAIL=admin@starcore.co DEMO_ADMIN_PASSWORD="PasswordKuat123" npm run seed-demo
```

Membuat 1 brand, 4 creator, 1 campaign dengan recruitment terbuka dan 4 pendaftar dengan Recommendation berbeda.

## Pengembangan lokal

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # pemeriksaan TypeScript
```

Link recruitment lama `https://domain/?campaign=<KODE>` otomatis diarahkan ke `/join/<KODE>`.

## Keamanan

- Tabel tidak memiliki policy insert/update/delete: semua perubahan lewat fungsi RPC yang memvalidasi role, kepemilikan campaign, dan urutan workflow.
- Role ADMIN/BRAND hanya dapat diberikan melalui `app_metadata` (service role). Pendaftar publik selalu menjadi TALENT meskipun mengirim metadata lain.
- `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di server (`/api/register` dan server action pembuatan akun). Jangan beri prefix `NEXT_PUBLIC_`.
- Aksi penting tercatat di `audit_log` dan terlihat di Settings serta riwayat kandidat.

## Menguji database

Skenario `supabase/tests/workflow_e2e.sql` menjalankan alur lengkap (setup → pendaftaran → shortlist → offer → Brand → brief → revisi → publikasi → insight ditolak & dikirim ulang → rekening → PAID → report → closing) plus 24 pemeriksaan aturan dan isolasi data. Jalankan pada Postgres lokal kosong:

```bash
psql -d test -f supabase/tests/local_supabase_stub.sql   # tiruan skema auth Supabase
psql -d test -f supabase/setup.sql
psql -d test -f supabase/tests/workflow_e2e.sql
```

## Migrasi data dari V4.1.1

Skema baru memakai nama kolom snake_case yang sepadan dengan sheet lama (`Campaigns.creatorNeeded` → `campaigns.creator_needed`, dst.). Karena akun pindah ke Supabase Auth, password lama tidak dapat dibawa: impor creator dengan `auth.admin.createUser` lalu minta mereka memakai **Lupa password**. Untuk campaign yang sedang berjalan, paling aman menyelesaikannya di V4.1.1 dan memulai campaign baru di V5.

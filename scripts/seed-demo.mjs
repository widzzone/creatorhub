// Data demo untuk uji coba (brand, 4 creator, 1 campaign dengan pendaftar).
// Membutuhkan akun admin yang sudah ada:
//   DEMO_ADMIN_EMAIL=... DEMO_ADMIN_PASSWORD=... npm run seed-demo
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } = process.env;
if (!url || !anon || !service || !DEMO_ADMIN_EMAIL || !DEMO_ADMIN_PASSWORD) {
  throw new Error('Butuh NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD');
}
const admin = createClient(url, service, { auth: { persistSession: false } });
const PW = 'Demo12345!';
const as = async (email) => {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: email === DEMO_ADMIN_EMAIL ? DEMO_ADMIN_PASSWORD : PW });
  if (error) throw new Error(`${email}: ${error.message}`);
  return c;
};
const ensure = async (email, meta, app = {}) => {
  const { error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, user_metadata: meta, app_metadata: app });
  if (error && !/already|exists|registered/i.test(error.message)) throw error;
};
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

await ensure('brand.demo@creatorhub.test', { full_name: 'Rina Hapsari' }, { role: 'BRAND', company_name: 'Kopi Senja (Demo)' });
const creators = [
  ['nadia.demo@creatorhub.test', 'Nadia Putri', 'Jabodetabek', ['instagram', 'tiktok'], ['Food & Beverage', 'Lifestyle'], 48200, 31000, 5.1, 'Ya', '12000'],
  ['salsa.demo@creatorhub.test', 'Salsabila Rahma', 'Jabodetabek', ['instagram'], ['Food & Beverage'], 21900, 0, 4.2, 'Ya', '6500'],
  ['bagas.demo@creatorhub.test', 'Bagas Wicaksono', 'Luar Jabodetabek', ['tiktok'], ['Lifestyle'], 0, 12800, 3.4, 'Ya', '2500'],
  ['fajar.demo@creatorhub.test', 'Fajar Nugroho', 'Luar Jabodetabek', ['youtube'], ['Gaming'], 0, 0, 1.2, 'Tidak', '400'],
];
for (const [email, name] of creators) await ensure(email, { full_name: name });

const a = await as(DEMO_ADMIN_EMAIL);
const { data: brand } = await admin.from('profiles').select('id').eq('email', 'brand.demo@creatorhub.test').single();
const today = new Date();
const d = (n) => new Date(today.getTime() + n * 86400000).toISOString().slice(0, 10);
const campaignId = must(await a.rpc('save_campaign', {
  p_id: null,
  p: {
    brand_id: brand.id, title: 'Kopi Senja Ramadan Series (Demo)', description: 'Review menu takjil dan kopi susu edisi Ramadan di gerai Jabodetabek.',
    objective: 'Awareness menu Ramadan', creator_profile: 'Food reviewer, audiens 18–34', creator_needed: 2, platforms: ['instagram', 'tiktok'],
    categories: ['Food & Beverage', 'Lifestyle'], min_followers: 5000, min_engagement: 2.5, preferred_city: 'Jabodetabek', payment_amount: 1750000,
    start_date: d(7), end_date: d(40), deliverables: '1 Reels 30–60 detik\n3 Story dengan link sticker', brief_note: 'Wajib mention @kopisenja dan #RamadanDiSenja.',
    product_required: true, broadcast_message: 'Halo creator! Kopi Senja mencari food creator Jabodetabek untuk Ramadan Series.',
  },
  p_questions: [
    { question_text: 'Apakah kamu rutin membuat konten kuliner?', question_type: 'YES_NO', required: true, screening_enabled: true, screening_operator: 'EQUALS', screening_value: 'Ya', weight: 10 },
    { question_text: 'Rata-rata views Reels 30 hari terakhir', question_type: 'NUMBER', required: true, screening_enabled: true, screening_operator: 'GTE', screening_value: '3000', weight: 10 },
  ],
}));
must(await a.rpc('update_recruitment', { p_campaign: campaignId, p_status: 'OPEN', p_open_date: null, p_close_date: d(14), p_target: 50 }));
const { data: c } = await admin.from('campaigns').select('code').eq('id', campaignId).single();
const { data: qs } = await admin.from('campaign_questions').select('id, display_order').eq('campaign_id', campaignId).order('display_order');

for (const [email, name, city, platforms, categories, ig, tt, er, q1, q2] of creators) {
  const t = await as(email);
  must(await t.rpc('register_for_campaign', {
    p_code: c.code,
    p: { full_name: name, phone: '0812' + Math.floor(10000000 + Math.random() * 89999999), city, platforms, categories,
      followers_instagram: ig, followers_tiktok: tt, engagement_rate: er, answers: { [qs[0].id]: q1, [qs[1].id]: q2 } },
  }));
}
console.log(`Selesai. Link pendaftaran: /join/${c.code}`);
console.log(`Akun demo (password ${PW}): brand.demo@creatorhub.test dan ${creators.map((x) => x[0]).join(', ')}`);

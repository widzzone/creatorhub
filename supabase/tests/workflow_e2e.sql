\set ON_ERROR_STOP 1
\pset pager off
-- ---------- helpers ----------
create or replace function test_as(p uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(p::text, ''), false)
$$;
grant execute on function test_as(uuid) to authenticated, anon;

-- expect_error: run statement, assert it raises containing text
create or replace function expect_error(p_sql text, p_contains text) returns text language plpgsql as $$
begin
  execute p_sql;
  raise exception 'EXPECTED ERROR NOT RAISED: % (wanted "%")', p_sql, p_contains;
exception when others then
  if sqlerrm like 'EXPECTED ERROR NOT RAISED%' then raise; end if;
  if position(p_contains in sqlerrm) = 0 then raise exception 'Wrong error for %: got "%" wanted "%"', p_sql, sqlerrm, p_contains; end if;
  return 'ok: ' || sqlerrm;
end $$;
grant execute on function expect_error(text, text) to authenticated, anon;

-- ---------- users ----------
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'admin@starcore.co', '{"role":"ADMIN"}', '{"full_name":"Debra Admin"}'),
 ('00000000-0000-0000-0000-00000000000b', 'brand@kopi.id', '{"role":"BRAND","company_name":"Kopi Senja"}', '{"full_name":"Rina PIC"}'),
 ('00000000-0000-0000-0000-00000000000c', 'other@brand.id', '{"role":"BRAND","company_name":"Other Co"}', '{"full_name":"Other"}'),
 ('00000000-0000-0000-0000-000000000001', 'ayu@creator.id', '{}', '{"full_name":"Ayu"}'),
 ('00000000-0000-0000-0000-000000000002', 'bima@creator.id', '{}', '{"full_name":"Bima"}'),
 ('00000000-0000-0000-0000-000000000003', 'hacker@creator.id', '{}', '{"full_name":"H","role":"ADMIN"}');

select id, role, full_name from profiles order by email;
select 'brand profile' t, company_name from brand_profiles;

\set ADMIN '''00000000-0000-0000-0000-00000000000a'''
\set BRAND '''00000000-0000-0000-0000-00000000000b'''
\set OTHER '''00000000-0000-0000-0000-00000000000c'''
\set AYU '''00000000-0000-0000-0000-000000000001'''
\set BIMA '''00000000-0000-0000-0000-000000000002'''
\set HACK '''00000000-0000-0000-0000-000000000003'''

-- ---------- campaign setup (admin) ----------
set role authenticated;
select null from test_as(:ADMIN);
select save_campaign(null, jsonb_build_object(
  'brand_id', :BRAND, 'title', 'Kopi Senja Ramadan Series', 'description', 'Konten review menu Ramadan',
  'creator_needed', 2, 'platforms', jsonb_build_array('Instagram','TikTok'), 'categories', jsonb_build_array('Food & Beverage','Lifestyle'),
  'min_followers', 5000, 'min_engagement', 2, 'preferred_city', 'Jabodetabek', 'payment_amount', 1500000,
  'start_date', '2026-11-01', 'end_date', '2026-11-30', 'deliverables', '1 Reels + 3 Story', 'product_required', true),
  jsonb_build_array(
    jsonb_build_object('question_text', 'Apakah kamu suka kopi?', 'question_type', 'YES_NO', 'required', true,
                       'screening_enabled', true, 'screening_operator', 'EQUALS', 'screening_value', 'Ya', 'weight', 10),
    jsonb_build_object('question_text', 'Berapa rata-rata views Reels?', 'question_type', 'NUMBER', 'required', true,
                       'screening_enabled', true, 'screening_operator', 'GTE', 'screening_value', '3000', 'weight', 10),
    jsonb_build_object('question_text', 'Saya setuju dengan syarat', 'question_type', 'CONSENT', 'required', true)
  )) as campaign_id \gset
select code from campaigns where id = :'campaign_id' \gset
select expect_error($$select save_campaign(null, '{"title":"x"}'::jsonb)$$, 'Pilih Brand');

-- Recruitment still closed: public view says closed
reset role; set role anon; select null from test_as(null);
select (get_public_campaign(:'code'))->'availability'->>'reason' as reason_before_open;
reset role; set role authenticated; select null from test_as(:ADMIN);
select update_recruitment(:'campaign_id', 'OPEN', null, null, 3)->>'message' as open_msg;
select status, registration_status from campaigns where id = :'campaign_id';

-- ---------- anon public page ----------
reset role; set role anon; select null from test_as(null);
select jsonb_array_length(get_public_campaign(:'code')->'questions') as q_count,
       get_public_campaign(:'code')->'availability'->>'ok' as open_ok;
select expect_error($$select count(*) from campaigns$$, 'permission denied');
select expect_error($$select save_campaign(null, '{}'::jsonb)$$, 'permission denied');

-- ---------- registration ----------
reset role; set role authenticated; select null from test_as(:ADMIN);
select id as q1 from campaign_questions where display_order = 1 \gset
select id as q2 from campaign_questions where display_order = 2 \gset
select id as q3 from campaign_questions where display_order = 3 \gset

select null from test_as(:AYU);
select expect_error(format($$select register_for_campaign(%L, jsonb_build_object('full_name','Ayu','phone','0812345678','city','Jakarta Selatan',
  'answers', jsonb_build_object(%L,'Ya',%L,'abc',%L,'true')))$$, :'code', :'q1', :'q2', :'q3'), 'harus berupa angka');
select expect_error(format($$select register_for_campaign(%L, jsonb_build_object('full_name','Ayu','phone','0812345678','city','Jakarta Selatan',
  'answers', jsonb_build_object(%L,'Ya',%L,'5000')))$$, :'code', :'q1', :'q2'), 'Saya setuju');
select register_for_campaign(:'code', jsonb_build_object('full_name','Ayu Lestari','phone','0812-3456-7890','city','Jakarta Selatan',
  'platforms', jsonb_build_array('instagram','tiktok'), 'categories', jsonb_build_array('Food & Beverage'),
  'instagram','@ayu','followers_instagram','12000','followers_tiktok','8000','engagement_rate','4.5','gender','FEMALE',
  'answers', jsonb_build_object(:'q1','Ya',:'q2','5000',:'q3','true'))) as r1;
select register_for_campaign(:'code', jsonb_build_object('full_name','Ayu Lestari','phone','0812','city','Jakarta',
  'answers', '{}'::jsonb))->>'already_applied' as dup;
select city, platforms, followers_instagram, profile_completeness from talent_profiles where user_id = :AYU;

select null from test_as(:BIMA);
select register_for_campaign(:'code', jsonb_build_object('full_name','Bima','phone','0899999999','city','Luar Jabodetabek',
  'platforms', jsonb_build_array('youtube'), 'categories', jsonb_build_array('Gaming'),
  'followers_youtube','900', 'answers', jsonb_build_object(:'q1','Tidak',:'q2','100',:'q3','true'))) as r2;

select null from test_as(:HACK);
select role from profiles where id = :HACK;
select expect_error($$select candidate_pipeline()$$, 'tidak memiliki akses');

-- ---------- RLS isolation ----------
select null from test_as(:AYU);
select 'ayu sees scores' t, count(*) from application_scores;
select 'ayu sees apps' t, count(*) from applications;
select 'ayu sees campaign' t, count(*) from campaigns;
select null from test_as(:OTHER);
select 'other brand sees campaign' t, count(*) from campaigns;
select 'other brand sees talents' t, count(*) from talent_profiles;
select jsonb_array_length(candidate_pipeline()) as other_pipeline_len;
select null from test_as(:BRAND);
select 'brand sees apps' t, count(*) from applications;
select 'brand sees talents' t, count(*) from talent_profiles;
select 'brand sees bank' t, count(*) from talent_bank_accounts;
select 'brand sees scores' t, count(*) from application_scores;

-- ---------- pipeline & shortlist ----------
select null from test_as(:ADMIN);
select x->>'talent_name' as name, x->>'recommendation' as rec, x->>'fit_score' as score
from jsonb_array_elements(candidate_pipeline(:'campaign_id')) x;
select (x->>'id')::uuid as ayu_app from jsonb_array_elements(candidate_pipeline(:'campaign_id')) x where x->>'talent_name' = 'Ayu Lestari' \gset
select (x->>'id')::uuid as bima_app from jsonb_array_elements(candidate_pipeline(:'campaign_id')) x where x->>'talent_name' = 'Bima' \gset
select shortlist_preview(:'campaign_id', 50, 0, 0)->'summary' as preview_summary;
select apply_shortlist(:'campaign_id', array[:'ayu_app'::uuid], 'Lolos screening') as shortlisted;
select expect_error(format($$select submit_to_brand(%L)$$, :'ayu_app'), 'harus menyatakan bersedia');
select send_job_offer(:'ayu_app', 1750000, null, null, null);
select status, offer_fee from applications where id = :'ayu_app';

select null from test_as(:AYU);
select respond_job_offer(:'ayu_app', true, 'Siap!');
select null from test_as(:ADMIN);
select submit_to_brand(:'ayu_app', 'Profil kuat di F&B');
select expect_error(format($$select send_brief(%L)$$, :'ayu_app'), 'setelah creator disetujui');

select null from test_as(:OTHER);
select expect_error(format($$select brand_decision(%L, 'APPROVED')$$, :'ayu_app'), 'tidak dapat diakses');
select null from test_as(:BRAND);
select brand_decision(:'ayu_app', 'APPROVED', 'Cocok');
select status, amount from payments where application_id = :'ayu_app';

-- ---------- brief & content ----------
select null from test_as(:AYU);
select expect_error(format($$select submit_draft(%L, 'https://drive.google.com/x')$$, :'ayu_app'), 'setelah brief');
select null from test_as(:ADMIN);
select send_brief(:'ayu_app', 'Fokus ke menu takjil, tone hangat.', '');
select save_product_delivery(:'ayu_app', '{"product_name":"Paket Takjil","courier":"JNE","tracking_number":"JN123","status":"SHIPPED"}');
select status from applications where id = :'ayu_app';
select null from test_as(:AYU);
select expect_error(format($$select submit_draft(%L, 'drive/x')$$, :'ayu_app'), 'http');
select submit_draft(:'ayu_app', 'https://drive.google.com/file/d/v1', 'Caption v1') as sub1 \gset
select expect_error(format($$select submit_draft(%L, 'https://drive.google.com/file/d/v1b')$$, :'ayu_app'), 'masih dalam review');
select null from test_as(:ADMIN);
select expect_error(format($$select review_submission(%L, 'REVISION', '')$$, :'sub1'), 'catatan revisi');
select review_submission(:'sub1', 'REVISION', 'Tambahkan close-up produk');
select null from test_as(:AYU);
select submit_draft(:'ayu_app', 'https://drive.google.com/file/d/v2', 'Caption v2') as sub2 \gset
select expect_error(format($$select submit_publication(%L, 'instagram', 'https://instagram.com/p/1', current_date)$$, :'ayu_app'), 'harus disetujui');
select null from test_as(:BRAND);
select review_submission(:'sub2', 'APPROVED', 'Mantap')->>'next_action' as next_action;
select expect_error(format($$select review_submission(%L, 'APPROVED')$$, :'sub2'), 'sudah direview');

-- ---------- publication & insight ----------
select null from test_as(:AYU);
select expect_error(format($$select submit_insight(%L, '{"evidence_url":"https://drive.google.com/e"}')$$, :'ayu_app'), 'setelah link publikasi diverifikasi');
select submit_publication(:'ayu_app', 'instagram', 'https://instagram.com/reel/abc', current_date) as pub1 \gset
select null from test_as(:ADMIN);
select verify_publication(:'pub1', true);
select null from test_as(:AYU);
select expect_error(format($$select submit_insight(%L, '{"evidence_url":"https://drive.google.com/e","reach":"100","likes":"500"}')$$, :'ayu_app'), 'tidak realistis');
select submit_insight(:'ayu_app', '{"evidence_url":"https://drive.google.com/e","views":"25000","reach":"18000","impressions":"30000","likes":"1200","comments":"80","shares":"40","saves":"90"}') as ins1 \gset
select null from test_as(:ADMIN);
select verify_insight(:'ins1', false, 'Screenshot reach terpotong');
select status from applications where id = :'ayu_app';
select null from test_as(:AYU);
select submit_insight(:'ayu_app', '{"evidence_url":"https://drive.google.com/e2","views":"25000","reach":"18000","impressions":"30000","likes":"1200","comments":"80","shares":"40","saves":"90"}') as ins2 \gset
select null from test_as(:BRAND);
select verify_insight(:'ins2', true);
select a.status app_status, p.status pay_status, p.due_date is not null as has_due from applications a join payments p on p.application_id = a.id where a.id = :'ayu_app';

-- ---------- payment ----------
select null from test_as(:ADMIN);
select id as pay from payments where application_id = :'ayu_app' \gset
select expect_error(format($$select update_payment(%L, '{"status":"PROCESSING"}')$$, :'pay'), 'rekening creator belum lengkap');
select request_bank_details(:'pay') as requested;
select null from test_as(:AYU);
select expect_error($$select save_bank_details('BCA', '12ab', 'Ayu')$$, 'hanya boleh berisi angka');
select save_bank_details('BCA', '1234-567-890', 'Ayu Lestari');
select x->'bank'->>'bank_account' as ayu_sees_own_bank from jsonb_array_elements(payment_list()) x;
select null from test_as(:BRAND);
select x->'bank' as brand_sees_bank, x->>'bank_complete' as complete from jsonb_array_elements(payment_list()) x;
select null from test_as(:ADMIN);
select update_payment(:'pay', '{"status":"PROCESSING"}');
select expect_error(format($$select update_payment(%L, '{"status":"PAID"}')$$, :'pay'), 'Bukti transfer');
select update_payment(:'pay', '{"status":"PAID","proof_url":"https://drive.google.com/proof"}');
select expect_error(format($$select update_payment(%L, '{"status":"PROCESSING"}')$$, :'pay'), 'terkunci');

-- ---------- report & closing ----------
select r->'summary' as summary, r->'metrics'->>'aggregate_er' as er, r->'closing_checklist' as checklist, r->>'ready_to_close' as ready
from (select campaign_report(:'campaign_id') r) z;
select expect_error(format($$select close_campaign(%L, 'done')$$, :'campaign_id'), 'final report');
select save_campaign_report(:'campaign_id', '', 'Campaign mencapai 25 ribu views dengan ER 7,5%.');
select status from campaigns where id = :'campaign_id';
select x->'steps' -> 9 ->> 'done' as payment_step_done from jsonb_array_elements(campaign_sop(:'campaign_id')) x;
select close_campaign(:'campaign_id', 'Selesai sesuai target');
select status, registration_status from campaigns where id = :'campaign_id';
select status from applications where id = :'ayu_app';
reset role; set role anon;
select (get_public_campaign(:'code'))->'availability'->>'reason' as reason_after_close;
reset role; set role authenticated;
select null from test_as(:HACK);
select expect_error(format($$select register_for_campaign(%L, '{"full_name":"x","phone":"081234567","city":"Jakarta"}')$$, :'code'), 'sudah selesai');

-- ---------- dashboards / chat / misc ----------
select null from test_as(:ADMIN);
select dashboard_summary() - 'recent_applications' as admin_dash;
select null from test_as(:AYU);
select dashboard_summary() as talent_dash;
select count(*) as ayu_chat_msgs from chat_messages;
select send_chat_message(:'ayu_app', 'Terima kasih kak!') is not null as sent;
select null from test_as(:BRAND);
select dashboard_summary() as brand_dash;
select null from test_as(:ADMIN);
select application_detail(:'ayu_app')->'timeline' -> 0 ->> 'action' as last_action,
       jsonb_array_length(application_detail(:'ayu_app')->'timeline') as timeline_len;
select null from test_as(:AYU);
select application_detail(:'ayu_app')->'score' as ayu_score_hidden;
select count(*) as ayu_notifications from notifications;
select mark_notifications_read();
select count(*) filter (where not is_read) as unread_after from notifications;
select expect_error($$select update_settings('{"PAYMENT_TERM_DAYS":"14"}')$$, 'tidak memiliki akses');

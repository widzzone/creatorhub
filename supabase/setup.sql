-- CreatorHub V5 — full database setup.
-- Paste seluruh isi file ini ke Supabase Dashboard → SQL Editor → Run (sekali saja pada project baru).

-- =============================================================================
-- CreatorHub V5 — Supabase schema
-- Recruitment OS untuk creator campaign.
-- Semua penulisan data melalui fungsi RPC (security definer) di migrasi 0002;
-- tabel hanya dapat dibaca sesuai Row Level Security.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Settings
-- -----------------------------------------------------------------------------
create table if not exists public.settings (
  key         text primary key,
  value       text not null default '',
  description text not null default '',
  updated_at  timestamptz not null default now()
);

insert into public.settings (key, value, description) values
  ('PAYMENT_TERM_DAYS', '7', 'Jangka pembayaran (H+) setelah publikasi dan insight terverifikasi'),
  ('ALLOW_TALENT_REGISTRATION', 'TRUE', 'Izinkan creator mendaftar melalui link recruitment'),
  ('REGISTRATION_ADMIN_NAME', 'Admin CreatorHub', 'Nama admin yang dihubungi creator setelah mendaftar'),
  ('REGISTRATION_ADMIN_WA', '', 'Nomor WhatsApp admin registrasi (format 08xx atau 628xx)'),
  ('ORGANIZATION_NAME', 'StarCore Analytics', 'Nama organisasi pada laporan dan halaman publik')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Users / profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'TALENT' check (role in ('ADMIN','BRAND','TALENT')),
  email       text not null,
  full_name   text not null default '',
  phone       text not null default '',
  status      text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','PENDING')),
  avatar_url  text,
  last_login  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);

create table if not exists public.talent_profiles (
  user_id               uuid primary key references public.profiles(id) on delete cascade,
  display_name          text not null default '',
  bio                   text not null default '',
  city                  text not null default '',
  gender                text not null default '' check (gender in ('','MALE','FEMALE')),
  birth_date            date,
  categories            text[] not null default '{}',
  platforms             text[] not null default '{}',
  instagram             text not null default '',
  tiktok                text not null default '',
  youtube               text not null default '',
  followers_instagram   bigint not null default 0 check (followers_instagram >= 0),
  followers_tiktok      bigint not null default 0 check (followers_tiktok >= 0),
  followers_youtube     bigint not null default 0 check (followers_youtube >= 0),
  engagement_rate       numeric(6,2) not null default 0 check (engagement_rate >= 0),
  portfolio_url         text not null default '',
  rate_card             numeric(14,0) not null default 0,
  verification_status   text not null default 'PENDING' check (verification_status in ('PENDING','VERIFIED','REJECTED')),
  profile_completeness  int not null default 0,
  tags                  text[] not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Rekening dipisah dari profil agar Brand tidak pernah dapat membacanya.
create table if not exists public.talent_bank_accounts (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  bank_name    text not null default '',
  bank_account text not null default '',
  bank_holder  text not null default '',
  updated_at   timestamptz not null default now()
);

create table if not exists public.brand_profiles (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  company_name text not null default '',
  industry     text not null default '',
  pic_name     text not null default '',
  pic_phone    text not null default '',
  website      text not null default '',
  address      text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Campaigns
-- -----------------------------------------------------------------------------
create or replace function public._short_code() returns text
language sql volatile set search_path = public as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(decode(md5(gen_random_uuid()::text), 'hex'), i) % 31), 1), '')
  from generate_series(0, 6) as i
$$;

create table if not exists public.campaigns (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique default public._short_code(),
  brand_id              uuid not null references public.profiles(id),
  brand_name            text not null default '',
  title                 text not null,
  description           text not null default '',
  objective             text not null default '',
  creator_profile       text not null default '',
  job_type              text not null default '',
  creator_needed        int not null default 1 check (creator_needed > 0),
  platforms             text[] not null default '{}',
  categories            text[] not null default '{}',
  min_followers         bigint not null default 0,
  max_followers         bigint not null default 0,
  min_engagement        numeric(6,2) not null default 0,
  preferred_city        text not null default '',
  gender_preference     text not null default 'ALL' check (gender_preference in ('ALL','MALE','FEMALE')),
  benefit               text not null default '',
  payment_amount        numeric(14,0) not null default 0,
  start_date            date,
  end_date              date,
  deliverables          text not null default '',
  sow                   text not null default '',
  brief_url             text not null default '',
  brief_note            text not null default '',
  product_required      boolean not null default false,
  product_notes         text not null default '',
  recruitment_channels  text not null default '',
  broadcast_message     text not null default '',
  status                text not null default 'DRAFT' check (status in (
                          'DRAFT','OPEN','SCREENING','OFFER_CONFIRMATION','CLIENT_APPROVAL',
                          'PRODUCTION','PUBLISHING','REPORTING','PAYMENT','READY_TO_CLOSE',
                          'CLOSED','CANCELLED')),
  -- Recruitment control: independen dari workflow status.
  registration_status   text not null default 'CLOSED' check (registration_status in ('OPEN','CLOSED')),
  open_date             date,
  close_date            date,
  registration_target   int not null default 0 check (registration_target >= 0),
  registration_closed_at timestamptz,
  report_url            text not null default '',
  closing_note          text not null default '',
  closed_at             timestamptz,
  created_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint campaign_dates_ok check (start_date is null or end_date is null or start_date <= end_date),
  constraint campaign_reg_dates_ok check (open_date is null or close_date is null or open_date <= close_date)
);
create index if not exists campaigns_brand_idx on public.campaigns(brand_id);
create index if not exists campaigns_status_idx on public.campaigns(status);

create table if not exists public.campaign_questions (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null references public.campaigns(id) on delete cascade,
  question_text      text not null,
  question_type      text not null default 'SHORT_TEXT' check (question_type in (
                       'SHORT_TEXT','PARAGRAPH','NUMBER','EMAIL','URL','DATE',
                       'RADIO','DROPDOWN','CHECKBOX','YES_NO','CONSENT')),
  help_text          text not null default '',
  placeholder        text not null default '',
  required           boolean not null default false,
  options            text[] not null default '{}',
  profile_field      text not null default '',
  min_value          numeric,
  max_value          numeric,
  screening_enabled  boolean not null default false,
  screening_operator text not null default 'EQUALS' check (screening_operator in ('EQUALS','NOT_EQUALS','CONTAINS','GTE','LTE')),
  screening_value    text not null default '',
  weight             int not null default 0 check (weight >= 0),
  display_order      int not null default 0,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists campaign_questions_campaign_idx on public.campaign_questions(campaign_id, display_order);

create table if not exists public.question_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  questions   jsonb not null default '[]',
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Applications (candidate pipeline)
-- -----------------------------------------------------------------------------
create table if not exists public.applications (
  id                     uuid primary key default gen_random_uuid(),
  campaign_id            uuid not null references public.campaigns(id) on delete cascade,
  talent_id              uuid not null references public.profiles(id) on delete cascade,
  talent_name            text not null default '',
  source                 text not null default 'PUBLIC_LINK',
  applied_at             timestamptz not null default now(),
  status                 text not null default 'APPLIED' check (status in (
                           'INVITED','APPLIED','SCREENING','SHORTLISTED','OFFER_SENT',
                           'NEGOTIATION','CREATOR_CONFIRMED','CREATOR_DECLINED',
                           'SUBMITTED_TO_BRAND','BRAND_APPROVED','BRAND_REJECTED',
                           'REPLACEMENT_REQUIRED','BRIEF_SENT','PRODUCT_SHIPPED',
                           'CONTENT_IN_PROGRESS','DRAFT_SUBMITTED','REVISION_REQUESTED',
                           'CONTENT_APPROVED','READY_TO_PUBLISH','PUBLISHED',
                           'PUBLICATION_VERIFIED','INSIGHT_SUBMITTED','INSIGHT_VERIFIED',
                           'READY_FOR_PAYMENT','PAID','COMPLETED','REJECTED')),
  note                   text not null default '',
  admin_note             text not null default '',
  brand_decision         text not null default '' check (brand_decision in ('','APPROVED','REJECTED')),
  brand_note             text not null default '',
  availability_confirmed boolean,
  commitment_note        text not null default '',
  offer_fee              numeric(14,0),
  offer_status           text not null default '',
  offer_sent_at          timestamptz,
  offer_responded_at     timestamptz,
  submitted_to_brand_at  timestamptz,
  brand_reviewed_at      timestamptz,
  brief_sent_at          timestamptz,
  payment_eligible_at    timestamptz,
  updated_at             timestamptz not null default now(),
  unique (campaign_id, talent_id)
);
create index if not exists applications_campaign_idx on public.applications(campaign_id, status);
create index if not exists applications_talent_idx on public.applications(talent_id);

-- Skor internal dipisah agar Talent tidak pernah dapat membacanya (RLS).
create table if not exists public.application_scores (
  application_id      uuid primary key references public.applications(id) on delete cascade,
  campaign_id         uuid not null references public.campaigns(id) on delete cascade,
  fit_score           int not null default 0,
  fit_reasons         jsonb not null default '[]',
  custom_answer_score int not null default 0,
  custom_answer_max   int not null default 0,
  updated_at          timestamptz not null default now()
);

create table if not exists public.application_answers (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  campaign_id    uuid not null references public.campaigns(id) on delete cascade,
  talent_id      uuid not null references public.profiles(id) on delete cascade,
  question_id    uuid references public.campaign_questions(id) on delete set null,
  question_text  text not null,
  question_type  text not null,
  answer_value   text not null default '',
  answer_json    jsonb,
  score_awarded  int not null default 0,
  display_order  int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists application_answers_app_idx on public.application_answers(application_id);

create table if not exists public.job_offers (
  id               uuid primary key default gen_random_uuid(),
  application_id   uuid not null unique references public.applications(id) on delete cascade,
  campaign_id      uuid not null references public.campaigns(id) on delete cascade,
  talent_id        uuid not null references public.profiles(id) on delete cascade,
  fee              numeric(14,0) not null default 0,
  campaign_summary text not null default '',
  deliverables     text not null default '',
  period_text      text not null default '',
  status           text not null default 'SENT' check (status in ('SENT','ACCEPTED','DECLINED')),
  sent_at          timestamptz not null default now(),
  responded_at     timestamptz,
  response_note    text not null default '',
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.product_deliveries (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null unique references public.applications(id) on delete cascade,
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  talent_id       uuid not null references public.profiles(id) on delete cascade,
  product_name    text not null default '',
  courier         text not null default '',
  tracking_number text not null default '',
  status          text not null default 'PREPARING' check (status in ('PREPARING','SHIPPED','RECEIVED','RETURNED')),
  shipped_at      timestamptz,
  received_at     timestamptz,
  note            text not null default '',
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Content operations
-- -----------------------------------------------------------------------------
create table if not exists public.content_submissions (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  talent_id       uuid not null references public.profiles(id) on delete cascade,
  submission_type text not null default 'CONTENT_DRAFT',
  draft_url       text not null,
  caption         text not null default '',
  version         int not null default 1,
  status          text not null default 'SUBMITTED' check (status in ('SUBMITTED','APPROVED','REVISION')),
  review_note     text not null default '',
  reviewed_by     uuid references public.profiles(id),
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz
);
create index if not exists content_submissions_app_idx on public.content_submissions(application_id, version desc);
create index if not exists content_submissions_status_idx on public.content_submissions(status);

create table if not exists public.publications (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  campaign_id    uuid not null references public.campaigns(id) on delete cascade,
  talent_id      uuid not null references public.profiles(id) on delete cascade,
  platform       text not null,
  content_url    text not null,
  published_at   date not null,
  status         text not null default 'SUBMITTED' check (status in ('SUBMITTED','VERIFIED','REJECTED')),
  review_note    text not null default '',
  verified_by    uuid references public.profiles(id),
  verified_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists publications_app_idx on public.publications(application_id);

create table if not exists public.insights (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid not null references public.applications(id) on delete cascade,
  campaign_id       uuid not null references public.campaigns(id) on delete cascade,
  talent_id         uuid not null references public.profiles(id) on delete cascade,
  views             bigint not null default 0,
  reach             bigint not null default 0,
  impressions       bigint not null default 0,
  likes             bigint not null default 0,
  comments          bigint not null default 0,
  shares            bigint not null default 0,
  saves             bigint not null default 0,
  engagement_rate   numeric(8,2) not null default 0,
  evidence_url      text not null,
  audience_data_url text not null default '',
  status            text not null default 'SUBMITTED' check (status in ('SUBMITTED','VERIFIED','REJECTED')),
  review_note       text not null default '',
  verified_by       uuid references public.profiles(id),
  verified_at       timestamptz,
  submitted_at      timestamptz not null default now()
);
create index if not exists insights_app_idx on public.insights(application_id);

-- -----------------------------------------------------------------------------
-- Payments & reports
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  application_id       uuid not null unique references public.applications(id) on delete cascade,
  campaign_id          uuid not null references public.campaigns(id) on delete cascade,
  talent_id            uuid not null references public.profiles(id) on delete cascade,
  amount               numeric(14,0) not null default 0,
  status               text not null default 'PENDING_VERIFICATION' check (status in (
                         'PENDING_VERIFICATION','READY_FOR_PAYMENT','PROCESSING','PAID','CANCELLED')),
  sow_verified         boolean not null default false,
  publication_verified boolean not null default false,
  insight_verified     boolean not null default false,
  eligible_at          timestamptz,
  due_date             date,
  scheduled_date       date,
  invoice_url          text not null default '',
  proof_url            text not null default '',
  paid_at              timestamptz,
  bank_requested_at    timestamptz,
  verified_by          uuid references public.profiles(id),
  note                 text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists payments_campaign_idx on public.payments(campaign_id, status);

create table if not exists public.campaign_reports (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null unique references public.campaigns(id) on delete cascade,
  report_url       text not null default '',
  summary          text not null default '',
  total_creators   int not null default 0,
  total_published  int not null default 0,
  total_views      bigint not null default 0,
  total_reach      bigint not null default 0,
  total_engagement bigint not null default 0,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Revision chat
-- -----------------------------------------------------------------------------
create table if not exists public.chat_threads (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null unique references public.applications(id) on delete cascade,
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  talent_id       uuid not null references public.profiles(id) on delete cascade,
  last_message    text not null default '',
  last_message_at timestamptz,
  last_sender_id  uuid,
  admin_unread    int not null default 0,
  talent_unread   int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id             uuid primary key default gen_random_uuid(),
  thread_id      uuid not null references public.chat_threads(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  sender_id      uuid references public.profiles(id) on delete set null,
  sender_role    text not null,
  sender_name    text not null default '',
  message        text not null default '',
  attachment_url text not null default '',
  submission_id  uuid references public.content_submissions(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists chat_messages_thread_idx on public.chat_messages(thread_id, created_at);

-- -----------------------------------------------------------------------------
-- Notifications & audit
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  message    text not null default '',
  type       text not null default 'INFO',
  link       text not null default '',
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, is_read, created_at desc);

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text not null default '',
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_entity_idx on public.audit_log(entity_type, entity_id, created_at desc);

-- -----------------------------------------------------------------------------
-- New auth user -> profile
-- Role diambil dari app_metadata (hanya dapat diisi service role / admin),
-- sehingga pendaftar publik selalu menjadi TALENT.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := upper(coalesce(new.raw_app_meta_data->>'role', 'TALENT'));
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1));
begin
  if v_role not in ('ADMIN','BRAND','TALENT') then v_role := 'TALENT'; end if;
  insert into public.profiles (id, role, email, full_name, phone)
  values (new.id, v_role, lower(new.email), v_name, coalesce(new.raw_user_meta_data->>'phone', ''))
  on conflict (id) do nothing;

  if v_role = 'TALENT' then
    insert into public.talent_profiles (user_id, display_name) values (new.id, v_name) on conflict do nothing;
    insert into public.talent_bank_accounts (user_id) values (new.id) on conflict do nothing;
  elsif v_role = 'BRAND' then
    insert into public.brand_profiles (user_id, company_name, pic_name)
    values (new.id, coalesce(nullif(new.raw_app_meta_data->>'company_name', ''), v_name), v_name)
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Access helpers (security definer: dipakai di policy tanpa rekursi RLS)
-- -----------------------------------------------------------------------------
create or replace function public.auth_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and status = 'ACTIVE'
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() = 'ADMIN', false)
$$;

create or replace function public.can_manage_campaign(p_campaign uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.auth_role()
    when 'ADMIN' then true
    when 'BRAND' then exists (select 1 from public.campaigns c where c.id = p_campaign and c.brand_id = auth.uid())
    else false end
$$;

create or replace function public.can_view_campaign(p_campaign uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_manage_campaign(p_campaign)
      or exists (select 1 from public.applications a where a.campaign_id = p_campaign and a.talent_id = auth.uid())
$$;

create or replace function public.can_view_person(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_user = auth.uid()
      or public.is_admin()
      or (public.auth_role() = 'BRAND' and exists (
            select 1 from public.applications a join public.campaigns c on c.id = a.campaign_id
            where a.talent_id = p_user and c.brand_id = auth.uid()))
      or exists (select 1 from public.profiles p where p.id = p_user and p.role = 'ADMIN' and auth.uid() is not null)
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.settings              enable row level security;
alter table public.profiles              enable row level security;
alter table public.talent_profiles       enable row level security;
alter table public.talent_bank_accounts  enable row level security;
alter table public.brand_profiles        enable row level security;
alter table public.campaigns             enable row level security;
alter table public.campaign_questions    enable row level security;
alter table public.question_templates    enable row level security;
alter table public.applications          enable row level security;
alter table public.application_scores    enable row level security;
alter table public.application_answers   enable row level security;
alter table public.job_offers            enable row level security;
alter table public.product_deliveries    enable row level security;
alter table public.content_submissions   enable row level security;
alter table public.publications          enable row level security;
alter table public.insights              enable row level security;
alter table public.payments              enable row level security;
alter table public.campaign_reports      enable row level security;
alter table public.chat_threads          enable row level security;
alter table public.chat_messages         enable row level security;
alter table public.notifications         enable row level security;
alter table public.audit_log             enable row level security;

-- Read policies only. Tidak ada policy insert/update/delete: semua perubahan lewat RPC.
create policy settings_read on public.settings for select to authenticated using (true);
create policy profiles_read on public.profiles for select to authenticated using (public.can_view_person(id));
create policy talent_profiles_read on public.talent_profiles for select to authenticated using (public.can_view_person(user_id));
create policy bank_read on public.talent_bank_accounts for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy brand_profiles_read on public.brand_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy campaigns_read on public.campaigns for select to authenticated using (public.can_view_campaign(id));
create policy questions_read on public.campaign_questions for select to authenticated using (public.can_view_campaign(campaign_id));
create policy templates_read on public.question_templates for select to authenticated using (public.auth_role() in ('ADMIN','BRAND'));
create policy applications_read on public.applications for select to authenticated
  using (talent_id = auth.uid() or public.can_manage_campaign(campaign_id));
create policy scores_read on public.application_scores for select to authenticated using (public.can_manage_campaign(campaign_id));
create policy answers_read on public.application_answers for select to authenticated
  using (talent_id = auth.uid() or public.can_manage_campaign(campaign_id));
create policy offers_read on public.job_offers for select to authenticated
  using (talent_id = auth.uid() or public.can_manage_campaign(campaign_id));
create policy deliveries_read on public.product_deliveries for select to authenticated
  using (talent_id = auth.uid() or public.can_manage_campaign(campaign_id));
create policy submissions_read on public.content_submissions for select to authenticated
  using (talent_id = auth.uid() or public.can_manage_campaign(campaign_id));
create policy publications_read on public.publications for select to authenticated
  using (talent_id = auth.uid() or public.can_manage_campaign(campaign_id));
create policy insights_read on public.insights for select to authenticated
  using (talent_id = auth.uid() or public.can_manage_campaign(campaign_id));
create policy payments_read on public.payments for select to authenticated
  using (talent_id = auth.uid() or public.can_manage_campaign(campaign_id));
create policy reports_read on public.campaign_reports for select to authenticated using (public.can_manage_campaign(campaign_id));
create policy threads_read on public.chat_threads for select to authenticated using (talent_id = auth.uid() or public.is_admin());
create policy messages_read on public.chat_messages for select to authenticated
  using (exists (select 1 from public.chat_threads t where t.id = thread_id and (t.talent_id = auth.uid() or public.is_admin())));
create policy notifications_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy audit_read on public.audit_log for select to authenticated using (public.is_admin());

-- Anonymous visitors never read tables directly; the public join page uses get_public_campaign().
revoke all on all tables in schema public from anon;

-- Realtime untuk Revision Chat dan notifikasi (bila publication Supabase tersedia).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.chat_messages;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- =============================================================================
-- CreatorHub V5 — Workflow functions (RPC)
-- Semua aturan bisnis dari CreatorHub V4.1.1 dipindahkan ke sini sehingga
-- divalidasi di server, atomik per transaksi, dan konsisten untuk semua role.
-- Pesan error ditulis untuk ditampilkan langsung kepada pengguna.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Internal utilities
-- -----------------------------------------------------------------------------
create or replace function public._me(p_roles text[] default null) returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles;
begin
  if auth.uid() is null then raise exception 'Sesi Anda berakhir. Silakan masuk kembali.'; end if;
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Akun tidak ditemukan.'; end if;
  if me.status <> 'ACTIVE' then raise exception 'Akun Anda tidak aktif. Hubungi administrator.'; end if;
  if p_roles is not null and not (me.role = any(p_roles)) then
    raise exception 'Anda tidak memiliki akses untuk aksi ini.';
  end if;
  return me;
end $$;

create or replace function public._setting(p_key text) returns text
language sql stable security definer set search_path = public as $$
  select value from public.settings where key = p_key
$$;

create or replace function public._today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Jakarta')::date $$;

create or replace function public._notify(p_user uuid, p_title text, p_message text, p_type text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, message, type, link)
  select p_user, p_title, coalesce(p_message, ''), p_type, coalesce(p_link, '') where p_user is not null
$$;

create or replace function public._notify_admins(p_title text, p_message text, p_type text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, message, type, link)
  select id, p_title, coalesce(p_message, ''), p_type, coalesce(p_link, '')
  from public.profiles where role = 'ADMIN' and status = 'ACTIVE'
$$;

create or replace function public._audit(p_actor uuid, p_action text, p_entity text, p_entity_id text, p_details jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_actor, p_action, p_entity, coalesce(p_entity_id, ''), coalesce(p_details, '{}'))
$$;

create or replace function public._clean(p text) returns text
language sql immutable as $$ select coalesce(btrim(p), '') $$;

create or replace function public._is_url(p text) returns boolean
language sql immutable as $$ select coalesce(p, '') ~* '^https?://[^\s]+\.[^\s]+' $$;

create or replace function public._require_url(p text, p_label text) returns text
language plpgsql immutable as $$
begin
  if not public._is_url(p) then
    raise exception '% harus berupa link lengkap yang diawali http:// atau https://.', p_label;
  end if;
  return btrim(p);
end $$;

create or replace function public._optional_url(p text, p_label text) returns text
language plpgsql immutable as $$
begin
  if public._clean(p) = '' then return ''; end if;
  return public._require_url(p, p_label);
end $$;

create or replace function public._jtext_array(p jsonb) returns text[]
language sql immutable as $$
  select coalesce(array(select btrim(x) from jsonb_array_elements_text(
    case when jsonb_typeof(p) = 'array' then p
         when jsonb_typeof(p) = 'string' then to_jsonb(string_to_array(p #>> '{}', ','))
         else '[]'::jsonb end) x where btrim(x) <> ''), '{}')
$$;

create or replace function public._norm_platforms(p text[]) returns text[]
language sql immutable as $$
  select coalesce(array(select distinct case lower(btrim(x))
      when 'ig' then 'instagram' when 'tik tok' then 'tiktok' when 'yt' then 'youtube'
      else lower(btrim(x)) end
    from unnest(coalesce(p, '{}')) x where btrim(x) <> ''), '{}')
$$;

create or replace function public._norm_list(p text[]) returns text[]
language sql immutable as $$
  select coalesce(array(select distinct lower(btrim(x)) from unnest(coalesce(p, '{}')) x where btrim(x) <> ''), '{}')
$$;

create or replace function public._answer_text(v jsonb) returns text
language sql immutable as $$
  select case jsonb_typeof(v)
    when 'array' then coalesce((select string_agg(x, ', ') from jsonb_array_elements_text(v) x), '')
    when 'null' then ''
    when null then ''
    else coalesce(v #>> '{}', '') end
$$;

create or replace function public._normalize_domicile(p text) returns text
language sql immutable as $$
  select case
    when public._clean(p) = '' then ''
    when upper(btrim(p)) = 'JABODETABEK' then 'Jabodetabek'
    when upper(btrim(p)) = 'LUAR JABODETABEK' then 'Luar Jabodetabek'
    when upper(p) ~ '(JAKARTA|BOGOR|DEPOK|TANGERANG|BEKASI)' then 'Jabodetabek'
    else 'Luar Jabodetabek' end
$$;

create or replace function public._normalize_phone(p text) returns text
language sql immutable as $$
  select case
    when regexp_replace(coalesce(p, ''), '\D', '', 'g') ~ '^0' then '62' || substr(regexp_replace(p, '\D', '', 'g'), 2)
    else regexp_replace(coalesce(p, ''), '\D', '', 'g') end
$$;

-- Workflow status campaign hanya bergerak maju dan tidak pernah membuka ulang CLOSED/CANCELLED.
create or replace function public._campaign_stage_rank(p text) returns int
language sql immutable as $$
  select array_position(array['DRAFT','OPEN','SCREENING','OFFER_CONFIRMATION','CLIENT_APPROVAL',
    'PRODUCTION','PUBLISHING','REPORTING','PAYMENT','READY_TO_CLOSE','CLOSED'], p)
$$;

create or replace function public._advance_campaign(p_campaign uuid, p_status text) returns void
language sql security definer set search_path = public as $$
  update public.campaigns
     set status = p_status, updated_at = now()
   where id = p_campaign
     and status not in ('CLOSED','CANCELLED')
     and coalesce(public._campaign_stage_rank(status), 0) < public._campaign_stage_rank(p_status)
$$;

-- Status kandidat yang sudah masuk final creator list.
create or replace function public._final_statuses() returns text[]
language sql immutable as $$
  select array['BRAND_APPROVED','BRIEF_SENT','PRODUCT_SHIPPED','CONTENT_IN_PROGRESS',
    'DRAFT_SUBMITTED','REVISION_REQUESTED','CONTENT_APPROVED','READY_TO_PUBLISH',
    'PUBLISHED','PUBLICATION_VERIFIED','INSIGHT_SUBMITTED','INSIGHT_VERIFIED',
    'READY_FOR_PAYMENT','PAID','COMPLETED']
$$;

create or replace function public._recommendation(p_score int) returns text
language sql immutable as $$
  select case when p_score >= 70 then 'RECOMMENDED' when p_score >= 50 then 'CONSIDER' else 'LOW_MATCH' end
$$;

create or replace function public._get_app(p_app uuid) returns public.applications
language plpgsql stable security definer set search_path = public as $$
declare a public.applications;
begin
  select * into a from public.applications where id = p_app;
  if a.id is null then raise exception 'Data kandidat tidak ditemukan.'; end if;
  return a;
end $$;

create or replace function public._assert_campaign_active(p_campaign uuid) returns public.campaigns
language plpgsql stable security definer set search_path = public as $$
declare c public.campaigns;
begin
  select * into c from public.campaigns where id = p_campaign;
  if c.id is null then raise exception 'Campaign tidak ditemukan.'; end if;
  if c.status in ('CLOSED','CANCELLED') then
    raise exception 'Campaign sudah % sehingga tidak dapat diproses lagi.', lower(c.status);
  end if;
  return c;
end $$;

-- -----------------------------------------------------------------------------
-- Profile completeness
-- -----------------------------------------------------------------------------
create or replace function public._recompute_completeness(p_user uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles; t public.talent_profiles; b public.talent_bank_accounts; filled int := 0; v int;
begin
  select * into p from public.profiles where id = p_user;
  select * into t from public.talent_profiles where user_id = p_user;
  if t.user_id is null then return 0; end if;
  select * into b from public.talent_bank_accounts where user_id = p_user;
  filled := (case when public._clean(p.full_name) <> '' then 1 else 0 end)
          + (case when public._clean(p.phone) <> '' then 1 else 0 end)
          + (case when public._clean(t.display_name) <> '' then 1 else 0 end)
          + (case when public._clean(t.bio) <> '' then 1 else 0 end)
          + (case when public._clean(t.city) <> '' then 1 else 0 end)
          + (case when cardinality(t.categories) > 0 then 1 else 0 end)
          + (case when cardinality(t.platforms) > 0 then 1 else 0 end)
          + (case when (t.instagram || t.tiktok || t.youtube) <> '' then 1 else 0 end)
          + (case when t.followers_instagram + t.followers_tiktok + t.followers_youtube > 0 then 1 else 0 end)
          + (case when t.engagement_rate > 0 then 1 else 0 end)
          + (case when public._clean(t.portfolio_url) <> '' then 1 else 0 end)
          + (case when public._clean(b.bank_name) <> '' then 1 else 0 end)
          + (case when public._clean(b.bank_account) <> '' then 1 else 0 end);
  v := round(filled * 100.0 / 13);
  update public.talent_profiles set profile_completeness = v where user_id = p_user;
  return v;
end $$;

-- -----------------------------------------------------------------------------
-- Fit score (internal). Komponen: platform 25, kategori 25, followers 20,
-- engagement 15, domisili 10, demografi 5, kelengkapan profil 5.
-- -----------------------------------------------------------------------------
create or replace function public._relevant_followers(t public.talent_profiles, c public.campaigns) returns bigint
language plpgsql immutable as $$
declare cp text[] := public._norm_platforms(c.platforms); v bigint := 0; recognized boolean := false; x text;
begin
  foreach x in array cp loop
    if x = 'instagram' then v := greatest(v, coalesce(t.followers_instagram, 0)); recognized := true;
    elsif x = 'tiktok' then v := greatest(v, coalesce(t.followers_tiktok, 0)); recognized := true;
    elsif x = 'youtube' then v := greatest(v, coalesce(t.followers_youtube, 0)); recognized := true;
    end if;
  end loop;
  if not recognized then
    v := greatest(coalesce(t.followers_instagram, 0), coalesce(t.followers_tiktok, 0), coalesce(t.followers_youtube, 0));
  end if;
  return v;
end $$;

create or replace function public._fit(t public.talent_profiles, c public.campaigns) returns jsonb
language plpgsql immutable as $$
declare
  score int := 0; reasons jsonb := '[]'; m int; pts int;
  tp text[] := public._norm_platforms(t.platforms);
  cp text[] := public._norm_platforms(c.platforms);
  tc text[] := public._norm_list(t.categories);
  cc text[] := public._norm_list(c.categories);
  followers bigint := public._relevant_followers(t, c);
  minf bigint := coalesce(c.min_followers, 0); maxf bigint := coalesce(c.max_followers, 0);
  er numeric := coalesce(t.engagement_rate, 0); miner numeric := coalesce(c.min_engagement, 0);
  pref text := lower(public._clean(c.preferred_city)); city text := lower(public._clean(t.city));
begin
  select count(*) into m from unnest(tp) x where x = any(cp);
  if m > 0 then
    pts := least(25, round(25.0 * m / greatest(1, cardinality(cp))));
    score := score + pts; reasons := reasons || jsonb_build_object('label', 'Platform cocok', 'ok', true);
  else
    reasons := reasons || jsonb_build_object('label', 'Platform belum cocok', 'ok', false);
  end if;

  select count(*) into m from unnest(tc) x where x = any(cc);
  if m > 0 then
    pts := least(25, round(25.0 * m / greatest(1, cardinality(cc))));
    score := score + pts; reasons := reasons || jsonb_build_object('label', 'Kategori cocok', 'ok', true);
  else
    reasons := reasons || jsonb_build_object('label', 'Kategori belum cocok', 'ok', false);
  end if;

  if (minf = 0 or followers >= minf) and (maxf = 0 or followers <= maxf) then
    score := score + 20; reasons := reasons || jsonb_build_object('label', 'Followers memenuhi', 'ok', true);
  elsif minf > 0 and followers >= minf * 0.75 then
    score := score + 12; reasons := reasons || jsonb_build_object('label', 'Followers mendekati target', 'ok', true);
  elsif followers > 0 then
    score := score + 5; reasons := reasons || jsonb_build_object('label', 'Followers di luar rentang', 'ok', false);
  else
    reasons := reasons || jsonb_build_object('label', 'Followers belum diisi', 'ok', false);
  end if;

  if miner = 0 or er >= miner then
    score := score + 15; reasons := reasons || jsonb_build_object('label', 'ER memenuhi', 'ok', true);
  elsif er >= miner * 0.75 then
    score := score + 9; reasons := reasons || jsonb_build_object('label', 'ER mendekati target', 'ok', true);
  else
    reasons := reasons || jsonb_build_object('label', 'ER di bawah target', 'ok', false);
  end if;

  -- Domisili: nilai grup (Jabodetabek / Luar Jabodetabek) dibandingkan persis.
  if pref = '' or (pref in ('jabodetabek','luar jabodetabek') and city = pref)
     or (pref not in ('jabodetabek','luar jabodetabek') and city like '%' || pref || '%') then
    score := score + 10; reasons := reasons || jsonb_build_object('label', 'Domisili sesuai', 'ok', true);
  else
    reasons := reasons || jsonb_build_object('label', 'Domisili berbeda', 'ok', false);
  end if;

  if coalesce(c.gender_preference, 'ALL') = 'ALL' or upper(coalesce(t.gender, '')) = c.gender_preference then
    score := score + 5;
  else
    reasons := reasons || jsonb_build_object('label', 'Profil demografi berbeda', 'ok', false);
  end if;

  pts := round(least(5, coalesce(t.profile_completeness, 0) / 20.0));
  score := score + pts;
  if pts >= 4 then reasons := reasons || jsonb_build_object('label', 'Profil lengkap', 'ok', true); end if;

  return jsonb_build_object('score', least(100, score), 'reasons', reasons);
end $$;

-- -----------------------------------------------------------------------------
-- Custom questions: validation & screening
-- p_answers: jsonb object { "<question_id>": value | [values] }
-- -----------------------------------------------------------------------------
create or replace function public._validate_answers(p_campaign uuid, p_answers jsonb) returns void
language plpgsql stable security definer set search_path = public as $$
declare q public.campaign_questions; v jsonb; txt text; n numeric;
begin
  for q in select * from public.campaign_questions where campaign_id = p_campaign and is_active order by display_order loop
    v := p_answers -> q.id::text;
    txt := public._answer_text(v);
    if q.required and public._clean(txt) = '' then
      raise exception 'Pertanyaan wajib belum dijawab: %', q.question_text;
    end if;
    continue when public._clean(txt) = '';
    if q.question_type = 'NUMBER' then
      if txt !~ '^\s*-?\d+(\.\d+)?\s*$' then raise exception '"%" harus berupa angka.', q.question_text; end if;
      n := txt::numeric;
      if q.min_value is not null and n < q.min_value then raise exception '"%" minimal %.', q.question_text, q.min_value; end if;
      if q.max_value is not null and n > q.max_value then raise exception '"%" maksimal %.', q.question_text, q.max_value; end if;
    elsif q.question_type = 'EMAIL' and txt !~ '^\S+@\S+\.\S+$' then
      raise exception 'Format email tidak valid pada "%".', q.question_text;
    elsif q.question_type = 'URL' and not public._is_url(txt) then
      raise exception 'Link pada "%" harus diawali http:// atau https://.', q.question_text;
    elsif q.question_type = 'CONSENT' and upper(txt) <> 'TRUE' then
      raise exception 'Persetujuan wajib dicentang: %', q.question_text;
    elsif q.question_type = 'DATE' and txt !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Tanggal pada "%" tidak valid.', q.question_text;
    end if;
  end loop;
end $$;

create or replace function public._evaluate_answers(p_campaign uuid, p_answers jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  q public.campaign_questions; v jsonb; txt text; pass boolean;
  score int := 0; mx int := 0; reasons jsonb := '[]'; per jsonb := '{}';
begin
  for q in select * from public.campaign_questions
           where campaign_id = p_campaign and is_active and screening_enabled and weight > 0
           order by display_order loop
    mx := mx + q.weight;
    v := p_answers -> q.id::text;
    txt := lower(public._answer_text(v));
    pass := case q.screening_operator
      when 'GTE' then txt ~ '^\s*-?\d+(\.\d+)?\s*$' and txt::numeric >= nullif(q.screening_value, '')::numeric
      when 'LTE' then txt ~ '^\s*-?\d+(\.\d+)?\s*$' and txt::numeric <= nullif(q.screening_value, '')::numeric
      when 'CONTAINS' then position(lower(q.screening_value) in txt) > 0
      when 'NOT_EQUALS' then txt <> lower(q.screening_value)
      else txt = lower(q.screening_value) end;
    pass := coalesce(pass, false);
    if pass then score := score + q.weight; end if;
    per := per || jsonb_build_object(q.id::text, case when pass then q.weight else 0 end);
    reasons := reasons || jsonb_build_object('label', q.question_text, 'ok', pass, 'screening', true);
  end loop;
  return jsonb_build_object('score', score, 'max', mx, 'reasons', reasons, 'per_question', per);
end $$;

-- -----------------------------------------------------------------------------
-- Recruitment availability (independen dari workflow)
-- -----------------------------------------------------------------------------
create or replace function public.campaign_availability(c public.campaigns, p_count int default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare cnt int; today date := public._today();
begin
  if c.id is null then
    return jsonb_build_object('ok', false, 'status', 'CLOSED', 'reason', 'NOT_FOUND', 'message', 'Campaign tidak ditemukan.');
  end if;
  cnt := coalesce(p_count, (select count(*) from public.applications a where a.campaign_id = c.id));
  if c.status in ('CLOSED','CANCELLED') then
    return jsonb_build_object('ok', false, 'status', 'CLOSED', 'reason', c.status, 'count', cnt, 'target', c.registration_target,
      'message', case when c.status = 'CLOSED' then 'Campaign ini sudah selesai.' else 'Campaign ini dibatalkan.' end);
  end if;
  if c.registration_status <> 'OPEN' then
    return jsonb_build_object('ok', false, 'status', 'CLOSED', 'reason', 'MANUAL', 'count', cnt, 'target', c.registration_target,
      'message', 'Pendaftaran sedang ditutup oleh tim campaign.');
  end if;
  if c.open_date is not null and c.open_date > today then
    return jsonb_build_object('ok', false, 'status', 'SCHEDULED', 'reason', 'NOT_STARTED', 'count', cnt, 'target', c.registration_target,
      'opens_on', c.open_date, 'message', 'Pendaftaran dibuka mulai ' || to_char(c.open_date, 'DD-MM-YYYY') || '.');
  end if;
  -- closeDate inclusive: pada tanggal closeDate pendaftaran masih dibuka.
  if c.close_date is not null and c.close_date < today then
    return jsonb_build_object('ok', false, 'status', 'CLOSED', 'reason', 'DEADLINE', 'count', cnt, 'target', c.registration_target,
      'message', 'Batas waktu pendaftaran sudah lewat.');
  end if;
  if c.registration_target > 0 and cnt >= c.registration_target then
    return jsonb_build_object('ok', false, 'status', 'CLOSED', 'reason', 'TARGET_REACHED', 'count', cnt, 'target', c.registration_target,
      'message', 'Kuota pendaftar sudah terpenuhi.');
  end if;
  return jsonb_build_object('ok', true, 'status', 'OPEN', 'reason', 'OPEN', 'count', cnt, 'target', c.registration_target,
    'closes_on', c.close_date, 'message', 'Pendaftaran dibuka.');
end $$;

create or replace function public.recruitment_status(p_campaign uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.campaigns;
begin
  if not public.can_manage_campaign(p_campaign) then raise exception 'Campaign tidak dapat diakses.'; end if;
  select * into c from public.campaigns where id = p_campaign;
  return public.campaign_availability(c);
end $$;

-- Ringkasan publik campaign (tanpa data internal).
create or replace function public._public_campaign(c public.campaigns) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'code', c.code, 'brand_name', c.brand_name, 'title', c.title,
    'description', c.description, 'objective', c.objective, 'creator_profile', c.creator_profile,
    'job_type', c.job_type, 'creator_needed', c.creator_needed, 'platforms', c.platforms,
    'categories', c.categories, 'min_followers', c.min_followers, 'min_engagement', c.min_engagement,
    'preferred_city', c.preferred_city, 'gender_preference', c.gender_preference,
    'benefit', c.benefit, 'payment_amount', c.payment_amount, 'start_date', c.start_date,
    'end_date', c.end_date, 'deliverables', c.deliverables, 'product_required', c.product_required,
    'open_date', c.open_date, 'close_date', c.close_date,
    'availability', public.campaign_availability(c))
$$;

create or replace function public.get_public_campaign(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.campaigns;
begin
  select * into c from public.campaigns where code = upper(btrim(p_code)) or id::text = btrim(p_code);
  if c.id is null or c.status = 'DRAFT' then return null; end if;
  return public._public_campaign(c) || jsonb_build_object(
    'questions', coalesce((select jsonb_agg(jsonb_build_object(
        'id', q.id, 'question_text', q.question_text, 'question_type', q.question_type,
        'help_text', q.help_text, 'placeholder', q.placeholder, 'required', q.required,
        'options', q.options, 'min_value', q.min_value, 'max_value', q.max_value) order by q.display_order)
      from public.campaign_questions q where q.campaign_id = c.id and q.is_active), '[]'),
    'registration_admin', jsonb_build_object(
      'name', public._setting('REGISTRATION_ADMIN_NAME'),
      'wa', public._normalize_phone(public._setting('REGISTRATION_ADMIN_WA'))),
    'organization', public._setting('ORGANIZATION_NAME'),
    'registration_enabled', upper(coalesce(public._setting('ALLOW_TALENT_REGISTRATION'), 'TRUE')) = 'TRUE',
    'already_applied', exists (select 1 from public.applications a where a.campaign_id = c.id and a.talent_id = auth.uid()));
end $$;

-- -----------------------------------------------------------------------------
-- Campaign management
-- -----------------------------------------------------------------------------
create or replace function public.save_campaign(p_id uuid, p jsonb, p_questions jsonb default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles := public._me(array['ADMIN','BRAND']);
  c public.campaigns; v_brand uuid; v_brand_name text; v_id uuid; q jsonb; i int := 0; keep uuid[] := '{}'; qid uuid;
  v_type text;
begin
  if p_id is not null then
    select * into c from public.campaigns where id = p_id;
    if c.id is null then raise exception 'Campaign tidak ditemukan.'; end if;
    if not public.can_manage_campaign(p_id) then raise exception 'Campaign ini bukan milik Anda.'; end if;
    if c.status in ('CLOSED','CANCELLED') then raise exception 'Campaign yang sudah ditutup tidak dapat diubah.'; end if;
  end if;

  v_brand := case when me.role = 'BRAND' then me.id else nullif(p->>'brand_id', '')::uuid end;
  if v_brand is null then raise exception 'Pilih Brand untuk campaign ini.'; end if;
  select coalesce(nullif(bp.company_name, ''), pr.full_name) into v_brand_name
    from public.profiles pr left join public.brand_profiles bp on bp.user_id = pr.id
   where pr.id = v_brand and pr.role = 'BRAND';
  if v_brand_name is null then raise exception 'Brand yang dipilih tidak valid.'; end if;

  if public._clean(p->>'title') = '' then raise exception 'Judul campaign wajib diisi.'; end if;
  if public._clean(p->>'description') = '' then raise exception 'Deskripsi campaign wajib diisi.'; end if;
  if coalesce(nullif(p->>'creator_needed', '')::int, 0) < 1 then raise exception 'Jumlah creator yang dibutuhkan minimal 1.'; end if;
  if cardinality(public._jtext_array(p->'platforms')) = 0 then raise exception 'Pilih minimal satu platform.'; end if;
  if cardinality(public._jtext_array(p->'categories')) = 0 then raise exception 'Pilih minimal satu kategori.'; end if;
  if nullif(p->>'start_date', '') is null or nullif(p->>'end_date', '') is null then
    raise exception 'Periode campaign (tanggal mulai dan selesai) wajib diisi.';
  end if;
  if (p->>'start_date')::date > (p->>'end_date')::date then raise exception 'Tanggal selesai tidak boleh sebelum tanggal mulai.'; end if;
  perform public._optional_url(p->>'brief_url', 'Link brief');

  if p_id is null then
    insert into public.campaigns (brand_id, brand_name, title, created_by, status)
    values (v_brand, v_brand_name, btrim(p->>'title'), me.id,
            case when upper(coalesce(p->>'status', '')) = 'OPEN' then 'OPEN' else 'DRAFT' end)
    returning id into v_id;
  else
    v_id := p_id;
  end if;

  update public.campaigns set
    brand_id = v_brand, brand_name = v_brand_name,
    title = btrim(p->>'title'),
    description = public._clean(p->>'description'),
    objective = public._clean(p->>'objective'),
    creator_profile = public._clean(p->>'creator_profile'),
    job_type = public._clean(p->>'job_type'),
    creator_needed = (p->>'creator_needed')::int,
    platforms = public._norm_platforms(public._jtext_array(p->'platforms')),
    categories = public._jtext_array(p->'categories'),
    min_followers = coalesce(nullif(p->>'min_followers', '')::bigint, 0),
    max_followers = coalesce(nullif(p->>'max_followers', '')::bigint, 0),
    min_engagement = coalesce(nullif(p->>'min_engagement', '')::numeric, 0),
    preferred_city = public._clean(p->>'preferred_city'),
    gender_preference = coalesce(nullif(upper(p->>'gender_preference'), ''), 'ALL'),
    benefit = public._clean(p->>'benefit'),
    payment_amount = coalesce(nullif(p->>'payment_amount', '')::numeric, 0),
    start_date = (p->>'start_date')::date,
    end_date = (p->>'end_date')::date,
    deliverables = public._clean(p->>'deliverables'),
    sow = public._clean(p->>'sow'),
    brief_url = public._clean(p->>'brief_url'),
    brief_note = public._clean(p->>'brief_note'),
    product_required = coalesce((p->>'product_required')::boolean, false),
    product_notes = public._clean(p->>'product_notes'),
    recruitment_channels = public._clean(p->>'recruitment_channels'),
    broadcast_message = public._clean(p->>'broadcast_message'),
    updated_at = now()
  where id = v_id;

  if p_questions is not null then
    for q in select * from jsonb_array_elements(p_questions) loop
      i := i + 1;
      if public._clean(q->>'question_text') = '' then raise exception 'Teks pertanyaan ke-% wajib diisi.', i; end if;
      v_type := upper(coalesce(nullif(q->>'question_type', ''), 'SHORT_TEXT'));
      if v_type in ('RADIO','DROPDOWN','CHECKBOX') and cardinality(public._jtext_array(q->'options')) = 0 then
        raise exception 'Pertanyaan "%" membutuhkan pilihan jawaban.', q->>'question_text';
      end if;
      qid := nullif(q->>'id', '')::uuid;
      if qid is not null and exists (select 1 from public.campaign_questions where id = qid and campaign_id = v_id) then
        update public.campaign_questions set
          question_text = btrim(q->>'question_text'), question_type = v_type,
          help_text = public._clean(q->>'help_text'), placeholder = public._clean(q->>'placeholder'),
          required = coalesce((q->>'required')::boolean, false),
          options = public._jtext_array(q->'options'), profile_field = public._clean(q->>'profile_field'),
          min_value = nullif(q->>'min_value', '')::numeric, max_value = nullif(q->>'max_value', '')::numeric,
          screening_enabled = coalesce((q->>'screening_enabled')::boolean, false),
          screening_operator = coalesce(nullif(upper(q->>'screening_operator'), ''), 'EQUALS'),
          screening_value = public._clean(q->>'screening_value'),
          weight = coalesce(nullif(q->>'weight', '')::int, 0), display_order = i, is_active = true, updated_at = now()
        where id = qid;
      else
        insert into public.campaign_questions (campaign_id, question_text, question_type, help_text, placeholder,
          required, options, profile_field, min_value, max_value, screening_enabled, screening_operator,
          screening_value, weight, display_order)
        values (v_id, btrim(q->>'question_text'), v_type, public._clean(q->>'help_text'), public._clean(q->>'placeholder'),
          coalesce((q->>'required')::boolean, false), public._jtext_array(q->'options'), public._clean(q->>'profile_field'),
          nullif(q->>'min_value', '')::numeric, nullif(q->>'max_value', '')::numeric,
          coalesce((q->>'screening_enabled')::boolean, false),
          coalesce(nullif(upper(q->>'screening_operator'), ''), 'EQUALS'),
          public._clean(q->>'screening_value'), coalesce(nullif(q->>'weight', '')::int, 0), i)
        returning id into qid;
      end if;
      keep := keep || qid;
    end loop;
    delete from public.campaign_questions where campaign_id = v_id and not (id = any(keep));
  end if;

  perform public._audit(me.id, case when p_id is null then 'CREATE_CAMPAIGN' else 'UPDATE_CAMPAIGN' end,
    'CAMPAIGN', v_id::text, jsonb_build_object('title', p->>'title'));
  if p_id is null then
    perform public._notify(v_brand, 'Campaign baru dibuat', btrim(p->>'title') || ' sudah tersedia di workspace Anda.', 'CAMPAIGN', '/campaigns/' || v_id);
  end if;
  return v_id;
end $$;

create or replace function public.update_campaign_status(p_campaign uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); c public.campaigns;
begin
  select * into c from public.campaigns where id = p_campaign;
  if c.id is null then raise exception 'Campaign tidak ditemukan.'; end if;
  if p_status not in ('DRAFT','OPEN','SCREENING','OFFER_CONFIRMATION','CLIENT_APPROVAL','PRODUCTION',
                      'PUBLISHING','REPORTING','PAYMENT','READY_TO_CLOSE','CANCELLED') then
    raise exception 'Status campaign tidak valid. Gunakan Close Campaign untuk menutup.';
  end if;
  if c.status = 'CLOSED' then raise exception 'Campaign sudah ditutup.'; end if;
  update public.campaigns set status = p_status,
    registration_status = case when p_status = 'CANCELLED' then 'CLOSED' else registration_status end,
    updated_at = now() where id = p_campaign;
  perform public._audit(me.id, 'UPDATE_CAMPAIGN_STATUS', 'CAMPAIGN', p_campaign::text, jsonb_build_object('from', c.status, 'to', p_status));
end $$;

create or replace function public.delete_campaign(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); c public.campaigns;
begin
  select * into c from public.campaigns where id = p_campaign;
  if c.id is null then raise exception 'Campaign tidak ditemukan.'; end if;
  if exists (select 1 from public.payments where campaign_id = p_campaign and status = 'PAID') then
    raise exception 'Campaign yang sudah memiliki pembayaran PAID tidak dapat dihapus. Tutup campaign sebagai gantinya.';
  end if;
  delete from public.campaigns where id = p_campaign;
  perform public._audit(me.id, 'DELETE_CAMPAIGN', 'CAMPAIGN', p_campaign::text, jsonb_build_object('title', c.title));
end $$;

create or replace function public.update_recruitment(p_campaign uuid, p_status text, p_open_date date, p_close_date date, p_target int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','BRAND']); c public.campaigns; cnt int; st text := upper(p_status);
begin
  select * into c from public.campaigns where id = p_campaign;
  if c.id is null or not public.can_manage_campaign(p_campaign) then raise exception 'Campaign tidak ditemukan atau tidak dapat diubah.'; end if;
  if c.status in ('CLOSED','CANCELLED') then raise exception 'Recruitment tidak dapat diubah karena campaign sudah %.', lower(c.status); end if;
  if st not in ('OPEN','CLOSED') then raise exception 'Status recruitment harus OPEN atau CLOSED.'; end if;
  if p_open_date is not null and p_close_date is not null and p_open_date > p_close_date then
    raise exception 'Tanggal buka recruitment tidak boleh melewati tanggal tutup.';
  end if;
  select count(*) into cnt from public.applications where campaign_id = p_campaign;
  if st = 'OPEN' and p_close_date is not null and p_close_date < public._today() then
    raise exception 'Tanggal tutup sudah lewat. Perbarui atau kosongkan tanggal tutup sebelum membuka recruitment.';
  end if;
  if st = 'OPEN' and coalesce(p_target, 0) > 0 and cnt >= p_target then
    raise exception 'Target pendaftar sudah tercapai (%/%). Naikkan atau kosongkan target sebelum membuka recruitment.', cnt, p_target;
  end if;
  update public.campaigns set registration_status = st, open_date = p_open_date, close_date = p_close_date,
    registration_target = greatest(0, coalesce(p_target, 0)),
    registration_closed_at = case when st = 'CLOSED' then now() else null end,
    status = case when st = 'OPEN' and status = 'DRAFT' then 'OPEN' else status end,
    updated_at = now()
  where id = p_campaign returning * into c;
  perform public._audit(me.id, 'UPDATE_RECRUITMENT', 'CAMPAIGN', p_campaign::text,
    jsonb_build_object('status', st, 'open_date', p_open_date, 'close_date', p_close_date, 'target', p_target, 'count', cnt));
  return public.campaign_availability(c, cnt);
end $$;

-- -----------------------------------------------------------------------------
-- Talent marketplace & registration
-- -----------------------------------------------------------------------------
create or replace function public.marketplace_campaigns() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles := public._me(array['TALENT']); t public.talent_profiles;
begin
  select * into t from public.talent_profiles where user_id = me.id;
  return coalesce((
    select jsonb_agg(x.pub order by x.applied, x.score desc, x.created_at desc)
    from (
      select public._public_campaign(c) || jsonb_build_object('already_applied', a.id is not null,
               'application_status', a.status) as pub,
             (a.id is not null) as applied,
             ((public._fit(t, c))->>'score')::int as score, c.created_at
      from public.campaigns c
      left join public.applications a on a.campaign_id = c.id and a.talent_id = me.id
      where c.status not in ('DRAFT','CLOSED','CANCELLED')
        and ((public.campaign_availability(c))->>'ok')::boolean
    ) x), '[]');
end $$;

create or replace function public.register_for_campaign(p_code text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles; c public.campaigns; t public.talent_profiles; av jsonb; a public.applications;
  answers jsonb := coalesce(p->'answers', '{}'); q public.campaign_questions; v jsonb; txt text;
  fit jsonb; ev jsonb; base int; custom int; final int; reasons jsonb; domicile text;
begin
  if auth.uid() is null then raise exception 'Silakan masuk atau buat akun terlebih dahulu.'; end if;
  select * into me from public.profiles where id = auth.uid();
  if me.role <> 'TALENT' then
    raise exception 'Email ini terdaftar sebagai akun %, bukan creator. Gunakan email lain untuk mendaftar.', me.role;
  end if;
  if me.status <> 'ACTIVE' then raise exception 'Akun Anda tidak aktif. Hubungi administrator.'; end if;
  if upper(coalesce(public._setting('ALLOW_TALENT_REGISTRATION'), 'TRUE')) <> 'TRUE' then
    raise exception 'Pendaftaran creator sedang dinonaktifkan oleh administrator.';
  end if;

  select * into c from public.campaigns where code = upper(btrim(p_code)) or id::text = btrim(p_code) for update;
  if c.id is null or c.status = 'DRAFT' then raise exception 'Campaign tidak ditemukan.'; end if;

  select * into a from public.applications where campaign_id = c.id and talent_id = me.id;
  if a.id is not null then
    return jsonb_build_object('already_applied', true, 'application_id', a.id, 'campaign_title', c.title);
  end if;

  av := public.campaign_availability(c);
  if not (av->>'ok')::boolean then raise exception '%', av->>'message'; end if;

  if public._clean(p->>'full_name') = '' then raise exception 'Nama lengkap wajib diisi.'; end if;
  if length(public._normalize_phone(p->>'phone')) < 9 then raise exception 'Nomor WhatsApp tidak valid.'; end if;
  domicile := public._normalize_domicile(p->>'city');
  if domicile = '' then raise exception 'Pilih domisili: Jabodetabek atau Luar Jabodetabek.'; end if;
  perform public._validate_answers(c.id, answers);

  update public.profiles set full_name = btrim(p->>'full_name'), phone = public._normalize_phone(p->>'phone'),
    updated_at = now() where id = me.id;

  insert into public.talent_profiles (user_id) values (me.id) on conflict do nothing;
  insert into public.talent_bank_accounts (user_id) values (me.id) on conflict do nothing;

  -- Data profil standar dari form registrasi (hanya menimpa bila diisi).
  update public.talent_profiles set
    display_name = btrim(p->>'full_name'),
    city = domicile,
    gender = coalesce(nullif(upper(p->>'gender'), ''), gender),
    platforms = case when cardinality(public._jtext_array(p->'platforms')) > 0
                     then public._norm_platforms(public._jtext_array(p->'platforms')) else platforms end,
    categories = case when cardinality(public._jtext_array(p->'categories')) > 0
                      then public._jtext_array(p->'categories') else categories end,
    instagram = coalesce(nullif(public._clean(p->>'instagram'), ''), instagram),
    tiktok = coalesce(nullif(public._clean(p->>'tiktok'), ''), tiktok),
    youtube = coalesce(nullif(public._clean(p->>'youtube'), ''), youtube),
    followers_instagram = coalesce(nullif(p->>'followers_instagram', '')::bigint, followers_instagram),
    followers_tiktok = coalesce(nullif(p->>'followers_tiktok', '')::bigint, followers_tiktok),
    followers_youtube = coalesce(nullif(p->>'followers_youtube', '')::bigint, followers_youtube),
    engagement_rate = coalesce(nullif(p->>'engagement_rate', '')::numeric, engagement_rate),
    portfolio_url = coalesce(nullif(public._clean(p->>'portfolio_url'), ''), portfolio_url),
    updated_at = now()
  where user_id = me.id;

  -- Pertanyaan custom yang dipetakan ke field profil.
  for q in select * from public.campaign_questions where campaign_id = c.id and is_active and profile_field <> '' loop
    v := answers -> q.id::text; txt := public._clean(public._answer_text(v));
    continue when txt = '';
    begin
      case q.profile_field
        when 'instagram' then update public.talent_profiles set instagram = txt where user_id = me.id;
        when 'tiktok' then update public.talent_profiles set tiktok = txt where user_id = me.id;
        when 'youtube' then update public.talent_profiles set youtube = txt where user_id = me.id;
        when 'portfolio_url' then update public.talent_profiles set portfolio_url = txt where user_id = me.id;
        when 'followers_instagram' then update public.talent_profiles set followers_instagram = txt::bigint where user_id = me.id;
        when 'followers_tiktok' then update public.talent_profiles set followers_tiktok = txt::bigint where user_id = me.id;
        when 'followers_youtube' then update public.talent_profiles set followers_youtube = txt::bigint where user_id = me.id;
        when 'engagement_rate' then update public.talent_profiles set engagement_rate = replace(txt, ',', '.')::numeric where user_id = me.id;
        when 'categories' then update public.talent_profiles set categories = public._jtext_array(v) where user_id = me.id;
        when 'platforms' then update public.talent_profiles set platforms = public._norm_platforms(public._jtext_array(v)) where user_id = me.id;
        else null;
      end case;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Jawaban "%" harus berupa angka.', q.question_text;
    end;
  end loop;

  perform public._recompute_completeness(me.id);
  select * into t from public.talent_profiles where user_id = me.id;

  fit := public._fit(t, c);
  ev := public._evaluate_answers(c.id, answers);
  base := (fit->>'score')::int;
  if (ev->>'max')::int > 0 then
    custom := round((ev->>'score')::numeric * 100 / (ev->>'max')::numeric);
    final := round(base * 0.70 + custom * 0.30);
  else
    final := base;
  end if;
  reasons := (fit->'reasons') || coalesce(ev->'reasons', '[]');

  insert into public.applications (campaign_id, talent_id, talent_name, source, status, note)
  values (c.id, me.id, btrim(p->>'full_name'), coalesce(nullif(p->>'source', ''), 'PUBLIC_LINK'), 'APPLIED', public._clean(p->>'note'))
  returning * into a;

  insert into public.application_scores (application_id, campaign_id, fit_score, fit_reasons, custom_answer_score, custom_answer_max)
  values (a.id, c.id, greatest(0, least(100, final)), reasons, (ev->>'score')::int, (ev->>'max')::int);

  insert into public.application_answers (application_id, campaign_id, talent_id, question_id, question_text,
    question_type, answer_value, answer_json, score_awarded, display_order)
  select a.id, c.id, me.id, q2.id, q2.question_text, q2.question_type,
         public._answer_text(answers -> q2.id::text), answers -> q2.id::text,
         coalesce((ev->'per_question'->>q2.id::text)::int, 0), q2.display_order
  from public.campaign_questions q2 where q2.campaign_id = c.id and q2.is_active;

  perform public._notify_admins('Pendaftar baru', btrim(p->>'full_name') || ' mendaftar ke ' || c.title || '.', 'APPLICATION', '/candidates?campaign=' || c.id);
  perform public._notify(c.brand_id, 'Pendaftar baru', btrim(p->>'full_name') || ' mendaftar ke ' || c.title || '.', 'APPLICATION', '/candidates?campaign=' || c.id);
  perform public._notify(me.id, 'Pendaftaran diterima', 'Terima kasih sudah mendaftar ke ' || c.title || '. Tim kami akan meninjau profil Anda.', 'APPLICATION', '/applications');
  perform public._audit(me.id, 'REGISTER_CAMPAIGN', 'APPLICATION', a.id::text, jsonb_build_object('campaign', c.id, 'score', final));

  return jsonb_build_object('already_applied', false, 'application_id', a.id, 'campaign_title', c.title);
end $$;

-- -----------------------------------------------------------------------------
-- Candidate pipeline (Admin / Brand)
-- -----------------------------------------------------------------------------
create or replace function public.candidate_pipeline(p_campaign uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','BRAND']);
begin
  return coalesce((
    select jsonb_agg(row_json order by sort_key desc, applied_at desc)
    from (
      select jsonb_build_object(
        'id', a.id, 'campaign_id', a.campaign_id, 'campaign_title', c.title, 'campaign_code', c.code,
        'talent_id', a.talent_id, 'talent_name', a.talent_name, 'email', pr.email, 'phone', pr.phone,
        'status', a.status, 'applied_at', a.applied_at, 'updated_at', a.updated_at,
        'city', t.city, 'platforms', t.platforms, 'categories', t.categories,
        'followers', public._relevant_followers(t, c), 'engagement_rate', t.engagement_rate,
        'instagram', t.instagram, 'tiktok', t.tiktok, 'youtube', t.youtube,
        'verification_status', t.verification_status,
        'recommendation', public._recommendation(coalesce(s.fit_score, 0)),
        'fit_score', coalesce(s.fit_score, 0),
        'reasons', coalesce(s.fit_reasons, '[]'),
        'admin_note', a.admin_note, 'brand_note', a.brand_note, 'brand_decision', a.brand_decision
      ) as row_json, coalesce(s.fit_score, 0) as sort_key, a.applied_at
      from public.applications a
      join public.campaigns c on c.id = a.campaign_id
      join public.profiles pr on pr.id = a.talent_id
      left join public.talent_profiles t on t.user_id = a.talent_id
      left join public.application_scores s on s.application_id = a.id
      where (p_campaign is null or a.campaign_id = p_campaign)
        and (me.role = 'ADMIN' or c.brand_id = me.id)
    ) z), '[]');
end $$;

create or replace function public.application_detail(p_app uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me public.profiles := public._me(); a public.applications := public._get_app(p_app); c public.campaigns;
  manager boolean;
begin
  select * into c from public.campaigns where id = a.campaign_id;
  manager := public.can_manage_campaign(a.campaign_id);
  if not manager and a.talent_id <> me.id then raise exception 'Data kandidat tidak dapat diakses.'; end if;
  return jsonb_build_object(
    'application', to_jsonb(a),
    'campaign', to_jsonb(c),
    'person', (select jsonb_build_object('email', email, 'phone', phone, 'full_name', full_name) from public.profiles where id = a.talent_id),
    'talent', (select to_jsonb(t) from public.talent_profiles t where t.user_id = a.talent_id),
    'score', case when manager then (select jsonb_build_object(
                 'recommendation', public._recommendation(s.fit_score), 'fit_score', s.fit_score,
                 'reasons', s.fit_reasons, 'custom_answer_score', s.custom_answer_score, 'custom_answer_max', s.custom_answer_max)
               from public.application_scores s where s.application_id = a.id) end,
    'answers', coalesce((select jsonb_agg(jsonb_build_object('question_text', question_text, 'question_type', question_type,
                 'answer_value', answer_value) order by display_order)
               from public.application_answers where application_id = a.id), '[]'),
    'offer', (select to_jsonb(o) from public.job_offers o where o.application_id = a.id),
    'delivery', (select to_jsonb(d) from public.product_deliveries d where d.application_id = a.id),
    'submissions', coalesce((select jsonb_agg(to_jsonb(s) order by s.version desc) from public.content_submissions s where s.application_id = a.id), '[]'),
    'publications', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.publications x where x.application_id = a.id), '[]'),
    'insights', coalesce((select jsonb_agg(to_jsonb(x) order by x.submitted_at desc) from public.insights x where x.application_id = a.id), '[]'),
    'payment', (select to_jsonb(x) from public.payments x where x.application_id = a.id),
    'timeline', case when me.role = 'ADMIN' then coalesce((
                  select jsonb_agg(jsonb_build_object('action', l.action, 'at', l.created_at, 'actor', pr.full_name, 'details', l.details) order by l.created_at desc)
                  from public.audit_log l left join public.profiles pr on pr.id = l.actor_id
                  where l.entity_id = a.id::text
                     or l.entity_id in (select id::text from public.content_submissions where application_id = a.id)
                     or l.entity_id in (select id::text from public.publications where application_id = a.id)
                     or l.entity_id in (select id::text from public.insights where application_id = a.id)
                     or l.entity_id in (select id::text from public.payments where application_id = a.id)), '[]') end
  );
end $$;

create or replace function public.update_application_status(p_app uuid, p_status text, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); a public.applications := public._get_app(p_app); c public.campaigns;
begin
  c := public._assert_campaign_active(a.campaign_id);
  if p_status not in ('INVITED','APPLIED','SCREENING','SHORTLISTED','NEGOTIATION','REJECTED','REPLACEMENT_REQUIRED','CONTENT_IN_PROGRESS') then
    raise exception 'Status ini diatur otomatis oleh workflow. Gunakan aksi yang sesuai pada kandidat.';
  end if;
  update public.applications set status = p_status, admin_note = coalesce(nullif(public._clean(p_note), ''), admin_note), updated_at = now()
   where id = p_app;
  if p_status in ('SCREENING','SHORTLISTED') then perform public._advance_campaign(a.campaign_id, 'SCREENING'); end if;
  perform public._notify(a.talent_id, 'Status pendaftaran diperbarui', c.title || ': ' || case p_status
      when 'SCREENING' then 'profil Anda sedang ditinjau.'
      when 'SHORTLISTED' then 'Anda masuk shortlist.'
      when 'REJECTED' then 'profil belum dapat dilanjutkan pada campaign ini.'
      when 'CONTENT_IN_PROGRESS' then 'produksi konten sedang berjalan.'
      else 'status pendaftaran diperbarui.' end, 'APPLICATION', '/applications');
  perform public._audit(me.id, 'UPDATE_STATUS', 'APPLICATION', p_app::text, jsonb_build_object('from', a.status, 'to', p_status, 'note', p_note));
end $$;

create or replace function public.shortlist_preview(p_campaign uuid, p_min_score int default 0, p_min_followers bigint default 0,
  p_min_er numeric default 0, p_max int default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); c public.campaigns; target int; mx int; total int; rows jsonb;
begin
  select * into c from public.campaigns where id = p_campaign;
  if c.id is null then raise exception 'Pilih campaign terlebih dahulu.'; end if;
  target := greatest(1, c.creator_needed);
  mx := least(100, greatest(1, coalesce(p_max, target * 3)));
  select count(*) into total from public.applications where campaign_id = p_campaign and status in ('APPLIED','SCREENING','INVITED');
  with ranked as (
    select a.id, a.talent_name, a.status, a.applied_at, t.city, t.platforms, t.categories, t.engagement_rate,
           public._relevant_followers(t, c) as followers,
           -- Skor diperbarui dari profil terkini (70%) + jawaban screening tersimpan (30%).
           case when coalesce(s.custom_answer_max, 0) > 0
                then round(((public._fit(t, c))->>'score')::int * 0.7 + (s.custom_answer_score * 100.0 / s.custom_answer_max) * 0.3)::int
                else ((public._fit(t, c))->>'score')::int end as score,
           coalesce(s.fit_reasons, '[]') as reasons
    from public.applications a
    left join public.talent_profiles t on t.user_id = a.talent_id
    left join public.application_scores s on s.application_id = a.id
    where a.campaign_id = p_campaign and a.status in ('APPLIED','SCREENING','INVITED')
  ), eligible as (
    select *, row_number() over (order by score desc, engagement_rate desc, followers desc, applied_at asc) as rank
    from ranked
    where score >= coalesce(p_min_score, 0) and followers >= coalesce(p_min_followers, 0) and engagement_rate >= coalesce(p_min_er, 0)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'talent_name', talent_name, 'status', status, 'city', city, 'platforms', platforms,
      'categories', categories, 'followers', followers, 'engagement_rate', engagement_rate,
      'recommendation', public._recommendation(score), 'fit_score', score, 'reasons', reasons,
      'rank', rank, 'suggested', rank <= target) order by rank), '[]')
  into rows from eligible where rank <= mx;
  return jsonb_build_object('campaign', jsonb_build_object('id', c.id, 'title', c.title, 'creator_needed', c.creator_needed),
    'summary', jsonb_build_object('total', total, 'eligible', jsonb_array_length(rows), 'target', target),
    'candidates', rows);
end $$;

create or replace function public.apply_shortlist(p_campaign uuid, p_apps uuid[], p_note text default '') returns int
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); c public.campaigns; n int; r record;
begin
  c := public._assert_campaign_active(p_campaign);
  if coalesce(cardinality(p_apps), 0) = 0 then raise exception 'Pilih minimal satu kandidat untuk shortlist.'; end if;
  for r in update public.applications set status = 'SHORTLISTED', admin_note = coalesce(nullif(public._clean(p_note), ''), admin_note), updated_at = now()
           where campaign_id = p_campaign and id = any(p_apps) and status in ('APPLIED','SCREENING','INVITED')
           returning id, talent_id loop
    perform public._notify(r.talent_id, 'Masuk shortlist', c.title || ': Anda masuk shortlist. Tunggu job offer dari tim kami.', 'APPLICATION', '/applications');
  end loop;
  get diagnostics n = row_count;
  select count(*) into n from public.applications where campaign_id = p_campaign and id = any(p_apps) and status = 'SHORTLISTED';
  perform public._advance_campaign(p_campaign, 'SCREENING');
  perform public._audit(me.id, 'APPLY_SHORTLIST', 'CAMPAIGN', p_campaign::text, jsonb_build_object('applications', p_apps, 'count', n));
  return n;
end $$;

-- -----------------------------------------------------------------------------
-- Revision chat
-- -----------------------------------------------------------------------------
create or replace function public._chat_append(p_sender public.profiles, a public.applications, p_message text, p_attachment text, p_submission uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare th uuid; mid uuid;
begin
  insert into public.chat_threads (application_id, campaign_id, talent_id) values (a.id, a.campaign_id, a.talent_id)
  on conflict (application_id) do nothing;
  select id into th from public.chat_threads where application_id = a.id;
  insert into public.chat_messages (thread_id, application_id, sender_id, sender_role, sender_name, message, attachment_url, submission_id)
  values (th, a.id, p_sender.id, p_sender.role, p_sender.full_name, coalesce(p_message, ''), coalesce(p_attachment, ''), p_submission)
  returning id into mid;
  update public.chat_threads set last_message = left(coalesce(p_message, ''), 240), last_message_at = now(), last_sender_id = p_sender.id,
    admin_unread = admin_unread + case when p_sender.role = 'TALENT' then 1 else 0 end,
    talent_unread = talent_unread + case when p_sender.role = 'TALENT' then 0 else 1 end
  where id = th;
  return mid;
end $$;

create or replace function public.send_chat_message(p_app uuid, p_message text, p_attachment text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','TALENT']); a public.applications := public._get_app(p_app); c public.campaigns; mid uuid;
begin
  if me.role = 'TALENT' and a.talent_id <> me.id then raise exception 'Percakapan tidak dapat diakses.'; end if;
  if public._clean(p_message) = '' and public._clean(p_attachment) = '' then raise exception 'Tulis pesan atau lampirkan link.'; end if;
  perform public._optional_url(p_attachment, 'Lampiran');
  select * into c from public.campaigns where id = a.campaign_id;
  mid := public._chat_append(me, a, btrim(p_message), public._clean(p_attachment), null);
  if me.role = 'TALENT' then
    perform public._notify_admins('Pesan baru dari creator', a.talent_name || ' (' || c.title || ')', 'CHAT', '/messages?app=' || a.id);
  else
    perform public._notify(a.talent_id, 'Pesan baru dari tim campaign', c.title, 'CHAT', '/messages?app=' || a.id);
  end if;
  return mid;
end $$;

create or replace function public.mark_chat_read(p_app uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','TALENT']);
begin
  if me.role = 'ADMIN' then
    update public.chat_threads set admin_unread = 0 where application_id = p_app;
  else
    update public.chat_threads set talent_unread = 0 where application_id = p_app and talent_id = me.id;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Job offer & brand approval
-- -----------------------------------------------------------------------------
create or replace function public.send_job_offer(p_app uuid, p_fee numeric, p_summary text, p_deliverables text, p_period text)
returns void language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); a public.applications := public._get_app(p_app); c public.campaigns; fee numeric;
begin
  c := public._assert_campaign_active(a.campaign_id);
  if a.status not in ('SHORTLISTED','NEGOTIATION','OFFER_SENT') then
    raise exception 'Job offer hanya dapat dikirim kepada kandidat yang masuk shortlist.';
  end if;
  fee := coalesce(p_fee, c.payment_amount);
  if fee < 0 then raise exception 'Fee tidak valid.'; end if;
  insert into public.job_offers (application_id, campaign_id, talent_id, fee, campaign_summary, deliverables, period_text, status, sent_at, created_by)
  values (a.id, a.campaign_id, a.talent_id, fee,
          coalesce(nullif(public._clean(p_summary), ''), c.description),
          coalesce(nullif(public._clean(p_deliverables), ''), nullif(c.deliverables, ''), c.sow),
          coalesce(nullif(public._clean(p_period), ''), to_char(c.start_date, 'DD Mon YYYY') || ' – ' || to_char(c.end_date, 'DD Mon YYYY')),
          'SENT', now(), me.id)
  on conflict (application_id) do update set fee = excluded.fee, campaign_summary = excluded.campaign_summary,
    deliverables = excluded.deliverables, period_text = excluded.period_text, status = 'SENT',
    sent_at = now(), responded_at = null, response_note = '', updated_at = now();
  update public.applications set status = 'OFFER_SENT', offer_status = 'SENT', offer_fee = fee, offer_sent_at = now(), updated_at = now()
   where id = a.id;
  perform public._advance_campaign(a.campaign_id, 'OFFER_CONFIRMATION');
  perform public._notify(a.talent_id, 'Job offer baru', c.title || ': fee Rp ' || to_char(fee, 'FM999G999G999G999') || '. Konfirmasi kesediaan Anda di My Applications.', 'JOB_OFFER', '/applications');
  perform public._chat_append(me, a, 'Job offer untuk ' || c.title || ' telah dikirim. Silakan konfirmasi kesediaan melalui menu My Applications.', '', null);
  perform public._audit(me.id, 'SEND_JOB_OFFER', 'APPLICATION', a.id::text, jsonb_build_object('fee', fee));
end $$;

create or replace function public.respond_job_offer(p_app uuid, p_accepted boolean, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['TALENT']); a public.applications := public._get_app(p_app); c public.campaigns;
begin
  if a.talent_id <> me.id then raise exception 'Pendaftaran tidak ditemukan.'; end if;
  c := public._assert_campaign_active(a.campaign_id);
  if a.status not in ('OFFER_SENT','NEGOTIATION') then raise exception 'Belum ada job offer yang perlu dikonfirmasi.'; end if;
  update public.applications set
    status = case when p_accepted then 'CREATOR_CONFIRMED' else 'CREATOR_DECLINED' end,
    offer_status = case when p_accepted then 'ACCEPTED' else 'DECLINED' end,
    availability_confirmed = p_accepted, commitment_note = public._clean(p_note),
    offer_responded_at = now(), updated_at = now()
  where id = a.id;
  update public.job_offers set status = case when p_accepted then 'ACCEPTED' else 'DECLINED' end,
    responded_at = now(), response_note = public._clean(p_note), updated_at = now()
  where application_id = a.id;
  perform public._notify_admins('Konfirmasi job offer', a.talent_name || case when p_accepted then ' bersedia' else ' tidak bersedia' end || ' untuk ' || c.title || '.', 'JOB_OFFER', '/candidates?campaign=' || c.id);
  perform public._chat_append(me, a, case when p_accepted then 'Saya bersedia mengikuti campaign ini.' else 'Saya tidak dapat mengikuti campaign ini.' end
    || case when public._clean(p_note) <> '' then ' ' || btrim(p_note) else '' end, '', null);
  perform public._audit(me.id, 'RESPOND_JOB_OFFER', 'APPLICATION', a.id::text, jsonb_build_object('accepted', p_accepted, 'note', p_note));
end $$;

create or replace function public.submit_to_brand(p_app uuid, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); a public.applications := public._get_app(p_app); c public.campaigns;
begin
  c := public._assert_campaign_active(a.campaign_id);
  if a.status <> 'CREATOR_CONFIRMED' then raise exception 'Creator harus menyatakan bersedia sebelum diajukan ke Brand.'; end if;
  update public.applications set status = 'SUBMITTED_TO_BRAND', submitted_to_brand_at = now(),
    admin_note = coalesce(nullif(public._clean(p_note), ''), admin_note), updated_at = now() where id = a.id;
  perform public._advance_campaign(a.campaign_id, 'CLIENT_APPROVAL');
  perform public._notify(c.brand_id, 'Creator siap direview', a.talent_name || ' sudah bersedia untuk ' || c.title || '. Mohon beri keputusan.', 'APPLICATION', '/candidates?campaign=' || c.id || '&app=' || a.id);
  perform public._notify(a.talent_id, 'Diajukan ke Brand', c.title || ': profil Anda sedang ditinjau Brand.', 'APPLICATION', '/applications');
  perform public._audit(me.id, 'SUBMIT_TO_BRAND', 'APPLICATION', a.id::text, jsonb_build_object('note', p_note));
end $$;

create or replace function public._ensure_payment(a public.applications) returns void
language plpgsql security definer set search_path = public as $$
declare c public.campaigns;
begin
  select * into c from public.campaigns where id = a.campaign_id;
  insert into public.payments (application_id, campaign_id, talent_id, amount)
  values (a.id, a.campaign_id, a.talent_id, coalesce(a.offer_fee, c.payment_amount, 0))
  on conflict (application_id) do nothing;
end $$;

create or replace function public.brand_decision(p_app uuid, p_decision text, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','BRAND']); a public.applications := public._get_app(p_app); c public.campaigns;
  d text := upper(p_decision);
begin
  if not public.can_manage_campaign(a.campaign_id) then raise exception 'Kandidat tidak dapat diakses.'; end if;
  c := public._assert_campaign_active(a.campaign_id);
  if a.status <> 'SUBMITTED_TO_BRAND' then raise exception 'Kandidat belum diajukan secara resmi kepada Brand.'; end if;
  if d not in ('APPROVED','REJECTED') then raise exception 'Keputusan harus APPROVED atau REJECTED.'; end if;
  update public.applications set brand_decision = d, brand_note = public._clean(p_note),
    status = case when d = 'APPROVED' then 'BRAND_APPROVED' else 'BRAND_REJECTED' end,
    brand_reviewed_at = now(), updated_at = now()
  where id = a.id returning * into a;
  if d = 'APPROVED' then
    perform public._ensure_payment(a);
    perform public._notify(a.talent_id, 'Disetujui Brand', c.title || ': Anda masuk daftar final creator. Brief akan segera dikirim.', 'APPLICATION', '/applications');
    perform public._notify_admins('Brand menyetujui creator', a.talent_name || ' disetujui untuk ' || c.title || '. Kirim brief.', 'APPLICATION', '/candidates?campaign=' || c.id || '&app=' || a.id);
  else
    perform public._notify_admins('Kandidat perlu diganti', a.talent_name || ' ditolak Brand untuk ' || c.title || '.', 'APPLICATION', '/candidates?campaign=' || c.id);
    perform public._notify(a.talent_id, 'Hasil review Brand', c.title || ': profil belum dapat dilanjutkan pada campaign ini.', 'APPLICATION', '/applications');
  end if;
  perform public._audit(me.id, 'BRAND_DECISION', 'APPLICATION', a.id::text, jsonb_build_object('decision', d, 'note', p_note));
end $$;

-- -----------------------------------------------------------------------------
-- Brief & product delivery
-- -----------------------------------------------------------------------------
create or replace function public.send_brief(p_app uuid, p_note text default '', p_brief_url text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); a public.applications := public._get_app(p_app); c public.campaigns;
  url text; first_send boolean;
begin
  c := public._assert_campaign_active(a.campaign_id);
  if not (a.status = any(public._final_statuses())) then
    raise exception 'Brief hanya dapat dikirim setelah creator disetujui Brand.';
  end if;
  url := public._optional_url(p_brief_url, 'Link brief');
  if url <> '' and url <> c.brief_url then
    update public.campaigns set brief_url = url, updated_at = now() where id = c.id;
  end if;
  url := coalesce(nullif(url, ''), c.brief_url);
  if public._clean(p_note) <> '' then
    update public.campaigns set brief_note = btrim(p_note), updated_at = now() where id = c.id;
  end if;
  first_send := a.status = 'BRAND_APPROVED';
  update public.applications set brief_sent_at = coalesce(brief_sent_at, now()),
    status = case when first_send then 'BRIEF_SENT' else status end, updated_at = now()
  where id = a.id;
  if first_send then perform public._advance_campaign(a.campaign_id, 'PRODUCTION'); end if;
  perform public._notify(a.talent_id, case when first_send then 'Brief campaign tersedia' else 'Brief campaign diperbarui' end,
    c.title || ': baca brief di menu Content & Publication lalu mulai produksi.', 'CONTENT', '/content');
  perform public._chat_append(me, a, case when first_send then 'Brief campaign telah dikirim.' else 'Brief campaign diperbarui.' end
    || case when public._clean(p_note) <> '' then ' ' || btrim(p_note) else '' end, url, null);
  perform public._audit(me.id, case when first_send then 'BRIEF_SENT' else 'BRIEF_UPDATED' end, 'APPLICATION', a.id::text,
    jsonb_build_object('brief_url', url, 'note', p_note));
  return jsonb_build_object('first_send', first_send, 'brief_url', url);
end $$;

create or replace function public.save_product_delivery(p_app uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); a public.applications := public._get_app(p_app); c public.campaigns;
  st text := upper(coalesce(p->>'status', 'PREPARING'));
begin
  c := public._assert_campaign_active(a.campaign_id);
  if not (a.status = any(public._final_statuses())) then raise exception 'Pengiriman produk hanya untuk creator yang disetujui Brand.'; end if;
  if st not in ('PREPARING','SHIPPED','RECEIVED','RETURNED') then raise exception 'Status pengiriman tidak valid.'; end if;
  insert into public.product_deliveries (application_id, campaign_id, talent_id, product_name, courier, tracking_number, status, note, created_by,
    shipped_at, received_at)
  values (a.id, a.campaign_id, a.talent_id, public._clean(p->>'product_name'), public._clean(p->>'courier'),
    public._clean(p->>'tracking_number'), st, public._clean(p->>'note'), me.id,
    case when st in ('SHIPPED','RECEIVED') then now() end, case when st = 'RECEIVED' then now() end)
  on conflict (application_id) do update set product_name = excluded.product_name, courier = excluded.courier,
    tracking_number = excluded.tracking_number, status = excluded.status, note = excluded.note,
    shipped_at = coalesce(public.product_deliveries.shipped_at, excluded.shipped_at),
    received_at = coalesce(public.product_deliveries.received_at, excluded.received_at), updated_at = now();
  if st in ('SHIPPED','RECEIVED') and a.status in ('BRAND_APPROVED','BRIEF_SENT') then
    update public.applications set status = 'PRODUCT_SHIPPED', updated_at = now() where id = a.id;
  end if;
  perform public._notify(a.talent_id, 'Status pengiriman produk', c.title || ': ' || case st
      when 'PREPARING' then 'produk sedang disiapkan' when 'SHIPPED' then 'produk dikirim'
      when 'RECEIVED' then 'produk diterima' else 'produk dikembalikan' end
    || case when public._clean(p->>'tracking_number') <> '' then ' (resi ' || btrim(p->>'tracking_number') || ')' else '' end || '.',
    'DELIVERY', '/content');
  perform public._audit(me.id, 'PRODUCT_DELIVERY', 'APPLICATION', a.id::text, p);
end $$;

-- -----------------------------------------------------------------------------
-- Draft / revision
-- -----------------------------------------------------------------------------
create or replace function public.submit_draft(p_app uuid, p_url text, p_caption text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['TALENT']); a public.applications := public._get_app(p_app); c public.campaigns;
  url text; ver int; sid uuid;
begin
  if a.talent_id <> me.id then raise exception 'Pendaftaran tidak ditemukan.'; end if;
  c := public._assert_campaign_active(a.campaign_id);
  if a.brief_sent_at is null then raise exception 'Draft dapat dikirim setelah brief campaign tersedia.'; end if;
  if a.status not in ('BRIEF_SENT','PRODUCT_SHIPPED','CONTENT_IN_PROGRESS','REVISION_REQUESTED') then
    raise exception '%', case when a.status = 'DRAFT_SUBMITTED' then 'Draft sebelumnya masih dalam review.'
                         else 'Draft tidak dapat dikirim pada tahap ini.' end;
  end if;
  url := public._require_url(p_url, 'Link draft');
  select coalesce(max(version), 0) + 1 into ver from public.content_submissions where application_id = a.id;
  insert into public.content_submissions (application_id, campaign_id, talent_id, draft_url, caption, version)
  values (a.id, a.campaign_id, me.id, url, public._clean(p_caption), ver) returning id into sid;
  update public.applications set status = 'DRAFT_SUBMITTED', updated_at = now() where id = a.id;
  perform public._chat_append(me, a, 'Mengirim draft konten versi ' || ver || '.', url, sid);
  perform public._notify_admins('Draft konten baru', a.talent_name || ' mengirim draft v' || ver || ' untuk ' || c.title || '.', 'CONTENT', '/content');
  perform public._notify(c.brand_id, 'Draft konten baru', a.talent_name || ' mengirim draft v' || ver || ' untuk ' || c.title || '.', 'CONTENT', '/content');
  perform public._audit(me.id, 'SUBMIT_DRAFT', 'SUBMISSION', sid::text, jsonb_build_object('version', ver, 'url', url));
  return sid;
end $$;

create or replace function public.review_submission(p_submission uuid, p_status text, p_note text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','BRAND']); s public.content_submissions; a public.applications; c public.campaigns;
  st text := upper(p_status);
begin
  select * into s from public.content_submissions where id = p_submission;
  if s.id is null or not public.can_manage_campaign(s.campaign_id) then raise exception 'Draft tidak dapat diakses.'; end if;
  c := public._assert_campaign_active(s.campaign_id);
  if st not in ('APPROVED','REVISION') then raise exception 'Pilih Approve atau Minta revisi.'; end if;
  if s.status <> 'SUBMITTED' then raise exception 'Draft ini sudah direview.'; end if;
  if st = 'REVISION' and public._clean(p_note) = '' then raise exception 'Tuliskan catatan revisi agar creator tahu apa yang perlu diperbaiki.'; end if;
  update public.content_submissions set status = st, review_note = public._clean(p_note), reviewed_by = me.id, reviewed_at = now()
   where id = s.id;
  update public.applications set status = case when st = 'APPROVED' then 'READY_TO_PUBLISH' else 'REVISION_REQUESTED' end, updated_at = now()
   where id = s.application_id returning * into a;
  perform public._chat_append(me, a, case when st = 'APPROVED'
      then 'Draft v' || s.version || ' disetujui. Silakan publish konten dan kirim link tayang.'
      else 'Permintaan revisi draft v' || s.version || ': ' || btrim(p_note) end
    || case when st = 'APPROVED' and public._clean(p_note) <> '' then ' ' || btrim(p_note) else '' end, s.draft_url, s.id);
  perform public._notify(s.talent_id, case when st = 'APPROVED' then 'Draft disetujui, siap publish' else 'Draft perlu revisi' end,
    c.title || ': ' || case when st = 'APPROVED' then 'publish konten lalu kirim link tayang.' else btrim(p_note) end, 'CONTENT', '/content');
  perform public._audit(me.id, 'REVIEW_CONTENT', 'SUBMISSION', s.id::text, jsonb_build_object('status', st, 'note', p_note));
  return jsonb_build_object('next_action', case when st = 'APPROVED' then 'PUBLISH_CONTENT' else 'SUBMIT_REVISION' end);
end $$;

-- -----------------------------------------------------------------------------
-- Publication
-- -----------------------------------------------------------------------------
create or replace function public.submit_publication(p_app uuid, p_platform text, p_url text, p_published_at date) returns uuid
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['TALENT']); a public.applications := public._get_app(p_app); c public.campaigns;
  pid uuid; url text;
begin
  if a.talent_id <> me.id then raise exception 'Pendaftaran tidak ditemukan.'; end if;
  c := public._assert_campaign_active(a.campaign_id);
  if not exists (select 1 from public.content_submissions where application_id = a.id and status = 'APPROVED')
     or a.status not in ('CONTENT_APPROVED','READY_TO_PUBLISH') then
    raise exception '%', case when a.status = 'PUBLISHED' then 'Link publikasi sedang diverifikasi.' else 'Draft harus disetujui sebelum konten dipublikasikan.' end;
  end if;
  if public._clean(p_platform) = '' then raise exception 'Pilih platform publikasi.'; end if;
  if p_published_at is null then raise exception 'Isi tanggal tayang.'; end if;
  if p_published_at > public._today() then raise exception 'Tanggal tayang tidak boleh di masa depan.'; end if;
  url := public._require_url(p_url, 'Link konten');
  insert into public.publications (application_id, campaign_id, talent_id, platform, content_url, published_at)
  values (a.id, a.campaign_id, me.id, lower(btrim(p_platform)), url, p_published_at) returning id into pid;
  update public.applications set status = 'PUBLISHED', updated_at = now() where id = a.id;
  perform public._advance_campaign(a.campaign_id, 'PUBLISHING');
  perform public._notify_admins('Konten tayang', a.talent_name || ' mengirim link publikasi untuk ' || c.title || '.', 'PUBLICATION', '/content?tab=publications');
  perform public._notify(c.brand_id, 'Konten tayang', a.talent_name || ' mengirim link publikasi untuk ' || c.title || '.', 'PUBLICATION', '/content?tab=publications');
  perform public._audit(me.id, 'SUBMIT_PUBLICATION', 'PUBLICATION', pid::text, jsonb_build_object('url', url, 'platform', p_platform));
  return pid;
end $$;

create or replace function public.verify_publication(p_publication uuid, p_approved boolean, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','BRAND']); x public.publications; c public.campaigns;
begin
  select * into x from public.publications where id = p_publication;
  if x.id is null or not public.can_manage_campaign(x.campaign_id) then raise exception 'Publikasi tidak dapat diakses.'; end if;
  c := public._assert_campaign_active(x.campaign_id);
  if x.status <> 'SUBMITTED' then raise exception 'Publikasi ini sudah diverifikasi.'; end if;
  if not p_approved and public._clean(p_note) = '' then raise exception 'Tuliskan alasan penolakan agar creator dapat memperbaiki link.'; end if;
  update public.publications set status = case when p_approved then 'VERIFIED' else 'REJECTED' end,
    review_note = public._clean(p_note), verified_by = me.id, verified_at = now() where id = x.id;
  update public.applications set status = case when p_approved then 'PUBLICATION_VERIFIED' else 'READY_TO_PUBLISH' end, updated_at = now()
   where id = x.application_id;
  update public.payments set publication_verified = p_approved, updated_at = now() where application_id = x.application_id;
  perform public._notify(x.talent_id, case when p_approved then 'Publikasi terverifikasi' else 'Link publikasi perlu diperbaiki' end,
    c.title || ': ' || case when p_approved then 'silakan kirim insight performa konten.' else btrim(p_note) end,
    'PUBLICATION', '/content');
  perform public._audit(me.id, 'VERIFY_PUBLICATION', 'PUBLICATION', x.id::text, jsonb_build_object('approved', p_approved, 'note', p_note));
end $$;

-- -----------------------------------------------------------------------------
-- Insight
-- -----------------------------------------------------------------------------
create or replace function public.submit_insight(p_app uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['TALENT']); a public.applications := public._get_app(p_app); c public.campaigns;
  iid uuid; reach bigint; eng bigint; er numeric; ev text; aud text;
begin
  if a.talent_id <> me.id then raise exception 'Pendaftaran tidak ditemukan.'; end if;
  c := public._assert_campaign_active(a.campaign_id);
  if a.status <> 'PUBLICATION_VERIFIED' then
    raise exception '%', case when a.status = 'INSIGHT_SUBMITTED' then 'Insight sebelumnya masih diverifikasi.'
                         else 'Insight dapat dikirim setelah link publikasi diverifikasi.' end;
  end if;
  ev := public._require_url(p->>'evidence_url', 'Link bukti insight');
  aud := public._optional_url(p->>'audience_data_url', 'Link data audience');
  reach := coalesce(nullif(p->>'reach', '')::bigint, 0);
  eng := coalesce(nullif(p->>'likes', '')::bigint, 0) + coalesce(nullif(p->>'comments', '')::bigint, 0)
       + coalesce(nullif(p->>'shares', '')::bigint, 0) + coalesce(nullif(p->>'saves', '')::bigint, 0);
  if coalesce(nullif(p->>'views', '')::bigint, 0) < 0 or reach < 0 or eng < 0 then raise exception 'Angka insight tidak boleh negatif.'; end if;
  er := case when reach > 0 then round(eng * 100.0 / reach, 2) else coalesce(nullif(p->>'engagement_rate', '')::numeric, 0) end;
  if er > 100 then raise exception 'Engagement rate % persen tidak realistis. Periksa kembali angka reach dan interaksi.', er; end if;
  insert into public.insights (application_id, campaign_id, talent_id, views, reach, impressions, likes, comments, shares, saves,
    engagement_rate, evidence_url, audience_data_url)
  values (a.id, a.campaign_id, me.id, coalesce(nullif(p->>'views', '')::bigint, 0), reach,
    coalesce(nullif(p->>'impressions', '')::bigint, 0), coalesce(nullif(p->>'likes', '')::bigint, 0),
    coalesce(nullif(p->>'comments', '')::bigint, 0), coalesce(nullif(p->>'shares', '')::bigint, 0),
    coalesce(nullif(p->>'saves', '')::bigint, 0), er, ev, aud)
  returning id into iid;
  update public.applications set status = 'INSIGHT_SUBMITTED', updated_at = now() where id = a.id;
  perform public._advance_campaign(a.campaign_id, 'REPORTING');
  perform public._notify_admins('Insight masuk', a.talent_name || ' mengirim data performa untuk ' || c.title || '.', 'INSIGHT', '/content?tab=insights');
  perform public._notify(c.brand_id, 'Insight masuk', a.talent_name || ' mengirim data performa untuk ' || c.title || '.', 'INSIGHT', '/content?tab=insights');
  perform public._audit(me.id, 'SUBMIT_INSIGHT', 'INSIGHT', iid::text, jsonb_build_object('reach', reach, 'er', er));
  return iid;
end $$;

create or replace function public._mark_payment_eligible(p_app uuid, p_by uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a public.applications := public._get_app(p_app); c public.campaigns; term int; due date;
begin
  if not exists (select 1 from public.publications where application_id = p_app and status = 'VERIFIED')
     or not exists (select 1 from public.insights where application_id = p_app and status = 'VERIFIED') then
    return;
  end if;
  select * into c from public.campaigns where id = a.campaign_id;
  term := coalesce(nullif(public._setting('PAYMENT_TERM_DAYS'), '')::int, 7);
  due := public._today() + term;
  update public.applications set status = 'READY_FOR_PAYMENT', payment_eligible_at = now(), updated_at = now() where id = p_app
  returning * into a;
  perform public._ensure_payment(a);
  update public.payments set status = case when status in ('PENDING_VERIFICATION') then 'READY_FOR_PAYMENT' else status end,
    eligible_at = coalesce(eligible_at, now()), due_date = coalesce(due_date, due), scheduled_date = coalesce(scheduled_date, due),
    sow_verified = true, publication_verified = true, insight_verified = true, verified_by = p_by, updated_at = now()
  where application_id = p_app;
  perform public._advance_campaign(a.campaign_id, 'PAYMENT');
  perform public._notify(a.talent_id, 'Pembayaran dijadwalkan', c.title || ': pekerjaan terverifikasi. Pembayaran dijadwalkan H+' || term
    || case when exists (select 1 from public.talent_bank_accounts b where b.user_id = a.talent_id and b.bank_name <> '' and b.bank_account <> '' and b.bank_holder <> '')
            then '.' else '. Lengkapi data rekening Anda di menu Payments.' end, 'PAYMENT', '/payments');
  perform public._notify_admins('Siap dibayar', a.talent_name || ' (' || c.title || ') siap diproses pembayarannya.', 'PAYMENT', '/payments');
end $$;

create or replace function public.verify_insight(p_insight uuid, p_approved boolean, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','BRAND']); x public.insights; c public.campaigns;
begin
  select * into x from public.insights where id = p_insight;
  if x.id is null or not public.can_manage_campaign(x.campaign_id) then raise exception 'Insight tidak dapat diakses.'; end if;
  c := public._assert_campaign_active(x.campaign_id);
  if x.status <> 'SUBMITTED' then raise exception 'Insight ini sudah diverifikasi.'; end if;
  if not p_approved and public._clean(p_note) = '' then raise exception 'Tuliskan alasan penolakan agar creator dapat mengirim ulang.'; end if;
  update public.insights set status = case when p_approved then 'VERIFIED' else 'REJECTED' end, review_note = public._clean(p_note),
    verified_by = me.id, verified_at = now() where id = x.id;
  if p_approved then
    update public.applications set status = 'INSIGHT_VERIFIED', updated_at = now() where id = x.application_id;
    update public.payments set insight_verified = true, updated_at = now() where application_id = x.application_id;
    perform public._mark_payment_eligible(x.application_id, me.id);
  else
    -- Insight ditolak dapat dikirim ulang.
    update public.applications set status = 'PUBLICATION_VERIFIED', updated_at = now() where id = x.application_id;
    perform public._notify(x.talent_id, 'Insight perlu dikirim ulang', c.title || ': ' || btrim(p_note), 'INSIGHT', '/insights');
  end if;
  perform public._audit(me.id, 'VERIFY_INSIGHT', 'INSIGHT', x.id::text, jsonb_build_object('approved', p_approved, 'note', p_note));
end $$;

-- -----------------------------------------------------------------------------
-- Profiles & bank details
-- -----------------------------------------------------------------------------
create or replace function public.save_talent_profile(p jsonb, p_user uuid default null) returns int
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['TALENT','ADMIN']); uid uuid;
begin
  uid := case when me.role = 'ADMIN' and p_user is not null then p_user else me.id end;
  if not exists (select 1 from public.talent_profiles where user_id = uid) then raise exception 'Profil creator tidak ditemukan.'; end if;
  perform public._optional_url(p->>'portfolio_url', 'Link portfolio');
  if p ? 'full_name' and public._clean(p->>'full_name') = '' then raise exception 'Nama lengkap wajib diisi.'; end if;
  update public.profiles set
    full_name = coalesce(nullif(public._clean(p->>'full_name'), ''), full_name),
    phone = case when p ? 'phone' then public._normalize_phone(p->>'phone') else phone end,
    updated_at = now() where id = uid;
  update public.talent_profiles set
    display_name = coalesce(nullif(public._clean(p->>'display_name'), ''), nullif(public._clean(p->>'full_name'), ''), display_name),
    bio = case when p ? 'bio' then public._clean(p->>'bio') else bio end,
    city = case when p ? 'city' then public._normalize_domicile(p->>'city') else city end,
    gender = case when p ? 'gender' then coalesce(upper(nullif(p->>'gender', '')), '') else gender end,
    birth_date = case when p ? 'birth_date' then nullif(p->>'birth_date', '')::date else birth_date end,
    categories = case when p ? 'categories' then public._jtext_array(p->'categories') else categories end,
    platforms = case when p ? 'platforms' then public._norm_platforms(public._jtext_array(p->'platforms')) else platforms end,
    instagram = case when p ? 'instagram' then public._clean(p->>'instagram') else instagram end,
    tiktok = case when p ? 'tiktok' then public._clean(p->>'tiktok') else tiktok end,
    youtube = case when p ? 'youtube' then public._clean(p->>'youtube') else youtube end,
    followers_instagram = case when p ? 'followers_instagram' then coalesce(nullif(p->>'followers_instagram', '')::bigint, 0) else followers_instagram end,
    followers_tiktok = case when p ? 'followers_tiktok' then coalesce(nullif(p->>'followers_tiktok', '')::bigint, 0) else followers_tiktok end,
    followers_youtube = case when p ? 'followers_youtube' then coalesce(nullif(p->>'followers_youtube', '')::bigint, 0) else followers_youtube end,
    engagement_rate = case when p ? 'engagement_rate' then coalesce(nullif(p->>'engagement_rate', '')::numeric, 0) else engagement_rate end,
    portfolio_url = case when p ? 'portfolio_url' then public._clean(p->>'portfolio_url') else portfolio_url end,
    rate_card = case when p ? 'rate_card' then coalesce(nullif(p->>'rate_card', '')::numeric, 0) else rate_card end,
    tags = case when me.role = 'ADMIN' and p ? 'tags' then public._jtext_array(p->'tags') else tags end,
    updated_at = now()
  where user_id = uid;
  perform public._audit(me.id, 'SAVE_TALENT_PROFILE', 'TALENT', uid::text, '{}');
  return public._recompute_completeness(uid);
end $$;

create or replace function public.save_bank_details(p_bank_name text, p_bank_account text, p_bank_holder text) returns boolean
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['TALENT']); before_complete boolean; acc text := regexp_replace(coalesce(p_bank_account, ''), '[\s-]', '', 'g');
begin
  if public._clean(p_bank_name) = '' or acc = '' or public._clean(p_bank_holder) = '' then
    raise exception 'Lengkapi nama bank, nomor rekening, dan nama pemilik rekening.';
  end if;
  if acc !~ '^\d{5,20}$' then raise exception 'Nomor rekening hanya boleh berisi angka (5–20 digit).'; end if;
  insert into public.talent_bank_accounts (user_id) values (me.id) on conflict do nothing;
  select (bank_name <> '' and bank_account <> '' and bank_holder <> '') into before_complete from public.talent_bank_accounts where user_id = me.id;
  update public.talent_bank_accounts set bank_name = btrim(p_bank_name), bank_account = acc, bank_holder = btrim(p_bank_holder), updated_at = now()
   where user_id = me.id;
  perform public._recompute_completeness(me.id);
  if not before_complete and exists (select 1 from public.payments where talent_id = me.id and status in ('READY_FOR_PAYMENT','PENDING_VERIFICATION')) then
    perform public._notify_admins('Rekening creator sudah lengkap', me.full_name || ' telah melengkapi data rekening.', 'PAYMENT', '/payments');
  end if;
  perform public._audit(me.id, 'SAVE_BANK_DETAILS', 'TALENT', me.id::text, '{}');
  return true;
end $$;

create or replace function public.save_brand_profile(p jsonb, p_user uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['BRAND','ADMIN']); uid uuid;
begin
  uid := case when me.role = 'ADMIN' and p_user is not null then p_user else me.id end;
  if not exists (select 1 from public.brand_profiles where user_id = uid) then raise exception 'Profil brand tidak ditemukan.'; end if;
  if public._clean(p->>'company_name') = '' then raise exception 'Nama perusahaan wajib diisi.'; end if;
  perform public._optional_url(p->>'website', 'Website');
  update public.brand_profiles set company_name = btrim(p->>'company_name'), industry = public._clean(p->>'industry'),
    pic_name = public._clean(p->>'pic_name'), pic_phone = public._normalize_phone(p->>'pic_phone'),
    website = public._clean(p->>'website'), address = public._clean(p->>'address'), updated_at = now()
  where user_id = uid;
  update public.profiles set full_name = coalesce(nullif(public._clean(p->>'pic_name'), ''), full_name), updated_at = now() where id = uid;
  update public.campaigns set brand_name = btrim(p->>'company_name') where brand_id = uid and status not in ('CLOSED','CANCELLED');
  perform public._audit(me.id, 'SAVE_BRAND_PROFILE', 'BRAND', uid::text, '{}');
end $$;

create or replace function public.set_user_status(p_user uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']);
begin
  if p_user = me.id then raise exception 'Anda tidak dapat menonaktifkan akun sendiri.'; end if;
  if p_status not in ('ACTIVE','INACTIVE') then raise exception 'Status akun tidak valid.'; end if;
  update public.profiles set status = p_status, updated_at = now() where id = p_user;
  perform public._audit(me.id, 'UPDATE_USER_STATUS', 'USER', p_user::text, jsonb_build_object('status', p_status));
end $$;

create or replace function public.set_talent_verification(p_user uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']);
begin
  if p_status not in ('PENDING','VERIFIED','REJECTED') then raise exception 'Status verifikasi tidak valid.'; end if;
  update public.talent_profiles set verification_status = p_status, updated_at = now() where user_id = p_user;
  if p_status = 'VERIFIED' then
    perform public._notify(p_user, 'Profil terverifikasi', 'Profil creator Anda telah diverifikasi oleh tim CreatorHub.', 'PROFILE', '/profile');
  end if;
  perform public._audit(me.id, 'VERIFY_TALENT', 'TALENT', p_user::text, jsonb_build_object('status', p_status));
end $$;

-- -----------------------------------------------------------------------------
-- Payments
-- -----------------------------------------------------------------------------
create or replace function public.request_bank_details(p_payment uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); x public.payments; c public.campaigns; complete boolean;
begin
  select * into x from public.payments where id = p_payment;
  if x.id is null then raise exception 'Pembayaran tidak ditemukan.'; end if;
  select * into c from public.campaigns where id = x.campaign_id;
  select (bank_name <> '' and bank_account <> '' and bank_holder <> '') into complete from public.talent_bank_accounts where user_id = x.talent_id;
  if coalesce(complete, false) then return false; end if;
  update public.payments set bank_requested_at = now(), updated_at = now() where id = x.id;
  perform public._notify(x.talent_id, 'Lengkapi rekening pembayaran', c.title || ': pembayaran siap diproses. Isi nama bank, nomor rekening, dan nama pemilik rekening di menu Payments.', 'PAYMENT', '/payments');
  perform public._audit(me.id, 'REQUEST_BANK_DETAILS', 'PAYMENT', x.id::text, '{}');
  return true;
end $$;

create or replace function public._refresh_closing_readiness(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.applications where campaign_id = p_campaign and status = any(public._final_statuses()))
     and not exists (select 1 from public.applications where campaign_id = p_campaign and status = any(public._final_statuses())
                     and status not in ('PAID','COMPLETED')) then
    perform public._advance_campaign(p_campaign, 'READY_TO_CLOSE');
  end if;
end $$;

create or replace function public.update_payment(p_payment uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); x public.payments; c public.campaigns; complete boolean;
  st text; proof text;
begin
  select * into x from public.payments where id = p_payment for update;
  if x.id is null then raise exception 'Pembayaran tidak ditemukan.'; end if;
  select * into c from public.campaigns where id = x.campaign_id;
  if x.status = 'PAID' then raise exception 'Pembayaran ini sudah PAID dan terkunci.'; end if;
  st := upper(coalesce(nullif(p->>'status', ''), x.status));
  if st not in ('PENDING_VERIFICATION','READY_FOR_PAYMENT','PROCESSING','PAID','CANCELLED') then raise exception 'Status pembayaran tidak valid.'; end if;
  select coalesce(bank_name <> '' and bank_account <> '' and bank_holder <> '', false) into complete
    from public.talent_bank_accounts where user_id = x.talent_id;
  if st in ('PROCESSING','PAID') and not coalesce(complete, false) then
    raise exception 'Data rekening creator belum lengkap. Minta creator melengkapi rekening terlebih dahulu.';
  end if;
  if st in ('PROCESSING','PAID') and x.eligible_at is null then
    raise exception 'Pembayaran belum eligible: publikasi dan insight harus terverifikasi terlebih dahulu.';
  end if;
  proof := coalesce(nullif(public._clean(p->>'proof_url'), ''), x.proof_url);
  if st = 'PAID' then proof := public._require_url(proof, 'Bukti transfer'); end if;
  perform public._optional_url(p->>'invoice_url', 'Link invoice');
  update public.payments set status = st,
    amount = coalesce(nullif(p->>'amount', '')::numeric, amount),
    scheduled_date = coalesce(nullif(p->>'scheduled_date', '')::date, scheduled_date),
    invoice_url = coalesce(nullif(public._clean(p->>'invoice_url'), ''), invoice_url),
    proof_url = proof, note = case when p ? 'note' then public._clean(p->>'note') else note end,
    paid_at = case when st = 'PAID' then coalesce(nullif(p->>'paid_at', '')::timestamptz, now()) else paid_at end,
    verified_by = me.id, updated_at = now()
  where id = x.id;
  if st = 'PAID' then
    update public.applications set status = 'PAID', updated_at = now() where id = x.application_id;
    perform public._refresh_closing_readiness(x.campaign_id);
  end if;
  perform public._notify(x.talent_id, 'Status pembayaran', c.title || ': ' || case st
      when 'PROCESSING' then 'pembayaran sedang diproses.' when 'PAID' then 'pembayaran telah ditransfer. Bukti transfer tersedia di menu Payments.'
      when 'READY_FOR_PAYMENT' then 'pembayaran siap diproses.' when 'CANCELLED' then 'pembayaran dibatalkan. Hubungi admin untuk detail.'
      else 'menunggu verifikasi.' end, 'PAYMENT', '/payments');
  perform public._audit(me.id, 'UPDATE_PAYMENT', 'PAYMENT', x.id::text, p - 'note' || jsonb_build_object('status', st));
end $$;

-- Hanya Admin yang menerima nomor rekening; Brand tidak memiliki akses tabel rekening.
create or replace function public.payment_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles := public._me();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', x.id, 'application_id', x.application_id, 'campaign_id', x.campaign_id, 'campaign_title', c.title,
      'talent_id', x.talent_id, 'talent_name', a.talent_name, 'talent_phone', case when me.role = 'ADMIN' then pr.phone end,
      'amount', x.amount, 'status', x.status, 'due_date', x.due_date, 'scheduled_date', x.scheduled_date,
      'eligible_at', x.eligible_at, 'paid_at', x.paid_at, 'proof_url', x.proof_url, 'invoice_url', x.invoice_url,
      'note', x.note, 'sow_verified', x.sow_verified, 'publication_verified', x.publication_verified,
      'insight_verified', x.insight_verified, 'bank_requested_at', x.bank_requested_at,
      'bank_complete', coalesce(b.bank_name <> '' and b.bank_account <> '' and b.bank_holder <> '', false),
      'bank', case when me.role = 'ADMIN' or me.id = x.talent_id then jsonb_build_object(
                'bank_name', b.bank_name, 'bank_account', b.bank_account, 'bank_holder', b.bank_holder) end
    ) order by case x.status when 'READY_FOR_PAYMENT' then 0 when 'PROCESSING' then 1 when 'PENDING_VERIFICATION' then 2 else 3 end, x.updated_at desc)
    from public.payments x
    join public.campaigns c on c.id = x.campaign_id
    join public.applications a on a.id = x.application_id
    join public.profiles pr on pr.id = x.talent_id
    left join public.talent_bank_accounts b on b.user_id = x.talent_id
    where me.role = 'ADMIN' or x.talent_id = me.id or (me.role = 'BRAND' and c.brand_id = me.id)), '[]');
end $$;

-- -----------------------------------------------------------------------------
-- Reports & closing
-- -----------------------------------------------------------------------------
create or replace function public.campaign_report(p_campaign uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','BRAND']); c public.campaigns; r jsonb;
  final_n int; paid_n int; pub_v int; ins_v int; saved public.campaign_reports; m jsonb;
begin
  select * into c from public.campaigns where id = p_campaign;
  if c.id is null or not public.can_manage_campaign(p_campaign) then raise exception 'Campaign tidak dapat diakses.'; end if;
  select * into saved from public.campaign_reports where campaign_id = p_campaign;

  select count(*) filter (where status = any(public._final_statuses())),
         count(*) filter (where status in ('PAID','COMPLETED'))
    into final_n, paid_n from public.applications where campaign_id = p_campaign;
  select count(*) into pub_v from public.publications where campaign_id = p_campaign and status = 'VERIFIED';
  select count(*) into ins_v from public.insights where campaign_id = p_campaign and status = 'VERIFIED';

  -- Metrik memakai insight terbaru per creator yang tidak ditolak.
  with latest as (
    select distinct on (application_id) * from public.insights
    where campaign_id = p_campaign and status <> 'REJECTED' order by application_id, submitted_at desc
  )
  select jsonb_build_object(
    'views', coalesce(sum(views), 0), 'reach', coalesce(sum(reach), 0), 'impressions', coalesce(sum(impressions), 0),
    'likes', coalesce(sum(likes), 0), 'comments', coalesce(sum(comments), 0), 'shares', coalesce(sum(shares), 0),
    'saves', coalesce(sum(saves), 0), 'engagements', coalesce(sum(likes + comments + shares + saves), 0),
    'average_er', coalesce(round(avg(engagement_rate), 2), 0),
    'aggregate_er', case when coalesce(sum(reach), 0) > 0 then round(sum(likes + comments + shares + saves) * 100.0 / sum(reach), 2) else 0 end)
  into m from latest;

  r := jsonb_build_object(
    'campaign', to_jsonb(c),
    'summary', jsonb_build_object(
      'creator_target', c.creator_needed,
      'applicants', (select count(*) from public.applications where campaign_id = p_campaign),
      'final_creators', final_n, 'completed_creators', paid_n,
      'publications', (select count(*) from public.publications where campaign_id = p_campaign and status <> 'REJECTED'),
      'publications_verified', pub_v, 'insights_verified', ins_v,
      'paid', (select count(*) from public.payments where campaign_id = p_campaign and status = 'PAID')),
    'funnel', jsonb_build_object(
      'applied', (select count(*) from public.applications where campaign_id = p_campaign),
      'shortlisted', (select count(*) from public.applications where campaign_id = p_campaign and status not in ('APPLIED','SCREENING','INVITED','REJECTED')),
      'offer_accepted', (select count(*) from public.job_offers where campaign_id = p_campaign and status = 'ACCEPTED'),
      'brand_approved', final_n,
      'published', (select count(distinct application_id) from public.publications where campaign_id = p_campaign and status = 'VERIFIED'),
      'insight_verified', (select count(distinct application_id) from public.insights where campaign_id = p_campaign and status = 'VERIFIED'),
      'paid', paid_n),
    'status_counts', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.applications where campaign_id = p_campaign group by status) s), '{}'),
    'metrics', m,
    'finance', jsonb_build_object(
      'committed', coalesce((select sum(amount) from public.payments where campaign_id = p_campaign and status <> 'CANCELLED'), 0),
      'paid', coalesce((select sum(amount) from public.payments where campaign_id = p_campaign and status = 'PAID'), 0),
      'pending', coalesce((select sum(amount) from public.payments where campaign_id = p_campaign and status not in ('PAID','CANCELLED')), 0)),
    'creators', coalesce((
      select jsonb_agg(jsonb_build_object(
        'application_id', a.id, 'talent_name', a.talent_name, 'status', a.status,
        'publication', (select jsonb_build_object('platform', platform, 'content_url', content_url, 'published_at', published_at, 'status', status)
                        from public.publications where application_id = a.id and status <> 'REJECTED' order by created_at desc limit 1),
        'insight', (select jsonb_build_object('views', views, 'reach', reach, 'impressions', impressions, 'likes', likes,
                          'comments', comments, 'shares', shares, 'saves', saves, 'engagement_rate', engagement_rate,
                          'evidence_url', evidence_url, 'status', status)
                    from public.insights where application_id = a.id and status <> 'REJECTED' order by submitted_at desc limit 1),
        'payment', (select jsonb_build_object('amount', amount, 'status', status, 'paid_at', paid_at,
                          'proof_url', case when me.role = 'ADMIN' then proof_url end)
                    from public.payments where application_id = a.id)
      ) order by a.talent_name)
      from public.applications a where a.campaign_id = p_campaign and a.status = any(public._final_statuses())), '[]'),
    'saved_report', to_jsonb(saved),
    'closing_checklist', jsonb_build_object(
      'has_final_creators', final_n > 0,
      'publications_verified', final_n > 0 and pub_v >= final_n,
      'insights_verified', final_n > 0 and ins_v >= final_n,
      'all_paid', final_n > 0 and paid_n >= final_n,
      'report_saved', saved.id is not null or c.report_url <> ''),
    'ready_to_close', final_n > 0 and paid_n >= final_n and (saved.id is not null or c.report_url <> '')
  );
  return r;
end $$;

create or replace function public.save_campaign_report(p_campaign uuid, p_report_url text, p_summary text) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','BRAND']); rep jsonb; url text;
begin
  if not public.can_manage_campaign(p_campaign) then raise exception 'Campaign tidak dapat diakses.'; end if;
  perform public._assert_campaign_active(p_campaign);
  url := public._optional_url(p_report_url, 'Link final report');
  if public._clean(p_summary) = '' then raise exception 'Tuliskan ringkasan eksekutif campaign.'; end if;
  rep := public.campaign_report(p_campaign);
  insert into public.campaign_reports (campaign_id, report_url, summary, total_creators, total_published, total_views, total_reach, total_engagement, created_by)
  values (p_campaign, url, btrim(p_summary), (rep->'summary'->>'final_creators')::int, (rep->'summary'->>'publications_verified')::int,
    (rep->'metrics'->>'views')::bigint, (rep->'metrics'->>'reach')::bigint, (rep->'metrics'->>'engagements')::bigint, me.id)
  on conflict (campaign_id) do update set report_url = excluded.report_url, summary = excluded.summary,
    total_creators = excluded.total_creators, total_published = excluded.total_published, total_views = excluded.total_views,
    total_reach = excluded.total_reach, total_engagement = excluded.total_engagement, updated_at = now();
  update public.campaigns set report_url = url, updated_at = now() where id = p_campaign;
  perform public._advance_campaign(p_campaign, 'REPORTING');
  perform public._refresh_closing_readiness(p_campaign);
  perform public._audit(me.id, 'SAVE_CAMPAIGN_REPORT', 'CAMPAIGN', p_campaign::text, jsonb_build_object('report_url', url));
end $$;

create or replace function public.close_campaign(p_campaign uuid, p_note text, p_force boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); c public.campaigns := public._assert_campaign_active(p_campaign);
  unpaid int; has_report boolean; r record;
begin
  select count(*) into unpaid from public.applications where campaign_id = p_campaign
    and status = any(public._final_statuses()) and status not in ('PAID','COMPLETED');
  has_report := exists (select 1 from public.campaign_reports where campaign_id = p_campaign) or c.report_url <> '';
  if not p_force and unpaid > 0 then raise exception '% creator belum menyelesaikan pembayaran.', unpaid; end if;
  if not p_force and not has_report then raise exception 'Simpan final report sebelum menutup campaign.'; end if;
  if p_force and public._clean(p_note) = '' then raise exception 'Tutup paksa membutuhkan catatan alasan.'; end if;
  update public.campaigns set status = 'CLOSED', registration_status = 'CLOSED', registration_closed_at = coalesce(registration_closed_at, now()),
    closing_note = public._clean(p_note), closed_at = now(), updated_at = now() where id = p_campaign;
  for r in update public.applications set status = 'COMPLETED', updated_at = now()
           where campaign_id = p_campaign and status in ('PAID') returning talent_id loop
    perform public._notify(r.talent_id, 'Terima kasih', 'Campaign ' || c.title || ' telah selesai. Terima kasih atas kolaborasinya.', 'CAMPAIGN', '/applications');
  end loop;
  perform public._notify(c.brand_id, 'Campaign selesai', c.title || ' telah ditutup.', 'CAMPAIGN', '/reports/' || c.id);
  perform public._audit(me.id, case when p_force then 'FORCE_CLOSE_CAMPAIGN' else 'CLOSE_CAMPAIGN' end, 'CAMPAIGN', p_campaign::text,
    jsonb_build_object('note', p_note, 'unpaid', unpaid, 'has_report', has_report));
end $$;

-- -----------------------------------------------------------------------------
-- SOP workflow (11 langkah)
-- -----------------------------------------------------------------------------
create or replace function public.campaign_sop(p_campaign uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','BRAND']);
begin
  return coalesce((
    select jsonb_agg(sop order by updated_at desc) from (
      select c.updated_at, jsonb_build_object(
        'campaign', jsonb_build_object('id', c.id, 'code', c.code, 'title', c.title, 'brand_name', c.brand_name,
                     'status', c.status, 'registration_status', c.registration_status, 'creator_needed', c.creator_needed,
                     'start_date', c.start_date, 'end_date', c.end_date),
        'steps', jsonb_build_array(
          jsonb_build_object('key', 'SETUP', 'title', 'Campaign setup', 'done', c.title <> '' and c.description <> '' and c.creator_needed > 0,
            'detail', 'Brief, kebutuhan creator, fee, SOW'),
          jsonb_build_object('key', 'RECRUITMENT', 'title', 'Recruitment', 'done', c.status <> 'DRAFT' or n.apps > 0,
            'detail', case when c.registration_status = 'OPEN' then 'Pendaftaran dibuka' else 'Pendaftaran ditutup' end),
          jsonb_build_object('key', 'SCREENING', 'title', 'Screening', 'done', n.shortlisted > 0,
            'detail', n.apps || ' pendaftar, ' || n.shortlisted || ' lolos screening'),
          jsonb_build_object('key', 'OFFER', 'title', 'Job offer', 'done', n.accepted > 0,
            'detail', n.accepted || ' creator bersedia'),
          jsonb_build_object('key', 'APPROVAL', 'title', 'Brand approval', 'done', n.final > 0,
            'detail', n.final || ' / ' || c.creator_needed || ' disetujui'),
          jsonb_build_object('key', 'BRIEFING', 'title', 'Briefing & produksi', 'done', n.final > 0 and n.briefed >= n.final,
            'detail', n.briefed || ' brief terkirim'),
          jsonb_build_object('key', 'DRAFT', 'title', 'Draft review', 'done', n.final > 0 and n.approved_drafts >= n.final,
            'detail', n.approved_drafts || ' draft disetujui'),
          jsonb_build_object('key', 'PUBLICATION', 'title', 'Verifikasi publikasi', 'done', n.final > 0 and n.pub_v >= n.final,
            'detail', n.pub_v || ' tayang terverifikasi'),
          jsonb_build_object('key', 'INSIGHT', 'title', 'Verifikasi insight', 'done', n.final > 0 and n.ins_v >= n.final,
            'detail', n.ins_v || ' insight terverifikasi'),
          jsonb_build_object('key', 'PAYMENT', 'title', 'Pembayaran', 'done', n.final > 0 and n.paid >= n.final,
            'detail', n.paid || ' / ' || n.final || ' dibayar'),
          jsonb_build_object('key', 'CLOSING', 'title', 'Report & closing', 'done', c.status = 'CLOSED',
            'detail', case when c.status = 'CLOSED' then 'Campaign selesai' when n.has_report then 'Report tersimpan' else 'Belum ada final report' end)
        ),
        'counts', to_jsonb(n)
      ) as sop
      from public.campaigns c
      cross join lateral (
        select
          (select count(*) from public.applications a where a.campaign_id = c.id) as apps,
          (select count(*) from public.applications a where a.campaign_id = c.id and a.status not in ('APPLIED','SCREENING','INVITED','REJECTED')) as shortlisted,
          (select count(*) from public.job_offers o where o.campaign_id = c.id and o.status = 'ACCEPTED') as accepted,
          (select count(*) from public.applications a where a.campaign_id = c.id and a.status = any(public._final_statuses())) as final,
          (select count(*) from public.applications a where a.campaign_id = c.id and a.brief_sent_at is not null) as briefed,
          (select count(distinct application_id) from public.content_submissions s where s.campaign_id = c.id and s.status = 'APPROVED') as approved_drafts,
          (select count(distinct application_id) from public.publications x where x.campaign_id = c.id and x.status = 'VERIFIED') as pub_v,
          (select count(distinct application_id) from public.insights x where x.campaign_id = c.id and x.status = 'VERIFIED') as ins_v,
          (select count(*) from public.payments x where x.campaign_id = c.id and x.status = 'PAID') as paid,
          exists (select 1 from public.campaign_reports r where r.campaign_id = c.id) or c.report_url <> '' as has_report
      ) n
      where (p_campaign is null or c.id = p_campaign) and (me.role = 'ADMIN' or c.brand_id = me.id)
        and (p_campaign is not null or c.status <> 'CANCELLED')
    ) z), '[]');
end $$;

-- -----------------------------------------------------------------------------
-- Dashboard
-- -----------------------------------------------------------------------------
create or replace function public.dashboard_summary() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles := public._me(); t public.talent_profiles;
begin
  if me.role = 'ADMIN' then
    return jsonb_build_object(
      'active_creators', (select count(*) from public.profiles where role = 'TALENT' and status = 'ACTIVE'),
      'active_campaigns', (select count(*) from public.campaigns where status not in ('DRAFT','CLOSED','CANCELLED')),
      'open_recruitment', (select count(*) from public.campaigns where registration_status = 'OPEN' and status not in ('CLOSED','CANCELLED')),
      'pending_candidates', (select count(*) from public.applications a join public.campaigns c on c.id = a.campaign_id
                             where a.status in ('APPLIED','SCREENING') and c.status not in ('CLOSED','CANCELLED')),
      'awaiting_offer_reply', (select count(*) from public.applications where status = 'OFFER_SENT'),
      'ready_for_brand', (select count(*) from public.applications where status = 'CREATOR_CONFIRMED'),
      'awaiting_brief', (select count(*) from public.applications where status = 'BRAND_APPROVED'),
      'drafts_to_review', (select count(*) from public.content_submissions where status = 'SUBMITTED'),
      'publications_to_verify', (select count(*) from public.publications where status = 'SUBMITTED'),
      'insights_to_verify', (select count(*) from public.insights where status = 'SUBMITTED'),
      'pending_payments', (select count(*) from public.payments where status in ('READY_FOR_PAYMENT','PROCESSING')),
      'pending_payment_amount', coalesce((select sum(amount) from public.payments where status in ('READY_FOR_PAYMENT','PROCESSING')), 0),
      'unread_chats', coalesce((select sum(admin_unread) from public.chat_threads), 0),
      'recent_applications', coalesce((select jsonb_agg(x) from (
          select a.id, a.talent_name, a.status, a.applied_at, c.title as campaign_title, c.id as campaign_id,
                 public._recommendation(coalesce(s.fit_score, 0)) as recommendation
          from public.applications a join public.campaigns c on c.id = a.campaign_id
          left join public.application_scores s on s.application_id = a.id
          order by a.applied_at desc limit 6) x), '[]'));
  elsif me.role = 'BRAND' then
    return jsonb_build_object(
      'campaigns', (select count(*) from public.campaigns where brand_id = me.id),
      'active_campaigns', (select count(*) from public.campaigns where brand_id = me.id and status not in ('DRAFT','CLOSED','CANCELLED')),
      'candidates_to_review', (select count(*) from public.applications a join public.campaigns c on c.id = a.campaign_id
                               where c.brand_id = me.id and a.status = 'SUBMITTED_TO_BRAND'),
      'drafts_to_review', (select count(*) from public.content_submissions s join public.campaigns c on c.id = s.campaign_id
                           where c.brand_id = me.id and s.status = 'SUBMITTED'),
      'approved_creators', (select count(*) from public.applications a join public.campaigns c on c.id = a.campaign_id
                            where c.brand_id = me.id and a.status = any(public._final_statuses())),
      'publications', (select count(*) from public.publications x join public.campaigns c on c.id = x.campaign_id
                       where c.brand_id = me.id and x.status = 'VERIFIED'),
      'views', coalesce((select sum(i.views) from public.insights i join public.campaigns c on c.id = i.campaign_id
                         where c.brand_id = me.id and i.status = 'VERIFIED'), 0),
      'reach', coalesce((select sum(i.reach) from public.insights i join public.campaigns c on c.id = i.campaign_id
                         where c.brand_id = me.id and i.status = 'VERIFIED'), 0));
  else
    select * into t from public.talent_profiles where user_id = me.id;
    return jsonb_build_object(
      'profile_completeness', coalesce(t.profile_completeness, 0),
      'verification_status', t.verification_status,
      'applications', (select count(*) from public.applications where talent_id = me.id),
      'active_jobs', (select count(*) from public.applications where talent_id = me.id and status = any(public._final_statuses())
                      and status not in ('PAID','COMPLETED')),
      'paid_earnings', coalesce((select sum(amount) from public.payments where talent_id = me.id and status = 'PAID'), 0),
      'upcoming_earnings', coalesce((select sum(amount) from public.payments where talent_id = me.id and status not in ('PAID','CANCELLED')), 0),
      'bank_complete', coalesce((select bank_name <> '' and bank_account <> '' and bank_holder <> '' from public.talent_bank_accounts where user_id = me.id), false),
      'unread_chats', coalesce((select sum(talent_unread) from public.chat_threads where talent_id = me.id), 0));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Notifications, settings, templates
-- -----------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null) returns void
language sql security definer set search_path = public as $$
  update public.notifications set is_read = true
  where user_id = auth.uid() and not is_read and (p_ids is null or id = any(p_ids))
$$;

create or replace function public.update_settings(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN']); k text; v text;
begin
  for k, v in select * from jsonb_each_text(p) loop
    if k not in (select key from public.settings) then raise exception 'Pengaturan % tidak dikenal.', k; end if;
    if k = 'PAYMENT_TERM_DAYS' and (v !~ '^\d+$' or v::int > 120) then raise exception 'Jangka pembayaran harus 0–120 hari.'; end if;
    update public.settings set value = btrim(v), updated_at = now() where key = k;
  end loop;
  perform public._audit(me.id, 'UPDATE_SETTINGS', 'SETTINGS', '', p);
end $$;

create or replace function public.save_question_template(p_id uuid, p_name text, p_description text, p_questions jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','BRAND']); v uuid;
begin
  if public._clean(p_name) = '' then raise exception 'Nama template wajib diisi.'; end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then raise exception 'Template minimal memiliki satu pertanyaan.'; end if;
  if p_id is null then
    insert into public.question_templates (name, description, questions, created_by)
    values (btrim(p_name), public._clean(p_description), p_questions, me.id) returning id into v;
  else
    update public.question_templates set name = btrim(p_name), description = public._clean(p_description), questions = p_questions, updated_at = now()
     where id = p_id and (me.role = 'ADMIN' or created_by = me.id) returning id into v;
    if v is null then raise exception 'Template tidak dapat diubah.'; end if;
  end if;
  return v;
end $$;

create or replace function public.delete_question_template(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me public.profiles := public._me(array['ADMIN','BRAND']);
begin
  delete from public.question_templates where id = p_id and (me.role = 'ADMIN' or created_by = me.id);
end $$;

create or replace function public.touch_last_login() returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_login = now() where id = auth.uid()
$$;

-- -----------------------------------------------------------------------------
-- Function privileges: internal helpers tidak dapat dipanggil dari API.
-- -----------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like '\_%' escape '\' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname not like '\_%' escape '\' and p.proname <> 'handle_new_user' loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.get_public_campaign(text) to anon;

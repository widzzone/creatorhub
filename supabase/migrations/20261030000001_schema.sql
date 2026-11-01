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

export type Role = 'ADMIN' | 'BRAND' | 'TALENT';
export type Tone = 'neutral' | 'iris' | 'moss' | 'amber' | 'rose' | 'sky';

export interface Profile {
  id: string;
  role: Role;
  email: string;
  full_name: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
}

export interface TalentProfile {
  user_id: string;
  display_name: string;
  bio: string;
  city: string;
  gender: '' | 'MALE' | 'FEMALE';
  birth_date: string | null;
  categories: string[];
  platforms: string[];
  instagram: string;
  tiktok: string;
  youtube: string;
  followers_instagram: number;
  followers_tiktok: number;
  followers_youtube: number;
  engagement_rate: number;
  portfolio_url: string;
  rate_card: number;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  profile_completeness: number;
  tags: string[];
  created_at: string;
}

export interface Campaign {
  id: string;
  code: string;
  brand_id: string;
  brand_name: string;
  title: string;
  description: string;
  objective: string;
  creator_profile: string;
  job_type: string;
  creator_needed: number;
  platforms: string[];
  categories: string[];
  min_followers: number;
  max_followers: number;
  min_engagement: number;
  preferred_city: string;
  gender_preference: 'ALL' | 'MALE' | 'FEMALE';
  benefit: string;
  payment_amount: number;
  start_date: string | null;
  end_date: string | null;
  deliverables: string;
  sow: string;
  brief_url: string;
  brief_note: string;
  product_required: boolean;
  product_notes: string;
  recruitment_channels: string;
  broadcast_message: string;
  status: string;
  registration_status: 'OPEN' | 'CLOSED';
  open_date: string | null;
  close_date: string | null;
  registration_target: number;
  report_url: string;
  closing_note: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id?: string;
  question_text: string;
  question_type: string;
  help_text: string;
  placeholder: string;
  required: boolean;
  options: string[];
  profile_field: string;
  min_value: number | null;
  max_value: number | null;
  screening_enabled: boolean;
  screening_operator: string;
  screening_value: string;
  weight: number;
}

export interface Availability {
  ok: boolean;
  status: 'OPEN' | 'CLOSED' | 'SCHEDULED';
  reason: string;
  message: string;
  count?: number;
  target?: number;
  opens_on?: string;
  closes_on?: string | null;
}

export interface Reason {
  label: string;
  ok: boolean;
  screening?: boolean;
}

export interface PipelineRow {
  id: string;
  campaign_id: string;
  campaign_title: string;
  campaign_code: string;
  talent_id: string;
  talent_name: string;
  email: string;
  phone: string;
  status: string;
  applied_at: string;
  updated_at: string;
  city: string;
  platforms: string[];
  categories: string[];
  followers: number;
  engagement_rate: number;
  instagram: string;
  tiktok: string;
  youtube: string;
  verification_status: string;
  recommendation: 'RECOMMENDED' | 'CONSIDER' | 'LOW_MATCH';
  fit_score: number;
  reasons: Reason[];
  admin_note: string;
  brand_note: string;
  brand_decision: string;
}

export interface Application {
  id: string;
  campaign_id: string;
  talent_id: string;
  talent_name: string;
  status: string;
  applied_at: string;
  note: string;
  admin_note: string;
  brand_note: string;
  commitment_note: string;
  offer_fee: number | null;
  offer_status: string;
  brief_sent_at: string | null;
  payment_eligible_at: string | null;
  updated_at: string;
}

export interface Submission {
  id: string;
  application_id: string;
  campaign_id: string;
  talent_id: string;
  draft_url: string;
  caption: string;
  version: number;
  status: 'SUBMITTED' | 'APPROVED' | 'REVISION';
  review_note: string;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface Publication {
  id: string;
  application_id: string;
  campaign_id: string;
  platform: string;
  content_url: string;
  published_at: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  review_note: string;
  created_at: string;
}

export interface Insight {
  id: string;
  application_id: string;
  campaign_id: string;
  views: number;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate: number;
  evidence_url: string;
  audience_data_url: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  review_note: string;
  submitted_at: string;
}

export interface JobOffer {
  id: string;
  fee: number;
  campaign_summary: string;
  deliverables: string;
  period_text: string;
  status: 'SENT' | 'ACCEPTED' | 'DECLINED';
  sent_at: string;
  responded_at: string | null;
  response_note: string;
}

export interface Delivery {
  id: string;
  product_name: string;
  courier: string;
  tracking_number: string;
  status: 'PREPARING' | 'SHIPPED' | 'RECEIVED' | 'RETURNED';
  note: string;
  shipped_at: string | null;
  received_at: string | null;
}

export interface PaymentRow {
  id: string;
  application_id: string;
  campaign_id: string;
  campaign_title: string;
  talent_id: string;
  talent_name: string;
  talent_phone: string | null;
  amount: number;
  status: string;
  due_date: string | null;
  scheduled_date: string | null;
  eligible_at: string | null;
  paid_at: string | null;
  proof_url: string;
  invoice_url: string;
  note: string;
  sow_verified: boolean;
  publication_verified: boolean;
  insight_verified: boolean;
  bank_requested_at: string | null;
  bank_complete: boolean;
  bank: { bank_name: string; bank_account: string; bank_holder: string } | null;
}

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface SopStep {
  key: string;
  title: string;
  done: boolean;
  detail: string;
}

export interface SopRow {
  campaign: Pick<Campaign, 'id' | 'code' | 'title' | 'brand_name' | 'status' | 'registration_status' | 'creator_needed' | 'start_date' | 'end_date'>;
  steps: SopStep[];
  counts: Record<string, number | boolean>;
}

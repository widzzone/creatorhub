import type { Role, Tone } from './types';

export const APP_NAME = 'CreatorHub';

export const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

export const CATEGORIES = [
  'Beauty',
  'Fashion',
  'Food & Beverage',
  'Lifestyle',
  'Parenting',
  'Tech & Gadget',
  'Travel',
  'Health & Fitness',
  'Gaming',
  'Finance',
  'Education',
  'Entertainment',
  'Automotive',
  'Home & Living',
];

export const DOMICILES = ['Jabodetabek', 'Luar Jabodetabek'];

export const BANKS = ['BCA', 'BRI', 'BNI', 'Mandiri', 'BSI', 'CIMB Niaga', 'Permata', 'Danamon', 'BTN', 'Jago', 'SeaBank', 'Blu by BCA', 'Lainnya'];

export const QUESTION_TYPES = [
  { value: 'SHORT_TEXT', label: 'Jawaban singkat' },
  { value: 'PARAGRAPH', label: 'Paragraf' },
  { value: 'NUMBER', label: 'Angka' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'URL', label: 'Link' },
  { value: 'DATE', label: 'Tanggal' },
  { value: 'RADIO', label: 'Pilihan tunggal' },
  { value: 'DROPDOWN', label: 'Dropdown' },
  { value: 'CHECKBOX', label: 'Pilihan ganda' },
  { value: 'YES_NO', label: 'Ya / Tidak' },
  { value: 'CONSENT', label: 'Persetujuan' },
];

export const PROFILE_FIELDS = [
  { value: '', label: 'Tidak dipetakan' },
  { value: 'instagram', label: 'Username Instagram' },
  { value: 'tiktok', label: 'Username TikTok' },
  { value: 'youtube', label: 'Channel YouTube' },
  { value: 'followers_instagram', label: 'Followers Instagram' },
  { value: 'followers_tiktok', label: 'Followers TikTok' },
  { value: 'followers_youtube', label: 'Subscribers YouTube' },
  { value: 'engagement_rate', label: 'Engagement rate' },
  { value: 'portfolio_url', label: 'Link portfolio' },
  { value: 'categories', label: 'Kategori konten' },
  { value: 'platforms', label: 'Platform' },
];

export const SCREENING_OPERATORS = [
  { value: 'EQUALS', label: 'Sama dengan' },
  { value: 'NOT_EQUALS', label: 'Tidak sama dengan' },
  { value: 'CONTAINS', label: 'Mengandung' },
  { value: 'GTE', label: 'Minimal (≥)' },
  { value: 'LTE', label: 'Maksimal (≤)' },
];

/** Tahap SOP end-to-end (11 langkah). */
export const SOP_STEPS = [
  'Campaign setup',
  'Recruitment',
  'Screening',
  'Job offer',
  'Brand approval',
  'Briefing & produksi',
  'Draft review',
  'Publikasi',
  'Insight',
  'Pembayaran',
  'Report & closing',
];

type StatusMeta = { label: string; talent: string; tone: Tone; step: number; next?: string; ended?: boolean };

export const APP_STATUS: Record<string, StatusMeta> = {
  INVITED: { label: 'Diundang', talent: 'Diundang', tone: 'sky', step: 3, next: 'Tunggu pendaftaran' },
  APPLIED: { label: 'Mendaftar', talent: 'Pendaftaran diterima', tone: 'neutral', step: 3, next: 'Tinjau & shortlist' },
  SCREENING: { label: 'Screening', talent: 'Sedang ditinjau', tone: 'sky', step: 3, next: 'Tinjau & shortlist' },
  SHORTLISTED: { label: 'Shortlist', talent: 'Masuk shortlist', tone: 'iris', step: 4, next: 'Kirim job offer' },
  OFFER_SENT: { label: 'Offer terkirim', talent: 'Konfirmasi job offer', tone: 'amber', step: 4, next: 'Menunggu creator' },
  NEGOTIATION: { label: 'Negosiasi', talent: 'Negosiasi offer', tone: 'amber', step: 4, next: 'Kirim ulang offer' },
  CREATOR_CONFIRMED: { label: 'Creator bersedia', talent: 'Anda sudah bersedia', tone: 'iris', step: 4, next: 'Ajukan ke Brand' },
  CREATOR_DECLINED: { label: 'Creator menolak', talent: 'Anda menolak offer', tone: 'rose', step: 4, ended: true },
  SUBMITTED_TO_BRAND: { label: 'Review Brand', talent: 'Ditinjau Brand', tone: 'amber', step: 5, next: 'Menunggu Brand' },
  BRAND_APPROVED: { label: 'Disetujui Brand', talent: 'Disetujui Brand', tone: 'moss', step: 5, next: 'Kirim brief' },
  BRAND_REJECTED: { label: 'Ditolak Brand', talent: 'Tidak dilanjutkan', tone: 'rose', step: 5, ended: true },
  REPLACEMENT_REQUIRED: { label: 'Perlu pengganti', talent: 'Tidak dilanjutkan', tone: 'rose', step: 5, ended: true },
  BRIEF_SENT: { label: 'Brief terkirim', talent: 'Brief tersedia', tone: 'iris', step: 6, next: 'Menunggu draft' },
  PRODUCT_SHIPPED: { label: 'Produk dikirim', talent: 'Produk dikirim', tone: 'iris', step: 6, next: 'Menunggu draft' },
  CONTENT_IN_PROGRESS: { label: 'Produksi', talent: 'Produksi konten', tone: 'iris', step: 6, next: 'Menunggu draft' },
  DRAFT_SUBMITTED: { label: 'Draft masuk', talent: 'Draft direview', tone: 'amber', step: 7, next: 'Review draft' },
  REVISION_REQUESTED: { label: 'Revisi', talent: 'Perlu revisi', tone: 'rose', step: 7, next: 'Menunggu revisi' },
  CONTENT_APPROVED: { label: 'Draft disetujui', talent: 'Siap publish', tone: 'moss', step: 7, next: 'Menunggu publish' },
  READY_TO_PUBLISH: { label: 'Siap publish', talent: 'Siap publish', tone: 'moss', step: 7, next: 'Menunggu publish' },
  PUBLISHED: { label: 'Tayang', talent: 'Link tayang diverifikasi', tone: 'amber', step: 8, next: 'Verifikasi tayang' },
  PUBLICATION_VERIFIED: { label: 'Tayang terverifikasi', talent: 'Kirim insight', tone: 'moss', step: 8, next: 'Menunggu insight' },
  INSIGHT_SUBMITTED: { label: 'Insight masuk', talent: 'Insight diverifikasi', tone: 'amber', step: 9, next: 'Verifikasi insight' },
  INSIGHT_VERIFIED: { label: 'Insight terverifikasi', talent: 'Insight terverifikasi', tone: 'moss', step: 9, next: 'Proses pembayaran' },
  READY_FOR_PAYMENT: { label: 'Siap dibayar', talent: 'Pembayaran dijadwalkan', tone: 'amber', step: 10, next: 'Proses pembayaran' },
  PAID: { label: 'Dibayar', talent: 'Sudah dibayar', tone: 'moss', step: 10, next: 'Siap closing' },
  COMPLETED: { label: 'Selesai', talent: 'Selesai', tone: 'moss', step: 11 },
  REJECTED: { label: 'Tidak lolos', talent: 'Tidak dilanjutkan', tone: 'rose', step: 3, ended: true },
};

export const PIPELINE_GROUPS: { key: string; label: string; statuses: string[] }[] = [
  { key: 'new', label: 'Perlu ditinjau', statuses: ['INVITED', 'APPLIED', 'SCREENING'] },
  { key: 'offer', label: 'Shortlist & offer', statuses: ['SHORTLISTED', 'OFFER_SENT', 'NEGOTIATION', 'CREATOR_CONFIRMED'] },
  { key: 'brand', label: 'Review Brand', statuses: ['SUBMITTED_TO_BRAND'] },
  {
    key: 'final',
    label: 'Final creator',
    statuses: [
      'BRAND_APPROVED', 'BRIEF_SENT', 'PRODUCT_SHIPPED', 'CONTENT_IN_PROGRESS', 'DRAFT_SUBMITTED', 'REVISION_REQUESTED',
      'CONTENT_APPROVED', 'READY_TO_PUBLISH', 'PUBLISHED', 'PUBLICATION_VERIFIED', 'INSIGHT_SUBMITTED', 'INSIGHT_VERIFIED',
      'READY_FOR_PAYMENT', 'PAID', 'COMPLETED',
    ],
  },
  { key: 'ended', label: 'Tidak lanjut', statuses: ['REJECTED', 'CREATOR_DECLINED', 'BRAND_REJECTED', 'REPLACEMENT_REQUIRED'] },
];

export const CAMPAIGN_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  OPEN: { label: 'Recruitment', tone: 'sky' },
  SCREENING: { label: 'Screening', tone: 'sky' },
  OFFER_CONFIRMATION: { label: 'Konfirmasi offer', tone: 'amber' },
  CLIENT_APPROVAL: { label: 'Approval Brand', tone: 'amber' },
  PRODUCTION: { label: 'Produksi', tone: 'iris' },
  PUBLISHING: { label: 'Publikasi', tone: 'iris' },
  REPORTING: { label: 'Reporting', tone: 'iris' },
  PAYMENT: { label: 'Pembayaran', tone: 'amber' },
  READY_TO_CLOSE: { label: 'Siap ditutup', tone: 'moss' },
  CLOSED: { label: 'Selesai', tone: 'neutral' },
  CANCELLED: { label: 'Dibatalkan', tone: 'rose' },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING_VERIFICATION: { label: 'Menunggu verifikasi', tone: 'neutral' },
  READY_FOR_PAYMENT: { label: 'Siap dibayar', tone: 'amber' },
  PROCESSING: { label: 'Diproses', tone: 'sky' },
  PAID: { label: 'Dibayar', tone: 'moss' },
  CANCELLED: { label: 'Dibatalkan', tone: 'rose' },
};

export const REVIEW_STATUS: Record<string, { label: string; tone: Tone }> = {
  SUBMITTED: { label: 'Menunggu review', tone: 'amber' },
  APPROVED: { label: 'Disetujui', tone: 'moss' },
  REVISION: { label: 'Perlu revisi', tone: 'rose' },
  VERIFIED: { label: 'Terverifikasi', tone: 'moss' },
  REJECTED: { label: 'Ditolak', tone: 'rose' },
};

export const RECOMMENDATION: Record<string, { label: string; tone: Tone; hint: string }> = {
  RECOMMENDED: { label: 'Recommended', tone: 'moss', hint: 'Kecocokan tinggi dengan kriteria campaign' },
  CONSIDER: { label: 'Consider', tone: 'amber', hint: 'Sebagian kriteria terpenuhi, layak ditinjau' },
  LOW_MATCH: { label: 'Low match', tone: 'neutral', hint: 'Banyak kriteria belum terpenuhi' },
};

export type NavItem = { href: string; label: string; icon: string; badge?: string };

export const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: '/dashboard', label: 'Overview', icon: 'dashboard' },
    { href: '/workflow', label: 'SOP Workflow', icon: 'workflow' },
    { href: '/campaigns', label: 'Campaigns', icon: 'campaigns' },
    { href: '/candidates', label: 'Candidate Pipeline', icon: 'candidates' },
    { href: '/content', label: 'Content Review', icon: 'content' },
    { href: '/messages', label: 'Revision Chat', icon: 'messages', badge: 'chat' },
    { href: '/talents', label: 'Talent Database', icon: 'talents' },
    { href: '/brands', label: 'Brands & Clients', icon: 'brands' },
    { href: '/payments', label: 'Payments', icon: 'payments' },
    { href: '/reports', label: 'Reports', icon: 'reports' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ],
  BRAND: [
    { href: '/dashboard', label: 'Overview', icon: 'dashboard' },
    { href: '/workflow', label: 'SOP Workflow', icon: 'workflow' },
    { href: '/campaigns', label: 'Campaigns', icon: 'campaigns' },
    { href: '/candidates', label: 'Candidate Approval', icon: 'candidates' },
    { href: '/content', label: 'Content Review', icon: 'content' },
    { href: '/reports', label: 'Reports', icon: 'reports' },
    { href: '/profile', label: 'Company Profile', icon: 'profile' },
  ],
  TALENT: [
    { href: '/dashboard', label: 'Overview', icon: 'dashboard' },
    { href: '/marketplace', label: 'Campaign Marketplace', icon: 'marketplace' },
    { href: '/applications', label: 'My Applications', icon: 'applications' },
    { href: '/content', label: 'Content & Publication', icon: 'content' },
    { href: '/messages', label: 'Revision Chat', icon: 'messages', badge: 'chat' },
    { href: '/insights', label: 'Insights', icon: 'insights' },
    { href: '/payments', label: 'Payments', icon: 'payments' },
    { href: '/profile', label: 'My Profile', icon: 'profile' },
  ],
};

export const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Admin', BRAND: 'Brand', TALENT: 'Creator' };

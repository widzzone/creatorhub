const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('id-ID');
const compact = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });

export const rupiah = (v: number | string | null | undefined) => idr.format(Number(v || 0)).replace(/ /g, ' ');
export const number = (v: number | string | null | undefined) => num.format(Number(v || 0));
export const compactNumber = (v: number | string | null | undefined) => compact.format(Number(v || 0));
export const percent = (v: number | string | null | undefined, digits = 2) =>
  `${Number(v || 0).toLocaleString('id-ID', { maximumFractionDigits: digits })}%`;

const TZ = 'Asia/Jakarta';

export function date(v: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!v) return '—';
  const d = new Date(v.length === 10 ? `${v}T00:00:00+07:00` : v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { timeZone: TZ, ...opts });
}

export function dateTime(v: string | null | undefined) {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleString('id-ID', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function relative(v: string | null | undefined) {
  if (!v) return '';
  const diff = (Date.now() - new Date(v).getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`;
  return date(v);
}

export function period(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return '—';
  return `${date(start, { day: 'numeric', month: 'short' })} – ${date(end)}`;
}

/** Days until a date (Asia/Jakarta). Negative when passed. */
export function daysUntil(v: string | null | undefined) {
  if (!v) return null;
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: TZ }) + 'T00:00:00+07:00');
  const target = new Date(`${v.slice(0, 10)}T00:00:00+07:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

export function initials(name: string | null | undefined) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

export function platformLabel(p: string) {
  return ({ instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' } as Record<string, string>)[p] ?? p;
}

export function waLink(phone: string | null | undefined, text?: string) {
  const digits = String(phone || '').replace(/\D/g, '').replace(/^0/, '62');
  if (!digits) return '';
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
}

export function recruitmentUrl(code: string) {
  return `${siteUrl()}/join/${code}`;
}

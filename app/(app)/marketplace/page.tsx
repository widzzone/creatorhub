import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser, rpc } from '@/lib/auth';
import { date, daysUntil, period, platformLabel, rupiah } from '@/lib/format';
import { Empty, PageHeader, Panel, Tag } from '@/components/ui/primitives';
import { AppStatus } from '@/components/ui/status';
import { Store } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Campaign Marketplace' };

export default async function MarketplacePage() {
  await requireUser(['TALENT']);
  const list = await rpc<any[]>('marketplace_campaigns');
  return (
    <>
      <PageHeader title="Campaign Marketplace" description="Campaign yang sedang membuka pendaftaran. Urutan disesuaikan dengan profil Anda." />
      {list.length === 0 ? (
        <Panel><Empty icon={<Store className="size-5" />} title="Belum ada campaign terbuka" description="Campaign baru akan muncul di sini. Lengkapi profil agar tim mudah menghubungi Anda." /></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const left = c.close_date ? daysUntil(c.close_date) : null;
            return (
              <Link key={c.id} href={`/join/${c.code}`} className="flex flex-col rounded-panel border border-line bg-surface p-5 transition-colors hover:border-ink/25">
                <p className="text-xs font-semibold text-iris">{c.brand_name}</p>
                <h2 className="mt-1 text-[17px] leading-snug font-bold">{c.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-2">{c.description}</p>
                <div className="mt-4 flex flex-wrap gap-1">
                  {c.platforms.map((p: string) => <Tag key={p}>{platformLabel(p)}</Tag>)}
                  {c.categories.slice(0, 2).map((p: string) => <Tag key={p}>{p}</Tag>)}
                </div>
                <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                  <div>
                    <p className="text-xl font-bold tabular">{c.payment_amount ? rupiah(c.payment_amount) : 'Fee nego'}</p>
                    <p className="mt-0.5 text-xs text-muted">{period(c.start_date, c.end_date)}</p>
                  </div>
                  {c.already_applied ? <AppStatus status={c.application_status} audience="talent" /> : left !== null ? (
                    <span className="text-right text-xs text-muted">Daftar s.d.<br /><b className="text-ink">{date(c.close_date)}</b></span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

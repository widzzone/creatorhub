import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { relative } from '@/lib/format';
import type { NotificationRow } from '@/lib/types';
import { Empty, PageHeader, Panel, cx } from '@/components/ui/primitives';
import { ActionButton } from '@/components/ui/client';
import { Bell } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const me = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from('notifications').select('*').eq('user_id', me.id).order('created_at', { ascending: false }).limit(100);
  const rows = (data ?? []) as NotificationRow[];
  const unread = rows.filter((r) => !r.is_read).length;

  return (
    <>
      <PageHeader title="Notifications" description={unread ? `${unread} belum dibaca.` : 'Semua notifikasi sudah dibaca.'}
        actions={unread > 0 && <ActionButton fn="mark_notifications_read" args={{ p_ids: null }} success="Semua ditandai dibaca" size="md">Tandai semua dibaca</ActionButton>} />
      <Panel padded={false}>
        {rows.length === 0 ? <Empty icon={<Bell className="size-5" />} title="Belum ada notifikasi" description="Pembaruan workflow yang perlu Anda ketahui akan muncul di sini." /> : (
          <ul className="divide-y divide-line-2">
            {rows.map((n) => (
              <li key={n.id}>
                <Link href={n.link || '#'} className={cx('flex gap-4 px-5 py-4 hover:bg-paper/70', !n.is_read && 'bg-iris-50/40')}>
                  <span className={cx('mt-1.5 size-2 shrink-0 rounded-full', n.is_read ? 'bg-transparent' : 'bg-iris')} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className={cx('text-sm', n.is_read ? 'text-ink-2' : 'font-semibold text-ink')}>{n.title}</p>
                    {n.message && <p className="mt-0.5 text-sm text-muted">{n.message}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-faint">{relative(n.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/app/sidebar';
import { RealtimeRefresh } from '@/components/app/realtime-refresh';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const supabase = await createClient();
  const [{ count: unreadNotifications }, { data: threads }] = await Promise.all([
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', me.id).eq('is_read', false),
    me.role === 'BRAND'
      ? Promise.resolve({ data: [] as { admin_unread: number; talent_unread: number }[] })
      : supabase.from('chat_threads').select('admin_unread, talent_unread'),
  ]);
  const unreadChats = (threads ?? []).reduce((s, t) => s + (me.role === 'ADMIN' ? t.admin_unread : t.talent_unread), 0);

  return (
    <div className="min-h-dvh">
      <Sidebar me={me} unreadChats={unreadChats} unreadNotifications={unreadNotifications ?? 0} />
      <RealtimeRefresh userId={me.id} />
      <main className="lg:pl-[248px] print:pl-0">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10 print:max-w-none print:p-0">{children}</div>
      </main>
    </div>
  );
}

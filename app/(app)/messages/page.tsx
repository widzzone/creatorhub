import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/primitives';
import { ChatView } from '@/components/chat/chat-view';

export const metadata: Metadata = { title: 'Revision Chat' };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const me = await requireUser(['ADMIN', 'TALENT']);
  const { app } = await searchParams;
  const supabase = await createClient();
  const { data: threads } = await supabase
    .from('chat_threads')
    .select('*, application:applications(id, talent_name, status, talent_id), campaign:campaigns(title, brand_name)')
    .order('last_message_at', { ascending: false, nullsFirst: false });

  let list = (threads ?? []) as any[];
  // Opening a conversation that has no messages yet (e.g. from the candidate sheet).
  if (app && !list.some((t) => t.application_id === app)) {
    const { data: a } = await supabase.from('applications').select('id, talent_name, status, talent_id, campaign:campaigns(title, brand_name)').eq('id', app).maybeSingle();
    if (a) list = [{ id: `new-${a.id}`, application_id: a.id, application: a, campaign: (a as any).campaign, last_message: '', last_message_at: null, admin_unread: 0, talent_unread: 0 }, ...list];
  }
  let phones: Record<string, string> = {};
  if (me.role === 'ADMIN' && list.length) {
    const ids = [...new Set(list.map((t) => t.application?.talent_id).filter(Boolean))];
    const { data: ps } = await supabase.from('profiles').select('id, phone').in('id', ids);
    phones = Object.fromEntries((ps ?? []).map((p) => [p.id, p.phone]));
  }

  return (
    <>
      <PageHeader title="Revision Chat" description={me.role === 'ADMIN' ? 'Percakapan per creator per campaign. Draft dan keputusan review tercatat otomatis.' : 'Diskusi dengan tim campaign. Kirim link file, bukan file langsung.'} />
      <ChatView threads={list} me={{ id: me.id, role: me.role }} initialApp={app ?? list[0]?.application_id ?? ''} phones={phones} />
    </>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { dateTime, relative, waLink } from '@/lib/format';
import { Avatar, Button, Empty, Input, Panel, cx } from '../ui/primitives';
import { cleanError } from '../ui/client';
import { AppStatus } from '../ui/status';
import { ArrowLeft, ExternalLink, Link2, MessagesSquare, Phone, Send } from '../ui/icons';

type Msg = { id: string; sender_id: string; sender_role: string; sender_name: string; message: string; attachment_url: string; created_at: string };

export function ChatView({ threads, me, initialApp, phones }: { threads: any[]; me: { id: string; role: string }; initialApp: string; phones: Record<string, string> }) {
  const router = useRouter();
  const [appId, setAppId] = useState(initialApp);
  const [mobileOpen, setMobileOpen] = useState(!!initialApp && threads.length > 0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const t = threads.find((x) => x.application_id === appId);
  const threadId = t && !String(t.id).startsWith('new-') ? t.id : null;

  useEffect(() => {
    if (!appId) return;
    const supabase = createClient();
    let cancelled = false;
    setLoading(true);
    supabase.from('chat_messages').select('*').eq('application_id', appId).order('created_at').then(({ data }) => {
      if (!cancelled) { setMsgs((data ?? []) as Msg[]); setLoading(false); }
    });
    supabase.rpc('mark_chat_read', { p_app: appId }).then(() => router.refresh());
    window.history.replaceState(null, '', `/messages?app=${appId}`);
    const ch = supabase.channel(`chat-${appId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `application_id=eq.${appId}` }, (p) => {
        setMsgs((m) => (m.some((x) => x.id === (p.new as Msg).id) ? m : [...m, p.new as Msg]));
        supabase.rpc('mark_chat_read', { p_app: appId });
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [appId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.length, appId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !link.trim()) return;
    setSending(true);
    const { error } = await createClient().rpc('send_chat_message', { p_app: appId, p_message: text, p_attachment: link });
    setSending(false);
    if (error) return toast.error(cleanError(error.message));
    setText(''); setLink(''); setShowLink(false);
    const { data } = await createClient().from('chat_messages').select('*').eq('application_id', appId).order('created_at');
    setMsgs((data ?? []) as Msg[]);
    if (!threadId) router.refresh();
  }

  if (!threads.length) {
    return <Panel><Empty icon={<MessagesSquare className="size-5" />} title="Belum ada percakapan"
      description={me.role === 'ADMIN' ? 'Percakapan dimulai otomatis saat job offer, brief, atau draft dikirim.' : 'Percakapan dengan tim muncul setelah Anda menerima job offer.'} /></Panel>;
  }

  const phone = t ? phones[t.application?.talent_id] : '';
  const unread = (x: any) => (me.role === 'ADMIN' ? x.admin_unread : x.talent_unread);

  return (
    <Panel padded={false} className="grid h-[calc(100dvh-220px)] min-h-[520px] overflow-hidden md:grid-cols-[320px_1fr]">
      <aside className={cx('flex min-h-0 flex-col border-r border-line', mobileOpen && 'hidden md:flex')}>
        <ul className="flex-1 overflow-y-auto scrollbar-thin">
          {threads.map((x) => (
            <li key={x.id}>
              <button onClick={() => { setAppId(x.application_id); setMobileOpen(true); }}
                className={cx('flex w-full gap-3 border-b border-line-2 px-4 py-3.5 text-left', x.application_id === appId ? 'bg-iris-50/60' : 'hover:bg-paper')}>
                <Avatar name={me.role === 'ADMIN' ? x.application?.talent_name : x.campaign?.brand_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{me.role === 'ADMIN' ? x.application?.talent_name : x.campaign?.title}</p>
                    <span className="shrink-0 text-[11px] text-faint">{relative(x.last_message_at)}</span>
                  </div>
                  <p className="truncate text-xs text-muted">{me.role === 'ADMIN' ? x.campaign?.title : x.campaign?.brand_name}</p>
                  <p className={cx('mt-0.5 truncate text-xs', unread(x) ? 'font-semibold text-ink' : 'text-muted')}>{x.last_message || 'Belum ada pesan'}</p>
                </div>
                {unread(x) > 0 && <span className="mt-1 h-fit rounded-full bg-iris px-1.5 text-[11px] font-bold text-white tabular">{unread(x)}</span>}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className={cx('flex min-h-0 flex-col', !mobileOpen && 'hidden md:flex')}>
        {!t ? <Empty title="Pilih percakapan" /> : (
          <>
            <header className="flex items-center gap-3 border-b border-line px-5 py-3">
              <button className="-ml-2 rounded p-1.5 text-muted md:hidden" onClick={() => setMobileOpen(false)} aria-label="Kembali"><ArrowLeft className="size-5" /></button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{me.role === 'ADMIN' ? t.application?.talent_name : t.campaign?.title}</p>
                <p className="truncate text-xs text-muted">{me.role === 'ADMIN' ? t.campaign?.title : 'Tim campaign'}</p>
              </div>
              {t.application?.status && <span className="hidden sm:block"><AppStatus status={t.application.status} audience={me.role === 'ADMIN' ? 'team' : 'talent'} /></span>}
              {me.role === 'ADMIN' && phone && (
                <a href={waLink(phone)} target="_blank" rel="noopener noreferrer" className="rounded-md p-2 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Buka WhatsApp creator" title="WhatsApp">
                  <Phone className="size-4" />
                </a>
              )}
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto bg-paper/50 px-5 py-5 scrollbar-thin" aria-live="polite">
              {loading ? <p className="text-center text-sm text-muted">Memuat pesan…</p> : msgs.length === 0 ? (
                <p className="text-center text-sm text-muted">Belum ada pesan. Mulai percakapan di bawah.</p>
              ) : msgs.map((m) => {
                const mine = m.sender_id === me.id;
                return (
                  <div key={m.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cx('max-w-[78%] rounded-2xl px-4 py-2.5 text-sm', mine ? 'rounded-br-md bg-iris text-white' : 'rounded-bl-md border border-line bg-surface')}>
                      {!mine && <p className="mb-0.5 text-xs font-semibold text-iris-700">{m.sender_name}{m.sender_role === 'ADMIN' ? ' (Tim)' : ''}</p>}
                      {m.message && <p className="leading-relaxed whitespace-pre-line break-words">{m.message}</p>}
                      {m.attachment_url && (
                        <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                          className={cx('mt-1.5 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold underline-offset-2 hover:underline', mine ? 'text-white' : 'text-iris')}>
                          <ExternalLink className="size-3.5 shrink-0" /><span className="truncate">{m.attachment_url.replace(/^https?:\/\//, '')}</span>
                        </a>
                      )}
                      <p className={cx('mt-1 text-[10.5px]', mine ? 'text-white/70' : 'text-faint')}>{dateTime(m.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="border-t border-line bg-surface px-4 py-3">
              {showLink && <Input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/…" className="mb-2" aria-label="Link lampiran" />}
              <div className="flex items-end gap-2">
                <button type="button" onClick={() => setShowLink((s) => !s)} className={cx('rounded-md p-2.5', showLink ? 'bg-iris-50 text-iris' : 'text-muted hover:bg-ink/5')} aria-label="Lampirkan link">
                  <Link2 className="size-4" />
                </button>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder="Tulis pesan"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }}
                  className="max-h-32 min-h-10 flex-1 resize-none rounded-control border border-line px-3 py-2 text-sm focus:border-iris focus:outline-none" />
                <Button type="submit" loading={sending} aria-label="Kirim"><Send className="size-4" /></Button>
              </div>
            </form>
          </>
        )}
      </section>
    </Panel>
  );
}

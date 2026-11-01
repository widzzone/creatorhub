'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

/** Shows a toast for new notifications and refreshes server data (debounced). */
export function RealtimeRefresh({ userId }: { userId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notif-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new as { title: string; message: string; link: string };
        toast(n.title, {
          description: n.message,
          action: n.link ? { label: 'Buka', onClick: () => router.push(n.link) } : undefined,
        });
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 800);
      })
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}

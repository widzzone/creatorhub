import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile, Role } from './types';

export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return (data as Profile) ?? null;
});

export async function requireUser(roles?: Role[]): Promise<Profile> {
  const me = await getCurrentUser();
  if (!me) redirect('/login');
  if (me.status !== 'ACTIVE') redirect('/auth/signout?reason=inactive');
  if (roles && !roles.includes(me.role)) redirect('/dashboard');
  return me;
}

/** Call an RPC from a Server Component and unwrap the result. */
export async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}

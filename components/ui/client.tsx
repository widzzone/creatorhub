'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button, cx } from './primitives';
import { Check, Copy } from './icons';
import { Dialog } from './dialog';

/* ---------- RPC hook ---------- */
export function useRpc() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  async function call<T = unknown>(fn: string, args: Record<string, unknown> = {}, opts: { success?: string; refresh?: boolean } = {}) {
    setPending(true);
    try {
      const { data, error } = await createClient().rpc(fn, args);
      if (error) {
        toast.error(cleanError(error.message));
        return { ok: false as const, data: null };
      }
      if (opts.success) toast.success(opts.success);
      if (opts.refresh !== false) startTransition(() => router.refresh());
      return { ok: true as const, data: data as T };
    } catch (e) {
      toast.error('Koneksi ke server gagal. Periksa internet Anda lalu coba lagi.');
      return { ok: false as const, data: null };
    } finally {
      setPending(false);
    }
  }
  return { call, pending };
}

export function cleanError(msg: string) {
  if (/JWT|jwt expired|refresh token/i.test(msg)) return 'Sesi Anda berakhir. Muat ulang halaman lalu masuk kembali.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Koneksi ke server gagal. Periksa internet Anda lalu coba lagi.';
  return msg.replace(/^ERROR:\s*/, '');
}

/* ---------- Action button with optional confirm ---------- */
export function ActionButton({
  fn,
  args,
  success,
  children,
  variant = 'secondary',
  size = 'sm',
  confirm,
  className,
  onDone,
}: {
  fn: string;
  args: Record<string, unknown>;
  success?: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
  size?: 'sm' | 'md' | 'lg';
  confirm?: { title: string; body: ReactNode; cta: string; danger?: boolean };
  className?: string;
  onDone?: (data: unknown) => void;
}) {
  const { call, pending } = useRpc();
  const [open, setOpen] = useState(false);
  const run = async () => {
    const r = await call(fn, args, { success });
    if (r.ok) {
      setOpen(false);
      onDone?.(r.data);
    }
  };
  return (
    <>
      <Button type="button" variant={variant} size={size} loading={pending && !confirm} className={className}
        onClick={() => (confirm ? setOpen(true) : run())}>
        {children}
      </Button>
      {confirm && (
        <Dialog open={open} onClose={() => setOpen(false)} title={confirm.title} width="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
              <Button variant={confirm.danger ? 'danger' : 'primary'} loading={pending} onClick={run}>{confirm.cta}</Button>
            </>
          }>
          <div className="text-sm leading-relaxed text-ink-2">{confirm.body}</div>
        </Dialog>
      )}
    </>
  );
}

/* ---------- Copy ---------- */
export function CopyButton({ value, label = 'Salin', className, variant = 'secondary' }: { value: string; label?: string; className?: string; variant?: 'secondary' | 'ghost' | 'quiet' }) {
  const [done, setDone] = useState(false);
  return (
    <Button type="button" size="sm" variant={variant} className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success('Disalin ke clipboard');
          setTimeout(() => setDone(false), 1600);
        } catch {
          toast.error('Browser tidak mengizinkan akses clipboard.');
        }
      }}>
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {label}
    </Button>
  );
}

/* ---------- Chip multi-select ---------- */
export function ChipSelect({
  options,
  value,
  onChange,
  name,
  single,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  name?: string;
  single?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={name}>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button key={o.value} type="button" aria-pressed={on}
            onClick={() => onChange(single ? [o.value] : on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cx('h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
              on ? 'border-iris bg-iris-50 text-iris-700' : 'border-line bg-surface text-ink-2 hover:border-ink/25')}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Simple controlled form state ---------- */
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const set = <K extends keyof T>(key: K, v: T[K]) => setValues((s) => ({ ...s, [key]: v }));
  const bind = (key: keyof T) => ({
    value: (values[key] ?? '') as string,
    onChange: (e: { target: { value: string } }) => set(key, e.target.value as T[typeof key]),
  });
  return { values, set, bind, setValues };
}

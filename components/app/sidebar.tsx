'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV, ROLE_LABEL } from '@/lib/constants';
import type { Profile } from '@/lib/types';
import { Avatar, cx } from '../ui/primitives';
import {
  Bell, Building2, ClipboardList, Clapperboard, Contact, FileCheck, LayoutDashboard, LogOut, Megaphone, Menu,
  MessagesSquare, Settings, Store, TrendingUp, UserRound, Users, Wallet, Workflow, X, Gauge,
} from '../ui/icons';
import { BrandMark } from './brand-mark';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard, workflow: Workflow, campaigns: Megaphone, candidates: Users, content: FileCheck,
  messages: MessagesSquare, talents: Contact, brands: Building2, payments: Wallet, reports: TrendingUp,
  settings: Settings, profile: UserRound, marketplace: Store, applications: ClipboardList, insights: Gauge,
  notifications: Bell, clapper: Clapperboard,
};

export function Sidebar({ me, unreadChats, unreadNotifications }: { me: Profile; unreadChats: number; unreadNotifications: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const items = NAV[me.role];
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2 scrollbar-thin" aria-label="Navigasi utama">
      {items.map((it) => {
        const Icon = ICONS[it.icon] ?? LayoutDashboard;
        const active = isActive(it.href);
        const count = it.badge === 'chat' ? unreadChats : 0;
        return (
          <Link key={it.href} href={it.href} aria-current={active ? 'page' : undefined}
            className={cx('group flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-semibold transition-colors',
              active ? 'bg-iris-50 text-iris-700' : 'text-ink-2 hover:bg-ink/[0.04] hover:text-ink')}>
            <Icon className={cx('size-[18px] shrink-0', active ? 'text-iris' : 'text-faint group-hover:text-muted')} />
            <span className="truncate">{it.label}</span>
            {count > 0 && <span className="ml-auto rounded-full bg-iris px-1.5 text-[11px] leading-[18px] font-bold text-white tabular">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-line-2 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <Avatar name={me.full_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{me.full_name}</p>
          <p className="truncate text-xs text-muted">{ROLE_LABEL[me.role]}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="rounded-md p-2 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Keluar" title="Keluar">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="-ml-2 rounded-md p-2 text-ink-2" aria-label="Buka menu"><Menu className="size-5" /></button>
        <Link href="/dashboard"><BrandMark /></Link>
        <Link href="/notifications" className="relative -mr-2 rounded-md p-2 text-ink-2" aria-label="Notifikasi">
          <Bell className="size-5" />
          {unreadNotifications > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose" />}
        </Link>
      </div>

      {/* Desktop rail */}
      <aside className="no-print fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" aria-label="CreatorHub"><BrandMark /></Link>
          <Link href="/notifications" className="relative rounded-md p-2 text-muted hover:bg-ink/5 hover:text-ink" aria-label={`Notifikasi${unreadNotifications ? `, ${unreadNotifications} belum dibaca` : ''}`}>
            <Bell className="size-[18px]" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-rose px-1 text-center text-[10px] leading-4 font-bold text-white tabular">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </Link>
        </div>
        {nav}
        {footer}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Tutup menu" />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-surface">
            <div className="flex h-14 items-center justify-between px-5">
              <BrandMark />
              <button onClick={() => setOpen(false)} className="-mr-2 rounded-md p-2 text-muted" aria-label="Tutup menu"><X className="size-5" /></button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}

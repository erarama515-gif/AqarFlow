'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCircle2, Building2, Briefcase,
  CalendarDays, BadgeDollarSign, BarChart3, Settings as SettingsIcon,
  LogOut, Bell, KeyRound, Plus, ChevronDown, X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api, clearAuth, readAuth } from '@/lib/api';
import { formatRelative } from '@/lib/format';

const PRIMARY_NAV = [
  { href: '/dashboard',   label: 'الرئيسية',           icon: LayoutDashboard },
  { href: '/leads',       label: 'العملاء المحتملون',   icon: Users },
  { href: '/contacts',    label: 'العملاء',            icon: UserCircle2 },
  { href: '/properties',  label: 'العقارات',           icon: Building2 },
  { href: '/deals',       label: 'الصفقات',            icon: Briefcase },
  { href: '/bookings',    label: 'الحجوزات',           icon: KeyRound },
];

const SECONDARY_NAV = [
  { href: '/calendar',    label: 'التقويم',            icon: CalendarDays },
  { href: '/commissions', label: 'العمولات',           icon: BadgeDollarSign },
  { href: '/reports',     label: 'التقارير',           icon: BarChart3 },
  { href: '/settings',    label: 'الإعدادات',          icon: SettingsIcon },
];

const QUICK_CREATE = [
  { href: '/leads',           label: 'عميل محتمل',  icon: Users,        kbd: 'L' },
  { href: '/properties/new',  label: 'عقار',         icon: Building2,    kbd: 'P' },
  { href: '/deals/new',       label: 'صفقة',         icon: Briefcase,    kbd: 'D' },
  { href: '/bookings',        label: 'حجز',          icon: KeyRound,     kbd: 'B' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [auth, setAuth] = useState<ReturnType<typeof readAuth>>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const notifsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const a = readAuth();
    if (!a) { router.push('/login'); return; }
    setAuth(a);
  }, [router]);

  // Close dropdowns on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setShowCreate(false);
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!auth) return null;

  const logout = () => { clearAuth(); router.push('/login'); };
  const initials = auth.user.email.slice(0, 2).toUpperCase();
  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const currentTitle =
    [...PRIMARY_NAV, ...SECONDARY_NAV].find((n) => isActive(n.href))?.label ?? 'AqarFlow';

  return (
    <div className="min-h-screen flex bg-ink-50" dir="rtl">
      {/* ───────────────────── Sidebar (dark) ───────────────────── */}
      <aside
        className="bg-ink-950 flex flex-col text-ink-200"
        style={{ width: 'var(--sidebar-w)', minWidth: 'var(--sidebar-w)' }}
      >
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-ink-800">
          <span className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white text-sm font-bold">
            A
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-white text-sm font-semibold">AqarFlow</span>
            <span className="text-ink-500 text-2xs mt-0.5">{auth.user.tenantId.slice(0, 8)}</span>
          </div>
        </div>

        <nav className="px-2 pt-3 flex-1 overflow-y-auto">
          <div className="nav-section">CRM</div>
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`nav-item ${isActive(item.href) ? 'nav-item-active' : ''}`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}

          <div className="nav-section">العمليات</div>
          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`nav-item ${isActive(item.href) ? 'nav-item-active' : ''}`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-ink-800">
          <div className="flex items-center gap-2.5 rounded-md p-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xs text-white truncate">{auth.user.email}</div>
              <div className="text-2xs text-ink-500">{auth.user.roles.join(' · ')}</div>
            </div>
            <button onClick={logout} className="text-ink-500 hover:text-white p-1 transition-colors" aria-label="تسجيل الخروج" title="تسجيل الخروج">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ───────────────────── Main column ───────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        <header
          className="bg-white border-b border-ink-200 flex items-center gap-3 px-6 sticky top-0 z-20"
          style={{ height: 'var(--topbar-h)' }}
        >
          <h1 className="text-sm font-semibold text-ink-900">{currentTitle}</h1>

          <div className="ms-auto flex items-center gap-1">
            {/* Quick create */}
            <div className="relative" ref={createRef}>
              <button
                onClick={() => { setShowCreate((s) => !s); setShowNotifs(false); }}
                className="btn-secondary btn-sm"
                aria-haspopup="menu"
                aria-expanded={showCreate}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>جديد</span>
                <ChevronDown className="w-3 h-3 -ms-1" />
              </button>
              {showCreate && (
                <div role="menu"
                  className="absolute end-0 top-full mt-1.5 w-56 card shadow-elevate p-1 z-30 animate-fade-in">
                  <div className="px-2.5 py-1.5 text-2xs uppercase tracking-wider text-ink-500">إنشاء سريع</div>
                  {QUICK_CREATE.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href}
                        onClick={() => setShowCreate(false)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded text-sm hover:bg-ink-100">
                        <Icon className="w-3.5 h-3.5 text-ink-500" />
                        <span className="flex-1">{item.label}</span>
                        <kbd className="rounded bg-ink-100 px-1.5 py-0.5 text-2xs text-ink-500 mono">{item.kbd}</kbd>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifsRef}>
              <NotificationButton
                open={showNotifs}
                onToggle={() => { setShowNotifs((s) => !s); setShowCreate(false); }}
              />
              {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="px-6 py-5">{children}</div>
        </div>
      </main>
    </div>
  );
}

function NotificationButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { data } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => fetch('/api/v1/notifications/inbox?unreadOnly=true&limit=1', {
      headers: { Authorization: `Bearer ${readAuth()?.accessToken}` },
    }).then((r) => ({ unread: Number(r.headers.get('X-Unread-Count') ?? 0) })),
    refetchInterval: 30_000,
  });
  const unread = data?.unread ?? 0;
  return (
    <button onClick={onToggle} className="btn-ghost btn-sm relative" aria-haspopup="dialog" aria-expanded={open}>
      <Bell className="w-4 h-4" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 rounded-full bg-danger-600 text-white text-2xs grid place-items-center px-1 mono">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}

interface Notif {
  id: string; type: string; title: string; body: string;
  link?: string; priority: string; readAt?: string; createdAt: string;
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => api<Notif[]>('/v1/notifications/inbox?limit=20'),
  });

  const markAllRead = async () => {
    await api('/v1/notifications/read-all', { method: 'POST' }).catch(() => {});
    refetch();
  };

  const PRIORITY_DOT: Record<string, string> = {
    URGENT: 'bg-danger-600', HIGH: 'bg-warn-600',
    NORMAL: 'bg-info-600', LOW: 'bg-ink-300',
  };

  return (
    <div className="absolute end-0 top-full mt-1.5 w-96 card shadow-elevate z-30 animate-fade-in overflow-hidden">
      <div className="card-header">
        <h3 className="section-title">الإشعارات</h3>
        <div className="flex items-center gap-1.5">
          <button onClick={markAllRead} className="text-2xs text-brand-700 hover:text-brand-800 font-medium">
            تعليم الكل كمقروء
          </button>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-ink-500">جاري التحميل…</div>
        ) : data.length === 0 ? (
          <div className="p-10 text-center">
            <Bell className="w-6 h-6 text-ink-300 mx-auto" />
            <div className="text-sm text-ink-500 mt-2">لا توجد إشعارات</div>
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {data.map((n) => (
              <Link key={n.id} href={n.link ?? '#'} onClick={onClose}
                className={`block p-3 hover:bg-ink-50 transition-colors ${!n.readAt ? 'bg-brand-50/30' : ''}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`dot mt-1.5 shrink-0 ${PRIORITY_DOT[n.priority] ?? 'bg-ink-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-ink-900 truncate">{n.title}</div>
                      <span className="text-2xs text-ink-400 shrink-0 mono">{formatRelative(n.createdAt)}</span>
                    </div>
                    <div className="text-xs text-ink-600 line-clamp-2 mt-0.5">{n.body}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

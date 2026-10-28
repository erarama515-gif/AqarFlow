'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, Users, Building2, Briefcase, Calendar, DollarSign, Bell, LogOut, Settings, BarChart3,
} from 'lucide-react';
import { clearAuth, readAuth } from '@/lib/api';

const NAV = [
  { href: '/dashboard', label: 'الرئيسية', icon: Home },
  { href: '/leads', label: 'العملاء المحتملون', icon: Users },
  { href: '/contacts', label: 'العملاء', icon: Users },
  { href: '/properties', label: 'العقارات', icon: Building2 },
  { href: '/deals', label: 'الصفقات', icon: Briefcase },
  { href: '/calendar', label: 'التقويم', icon: Calendar },
  { href: '/commissions', label: 'العمولات', icon: DollarSign },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof readAuth>>(null);

  useEffect(() => {
    const a = readAuth();
    if (!a) {
      router.push('/login');
      return;
    }
    setUser(a);
  }, [router]);

  const logout = () => {
    clearAuth();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-200">
          <span className="w-8 h-8 rounded-md bg-brand-700 text-white grid place-items-center font-bold">A</span>
          <span className="font-bold text-lg">AqarFlow</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? 'bg-brand-50 text-brand-800 font-medium' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="text-xs text-slate-500 mb-2 px-3">{user.user.email}</div>
          <button onClick={logout} className="w-full btn-ghost justify-start">
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="text-sm text-slate-500">
            {NAV.find((n) => pathname.startsWith(n.href))?.label ?? 'AqarFlow'}
          </div>
          <button className="relative p-2 rounded-md hover:bg-slate-100" aria-label="إشعارات">
            <Bell className="w-5 h-5 text-slate-600" />
          </button>
        </header>
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </main>
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { api, readAuth } from '@/lib/api';
import { Building2, User, Shield, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => api<any>('/v1/tenants/current'),
  });
  const auth = readAuth();

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="page-title">الإعدادات</h1>
        <p className="page-sub mt-0.5">معلومات المؤسسة وإعدادات حسابك</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <aside className="card p-3 h-fit">
          <nav className="space-y-0.5">
            <a className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-ink-900 bg-ink-100 font-medium">
              <Building2 className="w-3.5 h-3.5" /> المؤسسة
            </a>
            <a className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-ink-700 hover:bg-ink-100">
              <User className="w-3.5 h-3.5" /> حسابي
            </a>
            <a className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-ink-700 hover:bg-ink-100">
              <Shield className="w-3.5 h-3.5" /> الصلاحيات
            </a>
            <a className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-ink-700 hover:bg-ink-100">
              <Globe className="w-3.5 h-3.5" /> اللغة والمنطقة
            </a>
          </nav>
        </aside>

        <div className="lg:col-span-2 space-y-4">
          <section className="card">
            <div className="card-header">
              <h2 className="section-title">المؤسسة</h2>
              <span className="pill-brand">PRO</span>
            </div>
            {tenant ? (
              <dl className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row label="الاسم" value={tenant.name} />
                <Row label="رمز المؤسسة" value={tenant.subdomain} mono />
                <Row label="الدولة" value={tenant.country} />
                <Row label="العملة" value={tenant.currency} mono />
                <Row label="المنطقة الزمنية" value={tenant.timezone} />
                <Row label="التقويم الهجري" value={tenant.hijriEnabled ? 'مفعّل' : 'معطّل'} />
              </dl>
            ) : (
              <div className="p-6 text-center text-sm text-ink-500">جاري التحميل…</div>
            )}
          </section>

          <section className="card">
            <div className="card-header"><h2 className="section-title">الحساب الحالي</h2></div>
            {auth ? (
              <dl className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row label="البريد" value={auth.user.email} mono />
                <Row label="الأدوار" value={auth.user.roles.join(' · ')} />
                <Row label="معرّف المستخدم" value={auth.user.id} mono />
                <Row label="معرّف المؤسسة" value={auth.user.tenantId} mono />
              </dl>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 pb-2 last:border-0">
      <dt className="text-ink-500 text-xs">{label}</dt>
      <dd className={`text-ink-900 ${mono ? 'mono text-xs' : 'text-sm'}`}>{value}</dd>
    </div>
  );
}

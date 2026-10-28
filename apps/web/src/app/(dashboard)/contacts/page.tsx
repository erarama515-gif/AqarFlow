'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Contact {
  id: string; fullName: string; fullNameAr?: string;
  phone?: string; phoneNormalized?: string; email?: string; city?: string;
  isBuyer: boolean; isSeller: boolean; isTenant: boolean;
  isLandlord: boolean; isInvestor: boolean;
}

const ROLE_PILLS = (c: Contact) => {
  const out: Array<{ label: string; cls: string }> = [];
  if (c.isBuyer)    out.push({ label: 'مشتري',  cls: 'pill-brand' });
  if (c.isSeller)   out.push({ label: 'بائع',   cls: 'pill-info' });
  if (c.isTenant)   out.push({ label: 'مستأجر', cls: 'pill-warn' });
  if (c.isLandlord) out.push({ label: 'مالك',   cls: 'pill-neutral' });
  if (c.isInvestor) out.push({ label: 'مستثمر', cls: 'pill-success' });
  return out;
};

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () => api<Contact[]>(`/v1/contacts?q=${encodeURIComponent(search)}`),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="page-title">العملاء</h1>
          <p className="page-sub mt-0.5">{data.length} عميل موحَّد عبر كل الأدوار</p>
        </div>
      </div>

      <div className="card p-2">
        <div className="relative">
          <Search className="absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف..." className="input pe-9" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>البريد الإلكتروني</th>
              <th>المدينة</th>
              <th>الأدوار</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8 text-ink-500 text-sm">جاري التحميل…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12">
                <UserCircle2 className="w-6 h-6 text-ink-400 mx-auto" />
                <div className="text-sm text-ink-700 font-medium mt-2.5">لا يوجد عملاء بعد</div>
                <div className="text-xs text-ink-500 mt-1">سيتم إنشاء العملاء تلقائياً عند تحويل العملاء المحتملين</div>
              </td></tr>
            ) : (
              data.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ink-300 to-ink-500 grid place-items-center text-2xs text-white font-semibold">
                        {(c.fullNameAr ?? c.fullName).slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-medium text-ink-900">{c.fullNameAr ?? c.fullName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono text-xs text-ink-700">{c.phoneNormalized ?? c.phone ?? '—'}</td>
                  <td className="text-xs text-ink-700" dir="ltr">{c.email ?? '—'}</td>
                  <td className="text-xs text-ink-700">{c.city ?? '—'}</td>
                  <td>
                    <div className="flex items-center gap-1 flex-wrap">
                      {ROLE_PILLS(c).map((r, i) => <span key={i} className={r.cls}>{r.label}</span>)}
                      {ROLE_PILLS(c).length === 0 && <span className="text-2xs text-ink-400">—</span>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

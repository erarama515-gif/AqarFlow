'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney, formatDate } from '@/lib/format';

interface CommissionEntry {
  id: string;
  recipientRole: string;
  grossAmount: string;
  vatAmount: string;
  netAmount: string;
  currency: string;
  status: string;
  createdAt: string;
  deal: { referenceCode: string; title: string };
}

interface MyCommissionsResponse {
  items: CommissionEntry[];
  totals: { pending: number; paid: number };
}

const STATUS_META: Record<string, { label: string; pill: string }> = {
  PENDING_CALCULATION: { label: 'قيد الحساب',     pill: 'pill-neutral' },
  CALCULATED:          { label: 'محسوبة',          pill: 'pill-info' },
  PENDING_APPROVAL:    { label: 'تنتظر الموافقة',  pill: 'pill-warn' },
  APPROVED:            { label: 'معتمدة',          pill: 'pill-brand' },
  REJECTED:            { label: 'مرفوضة',          pill: 'pill-danger' },
  PAID:                { label: 'مدفوعة',          pill: 'pill-success' },
  CLAWED_BACK:         { label: 'مستردة',          pill: 'pill-danger' },
};

const ROLE_LABEL: Record<string, string> = {
  PRIMARY_AGENT:    'الوكيل الأساسي',
  CO_AGENT:         'وكيل مساند',
  REFERRER:         'مُحيل',
  BROKERAGE:        'الوسيط/المؤسسة',
  MANAGER_OVERRIDE: 'إضافة المدير',
};

export default function CommissionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-commissions'],
    queryFn: () => api<MyCommissionsResponse>('/v1/commission-entries/my'),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="page-title">عمولاتي</h1>
        <p className="page-sub mt-0.5">إجمالي ما اكتسبته من الصفقات الفائزة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-ink-500">مستحقات قيد الانتظار</div>
            <div className="w-7 h-7 rounded-md bg-warn-50 text-warn-700 grid place-items-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-semibold mono">{formatMoney(data?.totals.pending ?? 0)}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-ink-500">إجمالي المدفوع</div>
            <div className="w-7 h-7 rounded-md bg-success-50 text-success-700 grid place-items-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-semibold mono">{formatMoney(data?.totals.paid ?? 0)}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-ink-500">عدد المعاملات</div>
            <ArrowUpRight className="w-3.5 h-3.5 text-ink-400" />
          </div>
          <div className="mt-2 text-2xl font-semibold mono">{data?.items.length ?? 0}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>الصفقة</th>
              <th>الدور</th>
              <th>الإجمالي</th>
              <th>VAT</th>
              <th>الصافي</th>
              <th>الحالة</th>
              <th className="text-end">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="py-8 text-center text-ink-500 text-sm">جاري التحميل…</td></tr>
            ) : !data || data.items.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center">
                <Wallet className="w-6 h-6 text-ink-400 mx-auto" />
                <div className="text-sm text-ink-700 mt-2 font-medium">لا توجد عمولات بعد</div>
                <div className="text-xs text-ink-500 mt-1">ستظهر عمولاتك تلقائياً عندما تفوز بصفقة</div>
              </td></tr>
            ) : (
              data.items.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="font-medium text-ink-900">{e.deal.title}</div>
                    <div className="text-2xs text-ink-500 mono">{e.deal.referenceCode}</div>
                  </td>
                  <td className="text-xs text-ink-700">{ROLE_LABEL[e.recipientRole] ?? e.recipientRole}</td>
                  <td className="mono text-xs">{formatMoney(Number(e.grossAmount), e.currency)}</td>
                  <td className="mono text-xs text-ink-500">{formatMoney(Number(e.vatAmount), e.currency)}</td>
                  <td className="mono font-medium">{formatMoney(Number(e.netAmount), e.currency)}</td>
                  <td><span className={STATUS_META[e.status]?.pill ?? 'pill-neutral'}>
                    {STATUS_META[e.status]?.label ?? e.status}
                  </span></td>
                  <td className="text-end text-2xs text-ink-500 mono">{formatDate(e.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

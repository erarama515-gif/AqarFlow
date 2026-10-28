'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users, Briefcase, KeyRound, TrendingUp, ArrowUpRight, ArrowDownRight,
  Clock, AlertCircle, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney, formatRelative } from '@/lib/format';

interface ForecastResponse {
  deals: number; total: number; weighted: number;
  byCurrency: Record<string, { total: number; weighted: number }>;
}

interface Lead {
  id: string; fullName: string; phone?: string; status: string;
  urgency?: string; score: number;
  source?: { name: string };
  assignedTo?: { firstName: string; lastName: string };
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'جديد', CONTACTED: 'تم التواصل', QUALIFIED: 'مؤهل',
  VIEWING_SCHEDULED: 'معاينة', OFFER_SENT: 'عرض',
  NEGOTIATION: 'تفاوض', WON: 'فاز', LOST: 'خاسر',
  UNREACHABLE: 'غير قابل للوصول', JUNK: 'مرفوض',
};
const URGENCY_PILL: Record<string, string> = {
  hot: 'pill-danger', warm: 'pill-warn', cold: 'pill-neutral',
};

export default function DashboardHome() {
  const { data: forecast } = useQuery({
    queryKey: ['forecast'],
    queryFn: () => api<ForecastResponse>('/v1/deals/forecast'),
  });
  const { data: leads = [] } = useQuery({
    queryKey: ['leads-recent'],
    queryFn: () => api<Lead[]>('/v1/leads?limit=8'),
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings-recent'],
    queryFn: () => api<any[]>('/v1/bookings?limit=5'),
  });

  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => l.urgency === 'hot').length;
  const newLeads = leads.filter((l) => l.status === 'NEW').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="page-sub mt-0.5">نظرة عامة على نشاط فريقك اليوم</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn-secondary btn-sm">آخر 7 أيام</button>
          <button className="btn-secondary btn-sm">تصدير</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="عملاء محتملون" value={String(totalLeads)}
          delta={`${newLeads} جديد`} tone="neutral" trend="up" />
        <KpiCard icon={Briefcase} label="صفقات مفتوحة" value={String(forecast?.deals ?? 0)}
          delta={forecast ? formatMoney(forecast.weighted) : '—'} tone="brand" trend="up"
          deltaLabel="القيمة المرجحة" />
        <KpiCard icon={KeyRound} label="حجوزات" value={String(bookings.length)}
          delta="نشطة الآن" tone="neutral" />
        <KpiCard icon={TrendingUp} label="القيمة الإجمالية"
          value={forecast ? formatMoney(forecast.total) : '—'}
          delta={`${hotLeads} عميل ساخن`} tone="success" trend="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 card overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="section-title">آخر العملاء المحتملين</h2>
              <p className="text-2xs text-ink-500 mt-0.5">{leads.length} عميل</p>
            </div>
            <Link href="/leads" className="text-xs text-brand-700 hover:text-brand-800 font-medium">عرض الكل ←</Link>
          </div>
          {leads.length === 0 ? (
            <EmptyHint icon={Users} label="لا توجد عملاء محتملون بعد" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>الاسم</th><th>الحالة</th><th>الأولوية</th>
                  <th>المصدر</th><th>المسؤول</th><th className="text-end">منذ</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 6).map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="font-medium text-ink-900">{l.fullName}</div>
                      <div className="text-2xs text-ink-500 mono">{l.phone ?? '—'}</div>
                    </td>
                    <td><span className="pill-neutral">{STATUS_LABEL[l.status] ?? l.status}</span></td>
                    <td>
                      <span className={URGENCY_PILL[l.urgency ?? 'cold']}>
                        <span className="dot bg-current" />
                        {l.urgency === 'hot' ? 'ساخن' : l.urgency === 'warm' ? 'دافئ' : 'بارد'}
                        <span className="mono ms-1 opacity-60">{l.score}</span>
                      </span>
                    </td>
                    <td className="text-ink-600">{l.source?.name ?? '—'}</td>
                    <td className="text-ink-600">{l.assignedTo ? `${l.assignedTo.firstName}` : '—'}</td>
                    <td className="text-end text-2xs text-ink-500 mono">{formatRelative(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div className="space-y-5">
          <section className="card">
            <div className="card-header"><h2 className="section-title">حالة قمع المبيعات</h2></div>
            <div className="p-4 space-y-3">
              {[
                { stage: 'New', count: leads.filter((l) => l.status === 'NEW').length, color: 'bg-ink-400' },
                { stage: 'Qualified', count: leads.filter((l) => l.status === 'QUALIFIED').length, color: 'bg-info-600' },
                { stage: 'Viewing', count: leads.filter((l) => l.status === 'VIEWING_SCHEDULED').length, color: 'bg-warn-600' },
                { stage: 'Won', count: leads.filter((l) => l.status === 'WON').length, color: 'bg-success-600' },
              ].map((s) => {
                const max = leads.length || 1;
                const pct = Math.round((s.count / max) * 100);
                return (
                  <div key={s.stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-ink-700">{s.stage}</span>
                      <span className="mono text-ink-500">{s.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <div className={`h-full ${s.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <h2 className="section-title">أنشطة قريبة</h2>
              <span className="pill-neutral">SLA</span>
            </div>
            <div className="divide-y divide-ink-100">
              {[
                { icon: AlertCircle, color: 'text-warn-600', text: 'متابعة عميل ليلى الحربي', when: 'خلال 30 دقيقة' },
                { icon: CheckCircle2, color: 'text-success-600', text: 'معاينة شقة A-0501', when: 'غداً 10:00' },
                { icon: Clock, color: 'text-ink-500', text: 'انتهاء حجز BK-2026-000003', when: 'بعد 4 أيام' },
              ].map((a, i) => {
                const Icon = a.icon;
                return (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${a.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink-900 truncate">{a.text}</div>
                      <div className="text-2xs text-ink-500 mt-0.5">{a.when}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, delta, deltaLabel, tone = 'neutral', trend }:
  { icon: any; label: string; value: string; delta?: string; deltaLabel?: string;
    tone?: 'neutral' | 'brand' | 'success' | 'danger'; trend?: 'up' | 'down'; }) {
  const toneClass = {
    neutral: 'bg-ink-100 text-ink-700', brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success-50 text-success-700', danger: 'bg-danger-50 text-danger-700',
  }[tone];
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-500">{label}</div>
        <div className={`w-7 h-7 rounded-md grid place-items-center ${toneClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight mono">{value}</span>
      </div>
      {delta && (
        <div className="mt-1 flex items-center gap-1 text-2xs text-ink-500">
          {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-success-600" />}
          {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-danger-600" />}
          <span className="mono">{delta}</span>
          {deltaLabel && <span className="text-ink-400">· {deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

function EmptyHint({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <Icon className="w-6 h-6 text-ink-400 mx-auto" />
      <div className="text-sm text-ink-500 mt-2">{label}</div>
    </div>
  );
}

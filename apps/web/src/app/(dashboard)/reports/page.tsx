'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Download, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';

const COLORS = ['#0d9488', '#0284c7', '#ca8a04', '#dc2626', '#7c3aed', '#0891b2'];

export default function ReportsPage() {
  const { data: forecast } = useQuery({
    queryKey: ['forecast'],
    queryFn: () => api<any>('/v1/deals/forecast'),
  });
  const { data: leads = [] } = useQuery({
    queryKey: ['report-leads'],
    queryFn: () => api<any[]>('/v1/leads?limit=200'),
  });

  const statusCounts: Record<string, number> = {};
  for (const l of leads) statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1;
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const sourceCounts: Record<string, number> = {};
  for (const l of leads) {
    const src = l.source?.name ?? l.channel ?? 'OTHER';
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
  }
  const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="page-title">التقارير والتحليلات</h1>
          <p className="page-sub mt-0.5">مؤشرات الأداء الفعلية وتحليل القمع</p>
        </div>
        <button className="btn-secondary btn-sm"><Download className="w-3.5 h-3.5" /> تصدير PDF</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Kpi label="صفقات مفتوحة" value={forecast?.deals ?? 0} mono />
        <Kpi label="القيمة الإجمالية" value={forecast ? formatMoney(forecast.total) : '—'} mono />
        <Kpi label="القيمة المرجحة" value={forecast ? formatMoney(forecast.weighted) : '—'} tone="success" mono icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card">
          <div className="card-header">
            <h3 className="section-title">توزيع الـ Leads حسب الحالة</h3>
            <span className="pill-neutral mono">{leads.length}</span>
          </div>
          <div className="p-4">
            {statusData.length === 0 ? (
              <div className="text-center py-12 text-sm text-ink-500">لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#57534e' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#57534e' }} />
                  <Tooltip cursor={{ fill: '#fafaf9' }} contentStyle={{ border: '1px solid #e7e5e4', borderRadius: 6, fontSize: 12 }} />
                  <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3 className="section-title">توزيع الـ Leads حسب المصدر</h3>
          </div>
          <div className="p-4">
            {sourceData.length === 0 ? (
              <div className="text-center py-12 text-sm text-ink-500">لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45}
                    label={(d) => `${d.value}`}>
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = 'neutral', icon: Icon, mono }:
  { label: string; value: any; tone?: 'neutral' | 'success'; icon?: any; mono?: boolean }) {
  const tc = tone === 'success' ? 'bg-success-50 text-success-700' : 'bg-ink-100 text-ink-700';
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-500">{label}</div>
        {Icon && <div className={`w-7 h-7 rounded-md grid place-items-center ${tc}`}><Icon className="w-3.5 h-3.5" /></div>}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${mono ? 'mono' : ''}`}>{value}</div>
    </div>
  );
}

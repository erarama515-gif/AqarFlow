'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Download, X } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import { useToast } from '@/components/ui/toast';

interface Lead {
  id: string; fullName: string; phone?: string; phoneNormalized?: string;
  email?: string; status: string; urgency?: string; score: number; channel: string;
  source?: { code: string; name: string };
  assignedTo?: { firstName: string; lastName: string };
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'جديد', CONTACTED: 'تم التواصل', QUALIFIED: 'مؤهل',
  VIEWING_SCHEDULED: 'معاينة', OFFER_SENT: 'عرض',
  NEGOTIATION: 'تفاوض', WON: 'فاز', LOST: 'خاسر',
  UNREACHABLE: 'غير قابل للوصول', JUNK: 'مرفوض',
};
const STATUS_PILL: Record<string, string> = {
  NEW: 'pill-info', CONTACTED: 'pill-neutral', QUALIFIED: 'pill-brand',
  VIEWING_SCHEDULED: 'pill-warn', OFFER_SENT: 'pill-warn',
  NEGOTIATION: 'pill-warn', WON: 'pill-success', LOST: 'pill-danger',
  UNREACHABLE: 'pill-neutral', JUNK: 'pill-neutral',
};
const URGENCY_PILL: Record<string, string> = {
  hot: 'pill-danger', warm: 'pill-warn', cold: 'pill-neutral',
};

export default function LeadsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ['leads', search, statusFilter],
    queryFn: () => api<Lead[]>(
      `/v1/leads?q=${encodeURIComponent(search)}${statusFilter ? `&status=${statusFilter}` : ''}`
    ),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api('/v1/leads', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.show({ title: 'تم إنشاء العميل المحتمل', variant: 'success' });
      qc.invalidateQueries({ queryKey: ['leads'] });
      setShowCreate(false);
    },
    onError: (err: any) => toast.show({ title: 'فشل', description: err.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="page-title">العملاء المحتملون</h1>
          <p className="page-sub mt-0.5">إدارة وتوزيع وتأهيل الـ leads عبر القمع</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn-secondary btn-sm"><Download className="w-3.5 h-3.5" /> تصدير</button>
          <button onClick={() => setShowCreate(true)} className="btn-brand btn-sm">
            <Plus className="w-3.5 h-3.5" /> عميل جديد
          </button>
        </div>
      </div>

      <div className="card p-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف أو البريد..." className="input pe-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-44">
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-ghost btn-sm"><Filter className="w-3.5 h-3.5" /> فلاتر</button>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>العميل</th><th>التواصل</th><th>الحالة</th>
              <th>الأولوية</th><th>المصدر</th><th>المسؤول</th>
              <th className="text-end">منذ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-ink-500 text-sm">جاري التحميل…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-ink-500 text-sm">لا توجد نتائج تطابق البحث</td></tr>
            ) : (
              data.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link href={`/leads/${lead.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                      {lead.fullName}
                    </Link>
                    <div className="text-2xs text-ink-500">عميل محتمل</div>
                  </td>
                  <td>
                    <div className="text-xs text-ink-700 mono">{lead.phoneNormalized ?? lead.phone ?? '—'}</div>
                    <div className="text-2xs text-ink-500 truncate max-w-[180px]" dir="ltr">{lead.email ?? '—'}</div>
                  </td>
                  <td><span className={STATUS_PILL[lead.status] ?? 'pill-neutral'}>{STATUS_LABEL[lead.status] ?? lead.status}</span></td>
                  <td>
                    <span className={URGENCY_PILL[lead.urgency ?? 'cold']}>
                      <span className="dot bg-current" />
                      {lead.urgency === 'hot' ? 'ساخن' : lead.urgency === 'warm' ? 'دافئ' : 'بارد'}
                      <span className="mono ms-1 opacity-60">{lead.score}</span>
                    </span>
                  </td>
                  <td><div className="text-xs text-ink-700">{lead.source?.name ?? lead.channel}</div></td>
                  <td className="text-xs text-ink-700">
                    {lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : '—'}
                  </td>
                  <td className="text-end text-2xs text-ink-500 mono">{formatRelative(lead.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateLeadModal onClose={() => setShowCreate(false)}
          onSubmit={(b) => createMutation.mutate(b)} loading={createMutation.isPending} />
      )}
    </div>
  );
}

function CreateLeadModal({ onClose, onSubmit, loading }:
  { onClose: () => void; onSubmit: (b: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', interestType: 'BUY',
    budgetMin: '', budgetMax: '', notes: '', sourceCode: 'MANUAL',
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      fullName: form.fullName,
      phone: form.phone || undefined,
      email: form.email || undefined,
      interestType: form.interestType,
      budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
      budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
      notes: form.notes || undefined,
      sourceCode: form.sourceCode,
    });
  };

  return (
    <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm grid place-items-center p-4 z-50 animate-fade-in"
      onClick={onClose}>
      <div className="card w-full max-w-lg shadow-elevate" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="section-title">عميل محتمل جديد</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="label">الاسم الكامل</label>
            <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">الهاتف</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" dir="ltr" />
            </div>
            <div>
              <label className="label">البريد</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" dir="ltr" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">نوع الاهتمام</label>
              <select value={form.interestType} onChange={(e) => setForm({ ...form, interestType: e.target.value })} className="input">
                <option value="BUY">شراء</option><option value="RENT">إيجار</option>
                <option value="INVEST">استثمار</option><option value="SELL">بيع</option>
                <option value="RENT_OUT">تأجير</option>
              </select>
            </div>
            <div>
              <label className="label">حد أدنى</label>
              <input type="number" value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} className="input" dir="ltr" />
            </div>
            <div>
              <label className="label">حد أقصى</label>
              <input type="number" value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} className="input" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={loading} className="btn-brand">
              {loading ? 'جاري الحفظ…' : 'إنشاء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

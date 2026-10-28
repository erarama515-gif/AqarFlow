'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Phone, Mail, MapPin, User, Tag, Briefcase, MessageSquare,
  ChevronDown, CheckCircle2, X, UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney, formatRelative } from '@/lib/format';
import { useToast } from '@/components/ui/toast';

const STATUS_OPTIONS = [
  { code: 'NEW',                label: 'جديد' },
  { code: 'CONTACTED',          label: 'تم التواصل' },
  { code: 'QUALIFIED',          label: 'مؤهل' },
  { code: 'VIEWING_SCHEDULED',  label: 'معاينة مجدولة' },
  { code: 'OFFER_SENT',         label: 'عرض مُرسل' },
  { code: 'NEGOTIATION',        label: 'تفاوض' },
  { code: 'WON',                label: 'فاز' },
  { code: 'LOST',               label: 'خاسر' },
  { code: 'UNREACHABLE',        label: 'غير قابل للوصول' },
  { code: 'JUNK',               label: 'مرفوض' },
];

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [showActivity, setShowActivity] = useState(false);

  const { data: lead, isLoading, error } = useQuery<any>({
    queryKey: ['lead', params.id],
    queryFn: () => api(`/v1/leads/${params.id}`),
  });

  const changeStatus = useMutation({
    mutationFn: (status: string) => api(`/v1/leads/${params.id}/status`, {
      method: 'POST', body: JSON.stringify({ status }),
    }),
    onSuccess: () => {
      toast.show({ title: 'تم تحديث الحالة', variant: 'success' });
      qc.invalidateQueries({ queryKey: ['lead', params.id] });
    },
    onError: (e: any) => toast.show({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  const convertToContact = useMutation({
    mutationFn: () => api<{ contactId: string }>(`/v1/leads/${params.id}/convert-to-contact`, { method: 'POST' }),
    onSuccess: (r) => {
      toast.show({ title: 'تم التحويل إلى عميل', description: r.contactId, variant: 'success' });
      qc.invalidateQueries({ queryKey: ['lead', params.id] });
    },
    onError: (e: any) => toast.show({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="card p-12 text-center text-ink-500 text-sm">جاري التحميل…</div>;
  }
  if (error || !lead) {
    return (
      <div className="card p-12 text-center">
        <X className="w-7 h-7 text-danger-600 mx-auto" />
        <div className="text-sm text-ink-700 mt-2 font-medium">العميل المحتمل غير موجود</div>
        <Link href="/leads" className="btn-secondary btn-sm mt-4 inline-flex">العودة للقائمة</Link>
      </div>
    );
  }

  const fullName = lead.fullName;
  const initials = fullName.split(' ').slice(0, 2).map((n: string) => n[0]).join('');

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-ink-500">
        <Link href="/leads" className="hover:text-ink-900 inline-flex items-center gap-1">
          <ArrowRight className="w-3 h-3" /> العملاء المحتملون
        </Link>
        <span>·</span>
        <span className="text-ink-700">{fullName}</span>
      </nav>

      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-semibold text-base shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight text-ink-950">{fullName}</h1>
              <span className="pill-neutral">{lead.status}</span>
              <span className={`pill-${lead.urgency === 'hot' ? 'danger' : lead.urgency === 'warm' ? 'warn' : 'neutral'}`}>
                <span className="dot bg-current" />
                {lead.urgency === 'hot' ? 'ساخن' : lead.urgency === 'warm' ? 'دافئ' : 'بارد'}
                <span className="mono ms-1 opacity-60">{lead.score}</span>
              </span>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-ink-600">
              {lead.phoneNormalized && (
                <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /><span className="mono">{lead.phoneNormalized}</span></span>
              )}
              {lead.email && (
                <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /><span dir="ltr">{lead.email}</span></span>
              )}
              {lead.source && (
                <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" />{lead.source.name}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => convertToContact.mutate()} className="btn-secondary btn-sm" disabled={convertToContact.isPending || lead.contactId}>
              <UserCheck className="w-3.5 h-3.5" />
              {lead.contactId ? 'مُحوّل لعميل' : 'تحويل لعميل'}
            </button>
            <details className="relative">
              <summary className="btn-brand btn-sm list-none cursor-pointer">
                تغيير الحالة <ChevronDown className="w-3.5 h-3.5" />
              </summary>
              <div className="absolute end-0 mt-1 w-56 card shadow-elevate p-1 z-10">
                {STATUS_OPTIONS.map((s) => (
                  <button key={s.code}
                    onClick={() => changeStatus.mutate(s.code)}
                    disabled={lead.status === s.code}
                    className="w-full text-start px-3 py-1.5 rounded text-sm hover:bg-ink-100 disabled:opacity-50 flex items-center justify-between">
                    {s.label}
                    {lead.status === s.code && <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activities timeline */}
        <section className="lg:col-span-2 card">
          <div className="card-header">
            <h2 className="section-title">المحادثات والأنشطة</h2>
            <button className="btn-secondary btn-sm" onClick={() => setShowActivity(true)}>
              <MessageSquare className="w-3.5 h-3.5" /> تسجيل نشاط
            </button>
          </div>
          {(lead.activities ?? []).length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-ink-500">لا توجد أنشطة بعد</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {lead.activities.map((a: any) => (
                <div key={a.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xs uppercase text-ink-500 font-medium">{a.type}</span>
                    <span className="text-2xs text-ink-400">·</span>
                    <span className="text-2xs text-ink-500">
                      {a.user ? `${a.user.firstName} ${a.user.lastName}` : '—'}
                    </span>
                    <span className="text-2xs text-ink-400 ms-auto">{formatRelative(a.createdAt)}</span>
                  </div>
                  <div className="text-sm font-medium text-ink-900">{a.subject}</div>
                  {a.description && (
                    <p className="mt-1 text-xs text-ink-600 whitespace-pre-wrap">{a.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="card">
            <div className="card-header"><h3 className="section-title">التفاصيل</h3></div>
            <dl className="p-4 grid grid-cols-1 gap-y-2.5 text-xs">
              <Row label="القناة" value={lead.channel} />
              {lead.interestType && <Row label="نوع الاهتمام" value={lead.interestType} />}
              {(lead.budgetMin || lead.budgetMax) && (
                <Row label="الميزانية" value={`${lead.budgetMin ? formatMoney(Number(lead.budgetMin), lead.currency) : '—'} - ${lead.budgetMax ? formatMoney(Number(lead.budgetMax), lead.currency) : '—'}`} mono />
              )}
              {lead.bedroomsMin != null && <Row label="غرف نوم (أدنى)" value={String(lead.bedroomsMin)} mono />}
              {lead.preferredAreas?.length > 0 && <Row label="المناطق المفضلة" value={lead.preferredAreas.join('، ')} />}
              {lead.propertyTypes?.length > 0 && <Row label="نوع العقار" value={lead.propertyTypes.join('، ')} />}
              {lead.utmSource && <Row label="UTM Source" value={lead.utmSource} mono />}
              {lead.utmCampaign && <Row label="UTM Campaign" value={lead.utmCampaign} mono />}
              <Row label="أُنشئ" value={formatRelative(lead.createdAt)} />
              {lead.firstContactedAt && <Row label="أول اتصال" value={formatRelative(lead.firstContactedAt)} />}
            </dl>
          </section>

          {lead.assignedTo && (
            <section className="card">
              <div className="card-header"><h3 className="section-title">المسؤول</h3></div>
              <div className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-ink-200 grid place-items-center text-sm font-semibold text-ink-700">
                  {lead.assignedTo.firstName[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-ink-900">
                    {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                  </div>
                  <div className="text-2xs text-ink-500" dir="ltr">{lead.assignedTo.email}</div>
                </div>
              </div>
            </section>
          )}

          {lead.notes && (
            <section className="card">
              <div className="card-header"><h3 className="section-title">ملاحظات</h3></div>
              <p className="p-4 text-sm text-ink-700 whitespace-pre-wrap">{lead.notes}</p>
            </section>
          )}
        </aside>
      </div>

      {showActivity && (
        <CreateActivityModal leadId={params.id} onClose={() => setShowActivity(false)} />
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 pb-2 border-b border-ink-100 last:border-0 last:pb-0">
      <dt className="text-ink-500 shrink-0">{label}</dt>
      <dd className={`text-ink-900 text-end ${mono ? 'mono' : ''}`}>{value}</dd>
    </div>
  );
}

function CreateActivityModal({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState('CALL');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const create = useMutation({
    mutationFn: () => api('/v1/activities', {
      method: 'POST',
      body: JSON.stringify({ type, subject, description, leadId }),
    }),
    onSuccess: () => {
      toast.show({ title: 'تم تسجيل النشاط', variant: 'success' });
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
      onClose();
    },
    onError: (e: any) => toast.show({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm grid place-items-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-md shadow-elevate" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="section-title">تسجيل نشاط</h3>
          <button onClick={onClose} className="text-ink-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="p-4 space-y-3">
          <div>
            <label className="label">النوع</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input">
              <option value="CALL">اتصال</option><option value="MEETING">اجتماع</option>
              <option value="EMAIL">بريد</option><option value="WHATSAPP">واتساب</option>
              <option value="SMS">SMS</option><option value="NOTE">ملاحظة</option>
              <option value="TASK">مهمة</option>
            </select>
          </div>
          <div>
            <label className="label">الموضوع</label>
            <input required value={subject} onChange={(e) => setSubject(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">التفاصيل</label>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={create.isPending} className="btn-brand">
              {create.isPending ? 'جاري الحفظ…' : 'تسجيل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

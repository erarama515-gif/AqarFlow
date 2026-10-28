'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, KeyRound, Clock, CheckCircle2, XCircle, AlertTriangle, FileSignature, X, Banknote,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney, formatRelative } from '@/lib/format';
import { useToast } from '@/components/ui/toast';

interface Booking {
  id: string;
  bookingNumber: string;
  propertyId: string;
  contactId: string;
  agentId: string;
  unitPrice: string;
  bookingFee: string;
  currency: string;
  status: string;
  bookedAt: string;
  feeReceivedAt?: string;
  paymentDueAt: string;
  spaDueAt: string;
  coolingOffEndsAt?: string;
  spaSignedAt?: string;
  cancelledAt?: string;
  refundAmount?: string;
  notes?: string;
}

const STATUS_META: Record<string, { label: string; pill: string; icon: any }> = {
  PENDING_PAYMENT:   { label: 'في انتظار الدفع',   pill: 'pill-warn',    icon: Clock },
  ACTIVE:            { label: 'نشط',                pill: 'pill-info',    icon: KeyRound },
  CONVERTED_TO_SALE: { label: 'محوّل لبيع',         pill: 'pill-success', icon: CheckCircle2 },
  CANCELLED:         { label: 'ملغي (مرجَع)',       pill: 'pill-neutral', icon: XCircle },
  EXPIRED:           { label: 'منتهي الصلاحية',     pill: 'pill-danger',  icon: AlertTriangle },
  FORFEITED:         { label: 'مصادَر',              pill: 'pill-danger',  icon: XCircle },
};

const STAGES = [
  { code: 'PENDING_PAYMENT',   label: 'في انتظار الدفع' },
  { code: 'ACTIVE',            label: 'نشط — توقيع SPA' },
  { code: 'CONVERTED_TO_SALE', label: 'تحوّل لبيع' },
];

export default function BookingsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['bookings', statusFilter],
    queryFn: () => api<Booking[]>(`/v1/bookings${statusFilter ? `?status=${statusFilter}` : ''}`),
  });

  const recordPaymentMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api(`/v1/bookings/${id}/payment`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.show({ title: 'تم تسجيل الدفع', variant: 'success' });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      setSelected(null);
    },
    onError: (e: any) => toast.show({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  const signSpaMut = useMutation({
    mutationFn: (id: string) => api(`/v1/bookings/${id}/sign-spa`, { method: 'POST' }),
    onSuccess: () => {
      toast.show({ title: 'تم توقيع SPA وتحويل الحجز لصفقة', variant: 'success' });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      setSelected(null);
    },
    onError: (e: any) => toast.show({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api<{ refundAmount: number }>(`/v1/bookings/${id}/cancel`, {
        method: 'POST', body: JSON.stringify({ reason }),
      }),
    onSuccess: (r) => {
      toast.show({
        title: 'تم إلغاء الحجز',
        description: r.refundAmount > 0 ? `استرداد: ${formatMoney(r.refundAmount)}` : 'بدون استرداد',
        variant: 'success',
      });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      setSelected(null);
    },
    onError: (e: any) => toast.show({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  const totalsByStatus = data.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="page-title">الحجوزات</h1>
          <p className="page-sub mt-0.5">إدارة دورة الحجز من الدفع لتوقيع SPA</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-brand btn-sm">
          <Plus className="w-3.5 h-3.5" /> حجز جديد
        </button>
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['PENDING_PAYMENT', 'ACTIVE', 'CONVERTED_TO_SALE', 'CANCELLED'] as const).map((s) => {
          const m = STATUS_META[s];
          const Icon = m.icon;
          return (
            <div key={s} className="card p-3.5">
              <div className="flex items-center justify-between">
                <div className="text-xs text-ink-500">{m.label}</div>
                <Icon className="w-3.5 h-3.5 text-ink-400" />
              </div>
              <div className="mt-1 text-2xl font-semibold mono">{totalsByStatus[s] ?? 0}</div>
            </div>
          );
        })}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={() => setStatusFilter('')}
          className={`pill cursor-pointer ${!statusFilter ? 'bg-ink-900 text-white' : 'pill-neutral'}`}>الكل</button>
        {Object.entries(STATUS_META).map(([k, m]) => (
          <button key={k} onClick={() => setStatusFilter(k)}
            className={`pill cursor-pointer ${statusFilter === k ? 'bg-ink-900 text-white' : 'pill-neutral'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم الحجز</th>
              <th>الحالة</th>
              <th>سعر الوحدة</th>
              <th>رسوم الحجز</th>
              <th>موعد الدفع</th>
              <th>موعد SPA</th>
              <th className="text-end">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-ink-500 text-sm">جاري التحميل…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12">
                <KeyRound className="w-6 h-6 text-ink-400 mx-auto" />
                <div className="text-sm text-ink-700 font-medium mt-2.5">لا توجد حجوزات</div>
                <div className="text-xs text-ink-500 mt-1">ابدأ بإنشاء حجز لعميل اشترى وحدة off-plan</div>
              </td></tr>
            ) : (
              data.map((b) => {
                const meta = STATUS_META[b.status];
                return (
                  <tr key={b.id}>
                    <td className="mono text-xs">{b.bookingNumber}</td>
                    <td><span className={meta.pill}>{meta.label}</span></td>
                    <td className="mono">{formatMoney(Number(b.unitPrice), b.currency)}</td>
                    <td className="mono">{formatMoney(Number(b.bookingFee), b.currency)}</td>
                    <td className="text-2xs text-ink-600 mono">{formatRelative(b.paymentDueAt)}</td>
                    <td className="text-2xs text-ink-600 mono">{formatRelative(b.spaDueAt)}</td>
                    <td className="text-end">
                      <button onClick={() => setSelected(b)} className="btn-secondary btn-sm">
                        التفاصيل
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer-style detail panel */}
      {selected && (
        <BookingDetail
          booking={selected}
          onClose={() => setSelected(null)}
          onPaymentRecorded={(body) => recordPaymentMut.mutate({ id: selected.id, body })}
          onSignSpa={() => signSpaMut.mutate(selected.id)}
          onCancel={(reason) => cancelMut.mutate({ id: selected.id, reason })}
          loading={recordPaymentMut.isPending || signSpaMut.isPending || cancelMut.isPending}
        />
      )}

      {showCreate && <CreateBookingModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function BookingDetail({
  booking, onClose, onPaymentRecorded, onSignSpa, onCancel, loading,
}: {
  booking: Booking; onClose: () => void;
  onPaymentRecorded: (b: any) => void; onSignSpa: () => void;
  onCancel: (r: string) => void; loading: boolean;
}) {
  const [showPayment, setShowPayment] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const meta = STATUS_META[booking.status];
  const Icon = meta.icon;
  const currentStageIdx = STAGES.findIndex((s) => s.code === booking.status);

  return (
    <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm z-50 animate-fade-in" onClick={onClose}>
      <div className="absolute top-0 end-0 h-full w-full max-w-xl bg-white shadow-elevate overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="card-header sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-ink-700" />
            <h3 className="section-title mono">{booking.bookingNumber}</h3>
            <span className={meta.pill}>{meta.label}</span>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Workflow stepper */}
          <div className="card p-4">
            <div className="text-xs font-semibold text-ink-700 mb-3">دورة حياة الحجز</div>
            <ol className="space-y-3">
              {STAGES.map((stage, i) => {
                const reached = i <= currentStageIdx;
                const isCurrent = i === currentStageIdx;
                return (
                  <li key={stage.code} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 grid place-items-center text-2xs font-semibold
                      ${reached ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-ink-200 text-ink-400'}`}>
                      {reached && !isCurrent ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm ${reached ? 'text-ink-950 font-medium' : 'text-ink-500'}`}>
                        {stage.label}
                      </div>
                    </div>
                    {isCurrent && <span className="dot bg-brand-500 animate-pulse" />}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Commercial summary */}
          <div className="card">
            <div className="card-header"><h4 className="section-title">الشروط التجارية</h4></div>
            <dl className="p-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <Row label="سعر الوحدة" value={formatMoney(Number(booking.unitPrice), booking.currency)} mono />
              <Row label="رسوم الحجز" value={formatMoney(Number(booking.bookingFee), booking.currency)} mono />
              <Row label="موعد الدفع" value={formatRelative(booking.paymentDueAt)} />
              <Row label="موعد توقيع SPA" value={formatRelative(booking.spaDueAt)} />
              {booking.coolingOffEndsAt && (
                <Row label="نهاية فترة السماح" value={formatRelative(booking.coolingOffEndsAt)} />
              )}
              {booking.feeReceivedAt && (
                <Row label="استلام الدفع" value={formatRelative(booking.feeReceivedAt)} />
              )}
              {booking.spaSignedAt && (
                <Row label="توقيع SPA" value={formatRelative(booking.spaSignedAt)} />
              )}
              {booking.refundAmount && (
                <Row label="مبلغ مسترد" value={formatMoney(Number(booking.refundAmount), booking.currency)} mono />
              )}
            </dl>
          </div>

          {/* Actions based on state */}
          {booking.status === 'PENDING_PAYMENT' && (
            <div className="card p-4 space-y-2">
              <div className="text-xs font-medium text-ink-700">في انتظار استلام رسوم الحجز</div>
              <p className="text-2xs text-ink-500">يجب أن يصل المبلغ قبل {formatRelative(booking.paymentDueAt)}، وإلا سيتم إلغاء الحجز تلقائياً.</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowPayment(true)} className="btn-brand btn-sm flex-1" disabled={loading}>
                  <Banknote className="w-3.5 h-3.5" /> تسجيل الدفع
                </button>
                <button onClick={() => setShowCancel(true)} className="btn-secondary btn-sm" disabled={loading}>إلغاء</button>
              </div>
            </div>
          )}

          {booking.status === 'ACTIVE' && (
            <div className="card p-4 space-y-2">
              <div className="text-xs font-medium text-ink-700">جاهز لتوقيع SPA</div>
              <p className="text-2xs text-ink-500">عند توقيع الـ SPA سيتم تحويل الحجز إلى صفقة WON تلقائياً وتُحسب العمولات.</p>
              <div className="flex items-center gap-2">
                <button onClick={onSignSpa} className="btn-brand btn-sm flex-1" disabled={loading}>
                  <FileSignature className="w-3.5 h-3.5" /> توقيع SPA
                </button>
                <button onClick={() => setShowCancel(true)} className="btn-secondary btn-sm" disabled={loading}>إلغاء</button>
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="card">
              <div className="card-header"><h4 className="section-title">ملاحظات</h4></div>
              <p className="p-4 text-sm text-ink-700 whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}
        </div>

        {showPayment && (
          <PaymentModal
            onClose={() => setShowPayment(false)}
            onSubmit={(b) => { onPaymentRecorded(b); setShowPayment(false); }}
          />
        )}
        {showCancel && (
          <CancelModal
            onClose={() => setShowCancel(false)}
            onSubmit={(r) => { onCancel(r); setShowCancel(false); }}
          />
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-ink-500">{label}</dt>
      <dd className={`text-ink-900 ${mono ? 'mono' : ''}`}>{value}</dd>
    </>
  );
}

function PaymentModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (b: any) => void }) {
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  return (
    <div className="fixed inset-0 bg-ink-950/40 grid place-items-center p-4 z-[60]" onClick={onClose}>
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="section-title mb-4">تسجيل دفع رسوم الحجز</h3>
        <div className="space-y-3">
          <div>
            <label className="label">طريقة الدفع</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
              <option value="BANK_TRANSFER">تحويل بنكي</option>
              <option value="CASH">نقدي</option>
              <option value="CHEQUE">شيك</option>
              <option value="CREDIT_CARD">بطاقة ائتمان</option>
              <option value="ONLINE_GATEWAY">دفع إلكتروني</option>
              <option value="OTHER">أخرى</option>
            </select>
          </div>
          <div>
            <label className="label">رقم المرجع</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} className="input" dir="ltr" placeholder="REF-2026-001" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">إلغاء</button>
            <button onClick={() => onSubmit({ method, reference })} className="btn-brand">تسجيل الدفع</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CancelModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (r: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-ink-950/40 grid place-items-center p-4 z-[60]" onClick={onClose}>
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="section-title mb-4">إلغاء الحجز</h3>
        <p className="text-xs text-ink-600 mb-3">إذا تم الإلغاء داخل فترة السماح يتم استرداد كامل المبلغ. خارجها، يُصادَر.</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input" rows={4}
          placeholder="سبب الإلغاء..." />
        <div className="flex items-center justify-end gap-2 mt-3">
          <button onClick={onClose} className="btn-secondary">رجوع</button>
          <button onClick={() => onSubmit(reason)} disabled={!reason.trim()} className="btn-danger">تأكيد الإلغاء</button>
        </div>
      </div>
    </div>
  );
}

function CreateBookingModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: properties = [] } = useQuery({
    queryKey: ['available-properties-for-booking'],
    queryFn: () => api<any[]>('/v1/properties?inventoryStatus=AVAILABLE&limit=50'),
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-for-booking'],
    queryFn: () => api<any[]>('/v1/contacts?limit=50'),
  });

  const [form, setForm] = useState({
    propertyId: '', contactId: '', unitPrice: '', bookingFee: '',
    currency: 'SAR', paymentDueInHours: 72, spaDueInDays: 21,
    coolingOffDays: 7, notes: '',
  });

  const create = useMutation({
    mutationFn: (body: any) => api('/v1/bookings', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.show({ title: 'تم إنشاء الحجز', variant: 'success' });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    },
    onError: (e: any) => toast.show({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({
      propertyId: form.propertyId,
      contactId: form.contactId,
      unitPrice: Number(form.unitPrice),
      bookingFee: Number(form.bookingFee),
      currency: form.currency,
      paymentDueInHours: Number(form.paymentDueInHours),
      spaDueInDays: Number(form.spaDueInDays),
      coolingOffDays: Number(form.coolingOffDays),
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm grid place-items-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-2xl shadow-elevate" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="section-title">إنشاء حجز جديد</h3>
          <button onClick={onClose} className="text-ink-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">الوحدة</label>
              <select required value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} className="input">
                <option value="">— اختر وحدة متاحة —</option>
                {properties.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.referenceCode} — {p.titleAr ?? p.titleEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">العميل</label>
              <select required value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })} className="input">
                <option value="">— اختر العميل —</option>
                {contacts.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.fullNameAr ?? c.fullName} — {c.phone ?? ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">سعر الوحدة</label>
              <input required type="number" min={1} value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="input" dir="ltr" />
            </div>
            <div>
              <label className="label">رسوم الحجز</label>
              <input required type="number" min={0} value={form.bookingFee}
                onChange={(e) => setForm({ ...form, bookingFee: e.target.value })} className="input" dir="ltr" />
            </div>
            <div>
              <label className="label">العملة</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input">
                <option value="SAR">SAR</option><option value="AED">AED</option>
                <option value="EGP">EGP</option><option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">مهلة الدفع (ساعات)</label>
              <input type="number" min={1} value={form.paymentDueInHours}
                onChange={(e) => setForm({ ...form, paymentDueInHours: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label className="label">مهلة SPA (أيام)</label>
              <input type="number" min={1} value={form.spaDueInDays}
                onChange={(e) => setForm({ ...form, spaDueInDays: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label className="label">فترة السماح (أيام)</label>
              <input type="number" min={0} value={form.coolingOffDays}
                onChange={(e) => setForm({ ...form, coolingOffDays: Number(e.target.value) })} className="input" />
            </div>
          </div>

          <div>
            <label className="label">ملاحظات</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={create.isPending} className="btn-brand">
              {create.isPending ? 'جاري الإنشاء…' : 'إنشاء الحجز'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

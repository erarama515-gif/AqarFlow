'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, MapPin, BedDouble, Bath, Maximize, Calendar, KeyRound,
  ImageOff, Tag, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney, formatRelative } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { useState } from 'react';

const STATUS_PILL: Record<string, string> = {
  AVAILABLE: 'pill-success', RESERVED: 'pill-warn', BOOKED: 'pill-warn',
  SOLD: 'pill-neutral', RENTED: 'pill-neutral', BLOCKED: 'pill-danger',
  DRAFT: 'pill-info', ON_HOLD: 'pill-warn', UNDER_MAINTENANCE: 'pill-neutral',
};
const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'متاح', RESERVED: 'محجوز', BOOKED: 'مؤكد',
  SOLD: 'مباع', RENTED: 'مؤجر', BLOCKED: 'موقوف',
  DRAFT: 'مسودة', ON_HOLD: 'معلق', UNDER_MAINTENANCE: 'صيانة',
};

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [showReserve, setShowReserve] = useState(false);

  const { data: prop, isLoading, error } = useQuery<any>({
    queryKey: ['property', params.id],
    queryFn: () => api(`/v1/properties/${params.id}`),
  });

  const publishMut = useMutation({
    mutationFn: () => api(`/v1/properties/${params.id}/publish`, { method: 'POST' }),
    onSuccess: () => {
      toast.show({ title: 'تم النشر', variant: 'success' });
      qc.invalidateQueries({ queryKey: ['property', params.id] });
    },
    onError: (e: any) => toast.show({ title: 'فشل النشر', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="card p-12 text-center text-ink-500 text-sm">جاري التحميل…</div>;
  if (error || !prop) {
    return (
      <div className="card p-12 text-center">
        <X className="w-7 h-7 text-danger-600 mx-auto" />
        <div className="text-sm text-ink-700 mt-2 font-medium">العقار غير موجود</div>
        <Link href="/properties" className="btn-secondary btn-sm mt-4 inline-flex">العودة للقائمة</Link>
      </div>
    );
  }

  const primaryMedia = prop.media?.[0];

  return (
    <div className="space-y-4 animate-fade-in">
      <nav className="flex items-center gap-1.5 text-xs text-ink-500">
        <Link href="/properties" className="hover:text-ink-900 inline-flex items-center gap-1">
          <ArrowRight className="w-3 h-3" /> العقارات
        </Link>
        <span>·</span>
        <span className="text-ink-700 mono">{prop.referenceCode}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Hero / Gallery */}
          <div className="card overflow-hidden">
            <div className="aspect-[16/9] bg-ink-100 relative">
              {primaryMedia ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryMedia.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-ink-400">
                  <div className="text-center">
                    <ImageOff className="w-6 h-6 mx-auto" />
                    <div className="text-xs mt-2">لا توجد صور</div>
                  </div>
                </div>
              )}
              <span className={`absolute top-3 end-3 ${STATUS_PILL[prop.inventoryStatus]}`}>
                {STATUS_LABEL[prop.inventoryStatus]}
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-ink-950">
                    {prop.titleAr ?? prop.titleEn ?? prop.referenceCode}
                  </h1>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-600">
                    <MapPin className="w-3 h-3" />
                    <span>{[prop.district, prop.city, prop.country].filter(Boolean).join('، ')}</span>
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-2xl font-semibold mono">{formatMoney(prop.price, prop.currency)}</div>
                  {prop.pricePerArea && (
                    <div className="text-2xs text-ink-500 mono mt-0.5">
                      {formatMoney(Number(prop.pricePerArea), prop.currency)} / م²
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <Spec icon={BedDouble} label="غرف نوم" value={String(prop.bedrooms ?? '—')} />
                <Spec icon={Bath} label="حمامات" value={String(prop.bathrooms ?? '—')} />
                <Spec icon={Maximize} label="مساحة" value={prop.builtArea ? `${Number(prop.builtArea)} م²` : '—'} />
                <Spec icon={Calendar} label="سنة البناء" value={prop.yearBuilt ? String(prop.yearBuilt) : '—'} />
              </div>

              {(prop.descriptionAr || prop.descriptionEn) && (
                <div className="mt-5 pt-5 border-t border-ink-100">
                  <h3 className="text-xs font-semibold text-ink-700 mb-2">الوصف</h3>
                  <p className="text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">
                    {prop.descriptionAr ?? prop.descriptionEn}
                  </p>
                </div>
              )}

              {prop.amenities?.length > 0 && (
                <div className="mt-5 pt-5 border-t border-ink-100">
                  <h3 className="text-xs font-semibold text-ink-700 mb-2">المرافق</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {prop.amenities.map((a: string) => (
                      <span key={a} className="pill-neutral"><Tag className="w-2.5 h-2.5" /> {a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Price changes */}
          {prop.priceHistory?.length > 0 && (
            <section className="card">
              <div className="card-header"><h3 className="section-title">تاريخ التسعير</h3></div>
              <table className="data-table">
                <thead>
                  <tr><th>التاريخ</th><th>السعر السابق</th><th>السعر الجديد</th><th>السبب</th></tr>
                </thead>
                <tbody>
                  {prop.priceHistory.map((p: any) => (
                    <tr key={p.id}>
                      <td className="text-2xs text-ink-500 mono">{formatRelative(p.changedAt)}</td>
                      <td className="mono">{p.oldPrice ? formatMoney(Number(p.oldPrice), p.currency) : '—'}</td>
                      <td className="mono font-medium">{formatMoney(Number(p.newPrice), p.currency)}</td>
                      <td className="text-xs">{p.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        {/* Side — actions + meta */}
        <aside className="space-y-4">
          <section className="card p-4 space-y-2">
            <div className="text-xs font-semibold text-ink-700">إجراءات</div>
            {!prop.isPublished && (
              <button onClick={() => publishMut.mutate()} disabled={publishMut.isPending}
                className="btn-brand btn-sm w-full">
                {publishMut.isPending ? 'جاري النشر…' : 'نشر الإعلان'}
              </button>
            )}
            {prop.inventoryStatus === 'AVAILABLE' && (
              <button onClick={() => setShowReserve(true)} className="btn-secondary btn-sm w-full">
                <KeyRound className="w-3.5 h-3.5" /> حجز مؤقت
              </button>
            )}
            <Link href={`/bookings?propertyId=${prop.id}`} className="btn-ghost btn-sm w-full">
              عرض الحجوزات
            </Link>
          </section>

          <section className="card">
            <div className="card-header"><h3 className="section-title">معلومات</h3></div>
            <dl className="p-4 grid gap-y-2.5 text-xs">
              <Row label="المرجع" value={prop.referenceCode} mono />
              <Row label="نوع العقار" value={prop.propertyType} />
              <Row label="نوع العرض" value={prop.listingType} />
              {prop.unitNumber && <Row label="رقم الوحدة" value={prop.unitNumber} mono />}
              {prop.floorNumber != null && <Row label="الدور" value={String(prop.floorNumber)} mono />}
              {prop.furnishing && <Row label="التأثيث" value={prop.furnishing} />}
              {prop.permitNumber && <Row label="رقم التصريح" value={prop.permitNumber} mono />}
              <Row label="منشور" value={prop.isPublished ? 'نعم' : 'لا'} />
            </dl>
          </section>

          {prop.paymentPlan && (
            <section className="card">
              <div className="card-header"><h3 className="section-title">خطة الدفع</h3></div>
              <div className="p-4 space-y-2">
                <div className="text-sm font-medium text-ink-900">{prop.paymentPlan.name}</div>
                <div className="text-2xs text-ink-500">
                  دفعة أولى: <span className="mono">{prop.paymentPlan.downPaymentPct ?? 0}%</span>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>

      {showReserve && (
        <ReserveModal propertyId={prop.id} onClose={() => setShowReserve(false)} />
      )}
    </div>
  );
}

function Spec({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink-200 p-2.5">
      <div className="flex items-center gap-1.5 text-ink-500">
        <Icon className="w-3 h-3" />
        <span className="text-2xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-ink-950 mono">{value}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 pb-2 border-b border-ink-100 last:border-0 last:pb-0">
      <dt className="text-ink-500">{label}</dt>
      <dd className={`text-ink-900 text-end ${mono ? 'mono' : ''}`}>{value}</dd>
    </div>
  );
}

function ReserveModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [hours, setHours] = useState(24);
  const [notes, setNotes] = useState('');

  const reserve = useMutation({
    mutationFn: () => api(`/v1/properties/${propertyId}/reserve`, {
      method: 'POST', body: JSON.stringify({ expiresInHours: hours, notes }),
    }),
    onSuccess: () => {
      toast.show({ title: 'تم الحجز المؤقت', variant: 'success' });
      qc.invalidateQueries({ queryKey: ['property', propertyId] });
      onClose();
    },
    onError: (e: any) => toast.show({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm grid place-items-center p-4 z-50" onClick={onClose}>
      <div className="card w-full max-w-md shadow-elevate" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="section-title">حجز مؤقت</h3>
          <button onClick={onClose} className="text-ink-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); reserve.mutate(); }} className="p-4 space-y-3">
          <div>
            <label className="label">مدة الحجز (ساعات)</label>
            <input type="number" min={1} max={168} value={hours}
              onChange={(e) => setHours(Number(e.target.value))} className="input" />
            <div className="help">الحجز المؤقت يحرر الوحدة تلقائياً بعد انتهاء المدة.</div>
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={reserve.isPending} className="btn-brand">
              {reserve.isPending ? 'جاري الحجز…' : 'تأكيد الحجز'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

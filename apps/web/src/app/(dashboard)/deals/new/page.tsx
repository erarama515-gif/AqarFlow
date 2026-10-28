'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function NewDealPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    title: '', amount: '', currency: 'SAR',
    buyerContactId: '', propertyId: '',
    expectedCloseAt: '',
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-for-deal'],
    queryFn: () => api<any[]>('/v1/contacts?limit=100'),
  });
  const { data: properties = [] } = useQuery({
    queryKey: ['properties-available'],
    queryFn: () => api<any[]>('/v1/properties?inventoryStatus=AVAILABLE&limit=100'),
  });

  const create = useMutation({
    mutationFn: () => api<{ id: string }>('/v1/deals', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        amount: form.amount ? Number(form.amount) : undefined,
        currency: form.currency,
        buyerContactId: form.buyerContactId || undefined,
        propertyId: form.propertyId || undefined,
        expectedCloseAt: form.expectedCloseAt || undefined,
      }),
    }),
    onSuccess: (r) => {
      toast.show({ title: 'تم إنشاء الصفقة', variant: 'success' });
      router.push(`/deals/${r.id}`);
    },
    onError: (e: any) => toast.show({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      <nav className="flex items-center gap-1.5 text-xs text-ink-500">
        <Link href="/deals" className="hover:text-ink-900 inline-flex items-center gap-1">
          <ArrowRight className="w-3 h-3" /> الصفقات
        </Link>
        <span>·</span><span className="text-ink-700">صفقة جديدة</span>
      </nav>

      <h1 className="page-title">إنشاء صفقة جديدة</h1>

      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="card p-4 space-y-3">
        <div>
          <label className="label">عنوان الصفقة</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input"
            placeholder="مثال: شقة A-0501 للسيد أحمد" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">قيمة الصفقة</label>
            <input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">العملة</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input">
              <option value="SAR">SAR</option><option value="AED">AED</option>
              <option value="EGP">EGP</option><option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">المشتري (عميل)</label>
          <select value={form.buyerContactId} onChange={(e) => setForm({ ...form, buyerContactId: e.target.value })} className="input">
            <option value="">— اختياري —</option>
            {contacts.map((c: any) => (
              <option key={c.id} value={c.id}>{c.fullNameAr ?? c.fullName} — {c.phone ?? ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">العقار</label>
          <select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} className="input">
            <option value="">— اختياري —</option>
            {properties.map((p: any) => (
              <option key={p.id} value={p.id}>{p.referenceCode} — {p.titleAr ?? p.titleEn}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">تاريخ الإغلاق المتوقع</label>
          <input type="date" value={form.expectedCloseAt} onChange={(e) => setForm({ ...form, expectedCloseAt: e.target.value })} className="input" />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100">
          <Link href="/deals" className="btn-secondary">إلغاء</Link>
          <button type="submit" disabled={create.isPending} className="btn-brand">
            {create.isPending ? 'جاري الحفظ…' : 'إنشاء الصفقة'}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

const PROPERTY_TYPES = [
  ['APARTMENT', 'شقة'], ['VILLA', 'فيلا'], ['TOWNHOUSE', 'تاون هاوس'],
  ['PENTHOUSE', 'بنتهاوس'], ['STUDIO', 'استوديو'], ['DUPLEX', 'دوبلكس'],
  ['OFFICE', 'مكتب'], ['RETAIL', 'محل تجاري'], ['WAREHOUSE', 'مستودع'],
  ['LAND_RESIDENTIAL', 'أرض سكنية'], ['LAND_COMMERCIAL', 'أرض تجارية'],
] as const;

const LISTING_TYPES = [
  ['SALE', 'بيع'], ['RENT', 'إيجار'], ['OFF_PLAN_SALE', 'على الخارطة'],
  ['RESALE', 'إعادة بيع'], ['SHORT_TERM', 'قصير المدى'],
] as const;

const COUNTRIES = ['SA', 'AE', 'EG', 'KW', 'QA', 'BH', 'OM'] as const;

export default function NewPropertyPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    propertyType: 'APARTMENT',
    listingType: 'SALE',
    country: 'SA',
    titleAr: '',
    titleEn: '',
    descriptionAr: '',
    bedrooms: '',
    bathrooms: '',
    builtArea: '',
    price: '',
    currency: 'SAR',
    city: '',
    district: '',
    address: '',
    unitNumber: '',
  });

  const create = useMutation({
    mutationFn: () => api<{ id: string }>('/v1/properties', {
      method: 'POST',
      body: JSON.stringify({
        propertyType: form.propertyType,
        listingType: form.listingType,
        country: form.country,
        titleAr: form.titleAr || undefined,
        titleEn: form.titleEn || undefined,
        descriptionAr: form.descriptionAr || undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        builtArea: form.builtArea ? Number(form.builtArea) : undefined,
        price: form.price ? Number(form.price) : undefined,
        currency: form.currency,
        city: form.city || undefined,
        district: form.district || undefined,
        address: form.address || undefined,
        unitNumber: form.unitNumber || undefined,
      }),
    }),
    onSuccess: (r) => {
      toast.show({ title: 'تم إنشاء العقار', variant: 'success' });
      router.push(`/properties/${r.id}`);
    },
    onError: (e: any) => toast.show({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <nav className="flex items-center gap-1.5 text-xs text-ink-500">
        <Link href="/properties" className="hover:text-ink-900 inline-flex items-center gap-1">
          <ArrowRight className="w-3 h-3" /> العقارات
        </Link>
        <span>·</span><span className="text-ink-700">عقار جديد</span>
      </nav>

      <h1 className="page-title">إضافة عقار جديد</h1>

      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
        <section className="card p-4 space-y-3">
          <div className="text-xs font-semibold text-ink-700 mb-1">الأساسيات</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">نوع العقار</label>
              <select value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} className="input">
                {PROPERTY_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">نوع العرض</label>
              <select value={form.listingType} onChange={(e) => setForm({ ...form, listingType: e.target.value })} className="input">
                {LISTING_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">الدولة</label>
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input">
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">العنوان (عربي)</label>
              <input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} className="input" placeholder="مثال: شقة فاخرة في العليا" />
            </div>
            <div>
              <label className="label">العنوان (إنجليزي)</label>
              <input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className="input" placeholder="Luxury Apartment in Al Olaya" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="label">الوصف</label>
            <textarea value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} className="input" rows={4} />
          </div>
        </section>

        <section className="card p-4 space-y-3">
          <div className="text-xs font-semibold text-ink-700 mb-1">المواصفات</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">غرف نوم</label>
              <input type="number" min={0} value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">حمامات</label>
              <input type="number" min={0} value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">مساحة البناء (م²)</label>
              <input type="number" min={0} value={form.builtArea} onChange={(e) => setForm({ ...form, builtArea: e.target.value })} className="input" />
            </div>
          </div>
        </section>

        <section className="card p-4 space-y-3">
          <div className="text-xs font-semibold text-ink-700 mb-1">السعر والموقع</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">السعر</label>
              <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">العملة</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input">
                <option value="SAR">SAR</option><option value="AED">AED</option>
                <option value="EGP">EGP</option><option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">المدينة</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">الحي</label>
              <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="input" />
            </div>
          </div>
          <div>
            <label className="label">العنوان الكامل</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">رقم الوحدة (اختياري)</label>
            <input value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} className="input" dir="ltr" />
          </div>
        </section>

        <div className="flex items-center justify-end gap-2">
          <Link href="/properties" className="btn-secondary">إلغاء</Link>
          <button type="submit" disabled={create.isPending} className="btn-brand">
            {create.isPending ? 'جاري الحفظ…' : 'إنشاء العقار'}
          </button>
        </div>
      </form>
    </div>
  );
}

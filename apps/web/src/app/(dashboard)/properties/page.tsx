'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, MapPin, BedDouble, Bath, Maximize, Grid3x3, List as ListIcon } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';

interface Property {
  id: string; referenceCode: string;
  titleEn?: string; titleAr?: string;
  propertyType: string; listingType: string; inventoryStatus: string;
  price?: number; currency?: string;
  bedrooms?: number; bathrooms?: number; builtArea?: number;
  city?: string; district?: string;
  media: Array<{ url: string; thumbnailUrl?: string }>;
}

const STATUS_PILL: Record<string, string> = {
  AVAILABLE: 'pill-success', RESERVED: 'pill-warn', BOOKED: 'pill-warn',
  SOLD: 'pill-neutral', RENTED: 'pill-neutral', BLOCKED: 'pill-danger',
  DRAFT: 'pill-info', ON_HOLD: 'pill-warn', UNDER_MAINTENANCE: 'pill-neutral',
  CANCELLED: 'pill-danger',
};
const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'متاح', RESERVED: 'محجوز', BOOKED: 'مؤكد',
  SOLD: 'مباع', RENTED: 'مؤجر', BLOCKED: 'موقوف',
  DRAFT: 'مسودة', ON_HOLD: 'معلق', UNDER_MAINTENANCE: 'صيانة', CANCELLED: 'ملغي',
};
const LISTING_LABEL: Record<string, string> = {
  SALE: 'بيع', RENT: 'إيجار', OFF_PLAN_SALE: 'على الخارطة',
  RESALE: 'إعادة بيع', SHORT_TERM: 'قصير المدى', LEASE_TO_OWN: 'إيجار-تمليك',
};

export default function PropertiesPage() {
  const [search, setSearch] = useState('');
  const [listingType, setListingType] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const { data = [], isLoading } = useQuery({
    queryKey: ['properties', search, listingType],
    queryFn: () => api<Property[]>(
      `/v1/properties?q=${encodeURIComponent(search)}${listingType ? `&listingType=${listingType}` : ''}`
    ),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="page-title">العقارات</h1>
          <p className="page-sub mt-0.5">{data.length} عقار في المخزون</p>
        </div>
        <Link href="/properties/new" className="btn-brand btn-sm">
          <Plus className="w-3.5 h-3.5" /> عقار جديد
        </Link>
      </div>

      <div className="card p-2 flex items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن عقار..." className="input flex-1" />
        <select value={listingType} onChange={(e) => setListingType(e.target.value)} className="input w-40">
          <option value="">كل الأنواع</option>
          {Object.entries(LISTING_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex items-center rounded-md border border-ink-200 bg-white">
          <button onClick={() => setView('grid')}
            className={`p-1.5 ${view === 'grid' ? 'bg-ink-100 text-ink-900' : 'text-ink-500'}`}
            aria-label="grid">
            <Grid3x3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView('list')}
            className={`p-1.5 ${view === 'list' ? 'bg-ink-100 text-ink-900' : 'text-ink-500'}`}
            aria-label="list">
            <ListIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-ink-500 text-sm">جاري التحميل…</div>
      ) : data.length === 0 ? (
        <div className="card p-16 text-center">
          <MapPin className="w-7 h-7 text-ink-400 mx-auto" />
          <div className="text-sm text-ink-700 font-medium mt-2.5">لا توجد عقارات بعد</div>
          <div className="text-xs text-ink-500 mt-1">أضف أول عقار للبدء</div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.map((p) => (
            <Link key={p.id} href={`/properties/${p.id}`} className="card card-hover overflow-hidden">
              <div className="aspect-video bg-ink-100 relative">
                {p.media[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.media[0].thumbnailUrl ?? p.media[0].url} alt=""
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-ink-400 text-xs">لا توجد صورة</div>
                )}
                <span className={`absolute top-2 end-2 ${STATUS_PILL[p.inventoryStatus]}`}>
                  {STATUS_LABEL[p.inventoryStatus]}
                </span>
                <span className="absolute top-2 start-2 pill-neutral bg-white">
                  {LISTING_LABEL[p.listingType]}
                </span>
              </div>
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xs text-ink-500 mono">{p.referenceCode}</span>
                </div>
                <div className="font-semibold text-ink-950 line-clamp-1">
                  {p.titleAr ?? p.titleEn ?? p.referenceCode}
                </div>
                <div className="text-base font-semibold text-ink-950 mt-2 mono">
                  {formatMoney(p.price, p.currency)}
                </div>
                <div className="flex items-center gap-3 text-2xs text-ink-600 mt-2">
                  {p.bedrooms != null && (
                    <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{p.bedrooms}</span>
                  )}
                  {p.bathrooms != null && (
                    <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{p.bathrooms}</span>
                  )}
                  {p.builtArea && (
                    <span className="flex items-center gap-1"><Maximize className="w-3 h-3" />{Number(p.builtArea)}م²</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-2xs text-ink-500 mt-2 pt-2 border-t border-ink-100">
                  <MapPin className="w-3 h-3" />
                  {[p.district, p.city].filter(Boolean).join('، ') || '—'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>المرجع</th><th>العنوان</th><th>النوع</th>
                <th>السعر</th><th>الموقع</th><th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td><span className="mono text-2xs">{p.referenceCode}</span></td>
                  <td><Link href={`/properties/${p.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                    {p.titleAr ?? p.titleEn ?? '—'}
                  </Link></td>
                  <td><span className="pill-neutral">{LISTING_LABEL[p.listingType]}</span></td>
                  <td className="mono text-xs">{formatMoney(p.price, p.currency)}</td>
                  <td className="text-xs text-ink-700">{[p.district, p.city].filter(Boolean).join('، ') || '—'}</td>
                  <td><span className={STATUS_PILL[p.inventoryStatus]}>{STATUS_LABEL[p.inventoryStatus]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

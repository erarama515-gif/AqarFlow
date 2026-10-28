'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney, formatRelative } from '@/lib/format';
import { useToast } from '@/components/ui/toast';

const STAGE_PILL: Record<string, string> = {
  PROSPECTING: 'pill-neutral', QUALIFIED: 'pill-info', VIEWING: 'pill-warn',
  OFFER: 'pill-warn', NEGOTIATION: 'pill-warn',
  WON: 'pill-success', LOST: 'pill-danger',
};

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: deal, isLoading, error } = useQuery<any>({
    queryKey: ['deal', params.id],
    queryFn: () => api(`/v1/deals/${params.id}`),
  });

  const moveStage = useMutation({
    mutationFn: (toStageCode: string) => api(`/v1/deals/${params.id}/move-stage`, {
      method: 'POST', body: JSON.stringify({ toStageCode }),
    }),
    onSuccess: () => {
      toast.show({ title: 'تم تحديث المرحلة', variant: 'success' });
      qc.invalidateQueries({ queryKey: ['deal', params.id] });
    },
    onError: (e: any) => toast.show({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="card p-12 text-center text-ink-500 text-sm">جاري التحميل…</div>;
  if (error || !deal) {
    return (
      <div className="card p-12 text-center">
        <X className="w-7 h-7 text-danger-600 mx-auto" />
        <div className="text-sm text-ink-700 mt-2 font-medium">الصفقة غير موجودة</div>
        <Link href="/deals" className="btn-secondary btn-sm mt-4 inline-flex">العودة للقائمة</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <nav className="flex items-center gap-1.5 text-xs text-ink-500">
        <Link href="/deals" className="hover:text-ink-900 inline-flex items-center gap-1">
          <ArrowRight className="w-3 h-3" /> الصفقات
        </Link>
        <span>·</span>
        <span className="text-ink-700 mono">{deal.referenceCode}</span>
      </nav>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink-950">{deal.title}</h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xs mono text-ink-500">{deal.referenceCode}</span>
              <span className={STAGE_PILL[deal.stage?.code] ?? 'pill-neutral'}>{deal.stage?.name}</span>
              <span className="pill-neutral mono">{deal.probability}%</span>
            </div>
          </div>
          <div className="text-end">
            <div className="text-2xl font-semibold mono">{formatMoney(deal.amount, deal.currency)}</div>
            {deal.expectedCloseAt && (
              <div className="text-2xs text-ink-500 mt-0.5">إغلاق متوقع: {formatRelative(deal.expectedCloseAt)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Stage stepper */}
      <section className="card p-4">
        <div className="text-xs font-semibold text-ink-700 mb-3">مراحل خط المبيعات</div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {(deal.pipeline?.stages ?? []).map((s: any, i: number) => {
            const reached = s.sortOrder <= deal.stage.sortOrder;
            const current = s.id === deal.stage.id;
            return (
              <button key={s.id}
                onClick={() => moveStage.mutate(s.code)}
                disabled={moveStage.isPending || current}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0
                  ${reached ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}
                  ${current ? 'ring-2 ring-brand-600 ring-offset-1' : ''}
                  disabled:opacity-100 disabled:cursor-default`}>
                <span className="w-4 h-4 rounded-full bg-white/20 grid place-items-center text-2xs">
                  {reached ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                </span>
                {s.name}
              </button>
            );
          })}
        </div>
        <div className="help mt-2">اضغط على أي مرحلة لنقل الصفقة إليها — Won تفعّل العمولات تلقائياً.</div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Parties */}
        <section className="card">
          <div className="card-header"><h3 className="section-title">الأطراف</h3></div>
          <div className="divide-y divide-ink-100">
            {(deal.parties ?? []).length === 0 ? (
              <div className="p-4 text-sm text-ink-500 text-center">لا توجد أطراف بعد</div>
            ) : (
              deal.parties.map((p: any) => (
                <div key={p.id} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-ink-200 grid place-items-center text-xs font-semibold text-ink-700">
                    {p.contact.fullName.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-900 truncate">{p.contact.fullName}</div>
                    <div className="text-2xs text-ink-500">{p.role}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Items */}
        <section className="card">
          <div className="card-header"><h3 className="section-title">العقارات</h3></div>
          <div className="divide-y divide-ink-100">
            {(deal.items ?? []).length === 0 ? (
              <div className="p-4 text-sm text-ink-500 text-center">لا توجد عقارات مرتبطة</div>
            ) : (
              deal.items.map((it: any) => (
                <Link key={it.id} href={`/properties/${it.property.id}`} className="p-3 block hover:bg-ink-50">
                  <div className="text-2xs mono text-ink-500">{it.property.referenceCode}</div>
                  <div className="text-sm font-medium text-ink-900 mt-0.5 truncate">
                    {it.property.titleAr ?? it.property.titleEn}
                  </div>
                  <div className="text-2xs mono text-ink-700 mt-1">
                    {formatMoney(Number(it.amount), it.currency)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Commissions */}
        <section className="card">
          <div className="card-header"><h3 className="section-title">العمولات</h3></div>
          {(deal.commissionEntries ?? []).length === 0 ? (
            <div className="p-4 text-sm text-ink-500 text-center">لم يتم احتساب عمولات</div>
          ) : (
            <table className="w-full text-xs">
              <tbody className="divide-y divide-ink-100">
                {deal.commissionEntries.map((e: any) => (
                  <tr key={e.id}>
                    <td className="p-2.5">
                      <div className="text-ink-700">{e.recipientRole}</div>
                      <div className="text-2xs text-ink-500 mono">{Number(e.sharePct)}%</div>
                    </td>
                    <td className="p-2.5 text-end">
                      <div className="mono font-medium">{formatMoney(Number(e.netAmount), e.currency)}</div>
                      <div className="text-2xs text-ink-500">{e.status}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* History */}
      {deal.stageHistory?.length > 0 && (
        <section className="card">
          <div className="card-header"><h3 className="section-title">سجل المراحل</h3></div>
          <table className="data-table">
            <thead>
              <tr><th>التاريخ</th><th>من</th><th>إلى</th><th>ملاحظات</th></tr>
            </thead>
            <tbody>
              {deal.stageHistory.map((h: any) => {
                const stages = deal.pipeline.stages;
                const from = stages.find((s: any) => s.id === h.fromStageId)?.name ?? '—';
                const to = stages.find((s: any) => s.id === h.toStageId)?.name ?? '—';
                return (
                  <tr key={h.id}>
                    <td className="text-2xs mono">{formatRelative(h.changedAt)}</td>
                    <td className="text-xs">{from}</td>
                    <td className="text-xs font-medium">{to}</td>
                    <td className="text-2xs text-ink-500">{h.notes ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

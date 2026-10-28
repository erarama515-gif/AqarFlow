'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';

interface KanbanPipeline {
  id: string; name: string;
  stages: Array<{
    id: string; code: string; name: string; probability: number;
    deals: Array<{
      id: string; referenceCode: string; title: string;
      amount?: number; currency?: string;
      owner?: { firstName: string; lastName: string };
      parties: Array<{ contact: { fullName: string } }>;
    }>;
  }>;
}

const STAGE_COLORS: Record<string, string> = {
  PROSPECTING: 'before:bg-ink-400',
  QUALIFIED:   'before:bg-info-600',
  VIEWING:     'before:bg-warn-600',
  OFFER:       'before:bg-warn-600',
  NEGOTIATION: 'before:bg-warn-600',
  WON:         'before:bg-success-600',
  LOST:        'before:bg-danger-600',
};

export default function DealsKanbanPage() {
  const { data: pipeline, isLoading } = useQuery({
    queryKey: ['kanban'],
    queryFn: () => api<KanbanPipeline>('/v1/deals/kanban'),
  });

  if (isLoading) return <div className="text-center py-12 text-ink-500 text-sm">جاري التحميل…</div>;
  if (!pipeline) return null;

  const totalValue = pipeline.stages.reduce(
    (s, st) => s + st.deals.reduce((acc, d) => acc + (d.amount ? Number(d.amount) : 0), 0), 0,
  );
  const totalCount = pipeline.stages.reduce((s, st) => s + st.deals.length, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="page-title">خط المبيعات</h1>
          <p className="page-sub mt-0.5">
            <span className="mono">{totalCount}</span> صفقة · القيمة الإجمالية
            <span className="mono ms-1">{formatMoney(totalValue)}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn-secondary btn-sm">قائمة</button>
          <Link href="/deals/new" className="btn-brand btn-sm">
            <Plus className="w-3.5 h-3.5" /> صفقة جديدة
          </Link>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3" style={{ minHeight: 'calc(100vh - 220px)' }}>
        {pipeline.stages.map((stage) => {
          const stageTotal = stage.deals.reduce((s, d) => s + (d.amount ? Number(d.amount) : 0), 0);
          const colorCls = STAGE_COLORS[stage.code] ?? 'before:bg-ink-400';
          return (
            <div key={stage.id} className="kanban-col">
              <div className={`px-2 py-1.5 flex items-center justify-between relative before:absolute before:top-1.5 before:bottom-1.5 before:start-0 before:w-0.5 before:rounded ${colorCls}`}>
                <div className="ps-2">
                  <div className="text-xs font-semibold text-ink-900">{stage.name}</div>
                  <div className="text-2xs text-ink-500 mt-0.5">
                    <span className="mono">{stage.deals.length}</span> · {formatMoney(stageTotal)}
                  </div>
                </div>
                <span className="pill-neutral mono">{stage.probability}%</span>
              </div>

              <div className="space-y-2 mt-2">
                {stage.deals.length === 0 ? (
                  <div className="text-center text-2xs text-ink-400 py-6 border border-dashed border-ink-200 rounded-md">
                    اسحب صفقة هنا
                  </div>
                ) : (
                  stage.deals.map((deal) => (
                    <Link key={deal.id} href={`/deals/${deal.id}`} className="kanban-card block">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-2xs text-ink-500 mono">{deal.referenceCode}</span>
                        <GripVertical className="w-3 h-3 text-ink-300" />
                      </div>
                      <div className="font-medium text-sm text-ink-900 mt-1 line-clamp-2">{deal.title}</div>
                      <div className="text-base font-semibold text-ink-950 mt-2 mono">
                        {formatMoney(deal.amount, deal.currency)}
                      </div>
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-ink-100">
                        <div className="flex items-center gap-1.5">
                          {deal.owner && (
                            <div className="w-5 h-5 rounded-full bg-ink-200 grid place-items-center text-2xs font-semibold text-ink-700">
                              {deal.owner.firstName[0]}
                            </div>
                          )}
                          <span className="text-2xs text-ink-500">
                            {deal.owner ? deal.owner.firstName : '—'}
                          </span>
                        </div>
                        {deal.parties[0] && (
                          <span className="text-2xs text-ink-500 truncate max-w-[100px]">
                            {deal.parties[0].contact.fullName}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

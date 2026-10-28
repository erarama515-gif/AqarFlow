'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Phone, MessageSquare, Home as HomeIcon, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

interface Activity {
  id: string; type: string; subject: string; scheduledAt: string;
  user?: { firstName: string; lastName: string };
  lead?: { fullName: string };
  contact?: { fullName: string };
}

const TYPE_META: Record<string, { icon: any; tone: string; label: string }> = {
  CALL:     { icon: Phone,         tone: 'bg-info-50 text-info-700',       label: 'اتصال' },
  MEETING:  { icon: HomeIcon,      tone: 'bg-brand-50 text-brand-700',     label: 'اجتماع' },
  EMAIL:    { icon: Mail,          tone: 'bg-ink-100 text-ink-700',        label: 'بريد' },
  WHATSAPP: { icon: MessageSquare, tone: 'bg-success-50 text-success-700', label: 'واتساب' },
  SMS:      { icon: MessageSquare, tone: 'bg-warn-50 text-warn-700',       label: 'SMS' },
  NOTE:     { icon: CalendarDays,  tone: 'bg-ink-100 text-ink-700',        label: 'ملاحظة' },
  TASK:     { icon: CalendarDays,  tone: 'bg-warn-50 text-warn-700',       label: 'مهمة' },
  VIEWING:  { icon: HomeIcon,      tone: 'bg-brand-50 text-brand-700',     label: 'معاينة' },
};

export default function CalendarPage() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 14);

  const { data = [], isLoading } = useQuery({
    queryKey: ['calendar'],
    queryFn: () => api<Activity[]>(
      `/v1/activities/calendar?from=${from.toISOString()}&to=${to.toISOString()}`
    ),
  });

  const groups: Record<string, Activity[]> = {};
  for (const a of data) {
    const key = a.scheduledAt.slice(0, 10);
    groups[key] = groups[key] ?? [];
    groups[key].push(a);
  }
  const dayKeys = Object.keys(groups).sort();

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="page-title">التقويم</h1>
        <p className="page-sub mt-0.5">المعاينات والمكالمات والمهام لأسبوعين قادمين</p>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-ink-500 text-sm">جاري التحميل…</div>
      ) : dayKeys.length === 0 ? (
        <div className="card p-16 text-center">
          <CalendarDays className="w-7 h-7 text-ink-400 mx-auto" />
          <div className="text-sm text-ink-700 font-medium mt-2.5">لا توجد أنشطة مجدولة</div>
          <div className="text-xs text-ink-500 mt-1">سيظهر هنا كل ما يحجزه فريقك من معاينات ومهام</div>
        </div>
      ) : (
        <div className="space-y-4">
          {dayKeys.map((day) => (
            <section key={day}>
              <div className="flex items-baseline gap-3 mb-2">
                <h3 className="text-sm font-semibold text-ink-900">{formatDate(day)}</h3>
                <span className="text-2xs text-ink-500">{groups[day].length} نشاط</span>
              </div>
              <div className="card divide-y divide-ink-100">
                {groups[day].map((a) => {
                  const t = TYPE_META[a.type] ?? TYPE_META.NOTE;
                  const Icon = t.icon;
                  return (
                    <div key={a.id} className="p-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md grid place-items-center ${t.tone}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-2xs uppercase text-ink-500 font-medium">{t.label}</span>
                          <span className="text-2xs text-ink-400">·</span>
                          <span className="text-2xs text-ink-500">
                            {a.lead?.fullName ?? a.contact?.fullName ?? '—'}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-ink-900 mt-0.5 truncate">{a.subject}</div>
                      </div>
                      <div className="text-end">
                        <div className="text-sm font-semibold mono">
                          {new Date(a.scheduledAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {a.user && (
                          <div className="text-2xs text-ink-500 mt-0.5">{a.user.firstName}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

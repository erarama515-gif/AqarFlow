'use client';

import { create } from 'zustand';
import { ReactNode, useEffect } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive';
}

interface ToastStore {
  toasts: Toast[];
  show: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  show: (t) =>
    set((s) => ({
      toasts: [...s.toasts, { ...t, id: crypto.randomUUID() }],
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, dismiss } = useToast();

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => dismiss(toasts[0].id), 4000);
    return () => clearTimeout(timer);
  }, [toasts, dismiss]);

  return (
    <>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[360px] max-w-[90vw]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`card p-3 px-4 cursor-pointer animate-in fade-in slide-in-from-top-2 ${
              t.variant === 'destructive' ? 'border-rose-300 bg-rose-50' :
              t.variant === 'success' ? 'border-emerald-300 bg-emerald-50' : ''
            }`}
            onClick={() => dismiss(t.id)}
          >
            <div className="font-semibold text-sm">{t.title}</div>
            {t.description && <div className="text-xs text-slate-600 mt-0.5">{t.description}</div>}
          </div>
        ))}
      </div>
    </>
  );
}

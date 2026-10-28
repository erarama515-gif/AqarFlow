'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Mail, Lock, Building2 } from 'lucide-react';
import { api, writeAuth } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail]       = useState('agent@acme.test');
  const [password, setPassword] = useState('Agent123!');
  const [tenantHint, setTenant] = useState('acme');
  const [loading, setLoading]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api<{ accessToken: string; refreshToken: string; user: any }>(
        '/v1/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password, tenantHint }) },
      );
      writeAuth({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user });
      router.push('/dashboard');
    } catch (err: any) {
      toast.show({ title: 'فشل تسجيل الدخول', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const presets: { label: string; email: string; pwd: string }[] = [
    { label: 'Owner',   email: 'owner@acme.test',   pwd: 'Owner123!' },
    { label: 'Manager', email: 'manager@acme.test', pwd: 'Manager123!' },
    { label: 'Agent',   email: 'agent@acme.test',   pwd: 'Agent123!' },
  ];

  return (
    <div className="min-h-screen flex bg-ink-50" dir="rtl">
      {/* Left — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 text-ink-700 hover:text-ink-950 text-xs">
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" /> العودة للرئيسية
          </Link>

          <div className="mt-6 flex items-center gap-2 mb-7">
            <span className="w-8 h-8 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-bold">A</span>
            <span className="font-semibold text-lg">AqarFlow</span>
          </div>

          <h1 className="page-title">مرحباً بعودتك</h1>
          <p className="page-sub mt-1">سجّل الدخول للوصول إلى لوحة التحكم</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="label">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input pe-9" dir="ltr" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">كلمة المرور</label>
                <button type="button"
                  onClick={() => toast.show({ title: 'سيتم تفعيل هذه الميزة قريباً', description: 'في النسخة التجريبية، تواصل مع مدير النظام لإعادة كلمة المرور.' })}
                  className="text-2xs text-brand-700 hover:text-brand-800">نسيت كلمة المرور؟</button>
              </div>
              <div className="relative">
                <Lock className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input pe-9" dir="ltr" />
              </div>
            </div>

            <div>
              <label className="label">رمز المؤسسة (Subdomain)</label>
              <div className="relative">
                <Building2 className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
                <input value={tenantHint} onChange={(e) => setTenant(e.target.value.toLowerCase())}
                  className="input pe-9" dir="ltr" />
              </div>
              <div className="help">مطلوب فقط في وضع التطوير (بدون subdomain حقيقي).</div>
            </div>

            <button type="submit" disabled={loading} className="btn-brand btn-lg w-full">
              {loading ? 'جاري التحقق…' : 'تسجيل الدخول'}
            </button>
          </form>

          {/* Demo accounts shortcut */}
          <div className="mt-6 card p-3">
            <div className="text-2xs uppercase tracking-wider text-ink-500 mb-2">حسابات تجريبية</div>
            <div className="grid grid-cols-3 gap-1.5">
              {presets.map((p) => (
                <button key={p.label} type="button"
                  className="btn-secondary btn-sm justify-center"
                  onClick={() => { setEmail(p.email); setPassword(p.pwd); }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-xs text-center text-ink-500">
            ليس لديك حساب؟ <Link href="/signup" className="text-brand-700 font-medium hover:text-brand-800">ابدأ مجاناً</Link>
          </p>
        </div>
      </div>

      {/* Right — product preview */}
      <div className="hidden lg:flex flex-1 bg-ink-950 text-white items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle, #0d9488 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative max-w-lg">
          <div className="text-2xs uppercase tracking-wider text-brand-400 font-semibold">منصة AqarFlow</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight leading-tight">
            CRM مصمم لطريقة عمل الفرق العقارية في الخليج ومصر.
          </h2>
          <p className="mt-4 text-ink-400 text-sm leading-relaxed">
            من استقبال العميل المحتمل، توزيع الـ leads، حجز الوحدة، وحتى احتساب العمولة وتوقيع الـ SPA.
            بدعم كامل للعربية، خطط الدفع للأوف-بلان، وحساب ضريبة القيمة المضافة.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-2.5 text-2xs">
            {[
              { k: 'Lead Dedup', v: 'تطبيع رقم E.164 + اسم عربي' },
              { k: 'Multi-Tenant', v: 'عزل تام بين الشركات' },
              { k: 'Booking', v: 'دورة حجز ملزمة كاملة' },
              { k: 'Commission', v: 'متعدد الأطراف + VAT' },
            ].map((x) => (
              <div key={x.k} className="rounded-md border border-ink-800 bg-ink-900/60 p-2.5">
                <div className="text-brand-400 font-medium">{x.k}</div>
                <div className="text-ink-400 mt-0.5">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

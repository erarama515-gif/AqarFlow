'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

const COUNTRIES = [
  { code: 'SA', label: 'المملكة العربية السعودية', currency: 'SAR' },
  { code: 'AE', label: 'الإمارات العربية المتحدة', currency: 'AED' },
  { code: 'EG', label: 'جمهورية مصر العربية',       currency: 'EGP' },
  { code: 'KW', label: 'الكويت',                      currency: 'KWD' },
  { code: 'QA', label: 'قطر',                          currency: 'QAR' },
  { code: 'BH', label: 'البحرين',                     currency: 'BHD' },
  { code: 'OM', label: 'عُمان',                        currency: 'OMR' },
];

export default function SignupPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tenantName: '',
    subdomain: '',
    country: 'SA',
    ownerEmail: '',
    ownerPassword: '',
    ownerFirstName: '',
    ownerLastName: '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/v1/tenants/signup', { method: 'POST', body: JSON.stringify(form) });
      toast.show({ title: 'تم إنشاء الحساب', description: 'سجّل الدخول الآن للمتابعة.', variant: 'success' });
      router.push('/login');
    } catch (err: any) {
      toast.show({ title: 'فشل إنشاء الحساب', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 flex" dir="rtl">
      {/* Left — Benefits */}
      <aside className="hidden lg:flex flex-1 bg-ink-950 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle, #0d9488 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative max-w-md m-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-ink-400 hover:text-white text-xs">
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" /> الرئيسية
          </Link>

          <h2 className="mt-8 text-3xl font-semibold tracking-tight leading-tight">
            ابدأ تجربتك المجانية في 5 دقائق.
          </h2>

          <ul className="mt-7 space-y-3.5">
            {[
              '14 يوم تجربة كاملة بدون التزام',
              'بدون الحاجة لبطاقة ائتمانية',
              'دعم مباشر بالعربية عبر WhatsApp',
              'بياناتك آمنة ومعزولة عن الـ tenants الأخرى',
              'يمكنك حذف الحساب وتصدير بياناتك في أي وقت',
            ].map((x) => (
              <li key={x} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                <span className="text-ink-300">{x}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 card bg-ink-900 border-ink-800 p-4">
            <div className="flex items-center gap-2 text-2xs text-ink-400">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              <span>أكثر من <span className="mono text-white">100</span> شركة عقارية تستخدم AqarFlow حالياً</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-2 mb-7">
            <span className="w-8 h-8 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-bold">A</span>
            <span className="font-semibold text-lg">AqarFlow</span>
          </div>

          <h1 className="page-title">إنشاء حساب جديد</h1>
          <p className="page-sub mt-1">سيتم إنشاء بيئة مخصصة لشركتك معزولة بالكامل</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="card p-4 space-y-3.5">
              <div className="text-xs font-semibold text-ink-700 mb-1">الشركة</div>
              <div>
                <label className="label">اسم الشركة</label>
                <input required value={form.tenantName}
                  onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
                  placeholder="مثال: عقار الرياض" className="input" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">رمز المؤسسة</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 bg-ink-100 border border-ink-200 border-s-0 rounded-s-md text-2xs text-ink-600 mono">
                      .aqarflow.app
                    </span>
                    <input required dir="ltr" pattern="^[a-z][a-z0-9-]{2,29}$"
                      value={form.subdomain}
                      onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase() })}
                      placeholder="acme" className="input rounded-s-none text-left" />
                  </div>
                  <div className="help">3-30 حرف، أحرف صغيرة فقط، يبدأ بحرف.</div>
                </div>

                <div>
                  <label className="label">الدولة</label>
                  <select value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="input">
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label} ({c.currency})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card p-4 space-y-3.5">
              <div className="text-xs font-semibold text-ink-700 mb-1">حساب المالك</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">الاسم الأول</label>
                  <input required value={form.ownerFirstName}
                    onChange={(e) => setForm({ ...form, ownerFirstName: e.target.value })}
                    className="input" />
                </div>
                <div>
                  <label className="label">الاسم الأخير</label>
                  <input required value={form.ownerLastName}
                    onChange={(e) => setForm({ ...form, ownerLastName: e.target.value })}
                    className="input" />
                </div>
              </div>

              <div>
                <label className="label">البريد الإلكتروني</label>
                <input required type="email" dir="ltr" value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  className="input" />
              </div>

              <div>
                <label className="label">كلمة المرور</label>
                <input required type="password" minLength={8} dir="ltr"
                  value={form.ownerPassword}
                  onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                  className="input" />
                <div className="help">8 أحرف على الأقل، تتضمن حرف كبير وصغير ورقم.</div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-brand btn-lg w-full">
              {loading ? 'جاري إنشاء الحساب…' : 'إنشاء الحساب'}
            </button>

            <p className="text-2xs text-center text-ink-500">
              بإنشاء الحساب فأنت توافق على
              <Link href="/" className="text-brand-700 mx-1">شروط الخدمة</Link>
              و
              <Link href="/" className="text-brand-700 mx-1">سياسة الخصوصية</Link>.
            </p>
          </form>

          <p className="mt-6 text-xs text-center text-ink-500">
            لديك حساب؟ <Link href="/login" className="text-brand-700 font-medium hover:text-brand-800">سجّل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

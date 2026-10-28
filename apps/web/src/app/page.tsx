import Link from 'next/link';
import {
  ArrowLeft, Building2, KeyRound, BadgeDollarSign,
  Users, BarChart3, ShieldCheck, Sparkles, MessageSquare, MapPin, ChevronLeft,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    title: 'إدارة عملاء محتملين بدقة',
    desc: 'تطبيع تلقائي لأرقام الجوال (E.164) ودمج للأسماء العربية يمنع التكرار. توزيع ذكي مع SLA وتنبيهات.',
  },
  {
    icon: Building2,
    title: 'إدارة عقارات بمعمارية المشاريع',
    desc: 'هرمية مشروع → برج → دور → وحدة. خطط دفع للأوف-بلان (10/90، 40/60، Post-Handover) ببناء بصري.',
  },
  {
    icon: KeyRound,
    title: 'نظام حجز احترافي',
    desc: 'حجز ملزم مع رسوم دفع، فترة سماح للإلغاء، وموعد توقيع SPA — كل المراحل آلية ومدققة.',
  },
  {
    icon: BadgeDollarSign,
    title: 'محرك عمولات متعدد الأطراف',
    desc: 'قواعد عمولات مرنة، تقسيم بين الوكيل والوسيط والمدير، احتساب ضريبة القيمة المضافة تلقائياً (15% / 5% / 14%).',
  },
  {
    icon: BarChart3,
    title: 'لوحات تحكم وتقارير',
    desc: 'مؤشرات أداء فورية، توقعات قمع المبيعات، تحليل المصادر، تقارير الفروع، تصدير PDF/Excel.',
  },
  {
    icon: ShieldCheck,
    title: 'أمان enterprise-grade',
    desc: 'JWT دوّار، Argon2id، عزل تام بين الـ tenants، سجل تدقيق غير قابل للتعديل، صلاحيات RBAC.',
  },
];

const STATS = [
  { value: '36', label: 'جدول قاعدة بيانات' },
  { value: '80+', label: 'API endpoint' },
  { value: '13', label: 'موديول مستقل' },
  { value: '< 300ms', label: 'استجابة p95' },
];

const COUNTRIES = ['السعودية', 'الإمارات', 'مصر', 'الكويت', 'قطر', 'البحرين', 'عُمان'];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ink-50 text-ink-950" dir="rtl">
      {/* Top bar */}
      <nav className="sticky top-0 z-30 backdrop-blur-md bg-ink-50/80 border-b border-ink-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white text-sm font-bold">A</span>
            <span className="font-semibold tracking-tight">AqarFlow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link href="/login" className="btn-ghost btn-sm">تسجيل الدخول</Link>
            <Link href="/signup" className="btn-primary btn-sm">ابدأ مجاناً</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-ink-200 px-2.5 py-1 text-2xs text-ink-700">
              <Sparkles className="w-3 h-3 text-brand-600" />
              <span>مصمم لـ MENA من اليوم الأول</span>
            </div>

            <h1 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
              نظام CRM عقاري متكامل
              <br />
              <span className="text-ink-500">مبني لطريقة عملك الفعلية.</span>
            </h1>

            <p className="mt-5 text-base text-ink-600 max-w-xl leading-relaxed">
              من استقبال العميل المحتمل، مروراً بتوزيعه على الفريق، حجز الوحدة،
              توقيع الـ SPA، حتى احتساب عمولة الفريق. كل ذلك بدعم كامل للغة العربية
              ومتطلبات السوق السعودي والإماراتي والمصري.
            </p>

            <div className="mt-7 flex items-center gap-2">
              <Link href="/signup" className="btn-brand btn-lg">
                ابدأ تجربتك المجانية
                <ChevronLeft className="w-4 h-4" />
              </Link>
              <Link href="/login" className="btn-secondary btn-lg">شاهد العرض التجريبي</Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-500">
              <span className="flex items-center gap-1.5"><span className="dot bg-success-600" />14 يوم تجربة كاملة</span>
              <span className="flex items-center gap-1.5"><span className="dot bg-success-600" />بدون بطاقة ائتمانية</span>
              <span className="flex items-center gap-1.5"><span className="dot bg-success-600" />دعم عربي مباشر</span>
            </div>
          </div>

          {/* Product preview card */}
          <div className="lg:col-span-5">
            <div className="card shadow-elevate p-0 overflow-hidden">
              <div className="px-3 py-2 bg-ink-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-ink-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-ink-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-ink-700" />
                <span className="ms-auto text-2xs text-ink-400 mono">acme.aqarflow.app/dashboard</span>
              </div>
              <div className="p-4 bg-ink-50">
                <div className="grid grid-cols-2 gap-2.5">
                  <PreviewKpi label="عملاء محتملون" value="247" delta="+12" />
                  <PreviewKpi label="صفقات مفتوحة" value="38" delta="+4" />
                  <PreviewKpi label="القيمة المرجحة" value="6.4M" suffix="SAR" />
                  <PreviewKpi label="حجوزات نشطة" value="11" />
                </div>
                <div className="mt-3 card p-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-xs font-medium text-ink-700">قمع المبيعات</div>
                    <span className="pill-success">+18%</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[68, 80, 100, 60, 35].map((h, i) => (
                      <div key={i} className="h-16 flex items-end">
                        <div className="w-full rounded-sm bg-brand-600" style={{ height: `${h}%`, opacity: 0.85 - i * 0.1 }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-px bg-ink-200 border border-ink-200 rounded-lg overflow-hidden">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white px-5 py-4">
              <div className="text-2xl font-semibold tracking-tight mono">{s.value}</div>
              <div className="text-2xs text-ink-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="max-w-2xl">
          <div className="text-2xs uppercase tracking-wider text-brand-700 font-semibold">المنصة</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">كل ما يحتاجه فريق العقارات في مكان واحد</h2>
          <p className="mt-3 text-ink-600">معمارية modular، صلاحيات صارمة، عمليات شفافة. مصممة لتقاوم الواقع — لا الـ demos.</p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card card-hover p-5">
                <div className="w-9 h-9 rounded-md bg-ink-100 border border-ink-200 grid place-items-center mb-3.5">
                  <Icon className="w-4 h-4 text-ink-800" />
                </div>
                <div className="font-semibold text-ink-950">{f.title}</div>
                <p className="mt-1.5 text-sm text-ink-600 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Coverage */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="card p-6 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1">
            <div className="text-2xs uppercase tracking-wider text-brand-700 font-semibold">التغطية</div>
            <h3 className="mt-2 text-xl font-semibold">يخدم السوق العقاري في 7+ دول</h3>
            <p className="mt-1.5 text-sm text-ink-600">عملة + لغة + ضريبة + تنسيق هاتف لكل دولة. دعم التقويم الهجري للسوق السعودي.</p>
          </div>
          <div className="flex-1 flex flex-wrap gap-1.5">
            {COUNTRIES.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-md bg-ink-100 border border-ink-200 px-2 py-1 text-xs">
                <MapPin className="w-3 h-3 text-ink-500" /> {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="card p-8 text-center">
          <h3 className="text-2xl font-semibold tracking-tight">جاهز لتشغيل عملياتك؟</h3>
          <p className="mt-2 text-ink-600">جرّب AqarFlow بدون التزام. كل شيء جاهز خلال 5 دقائق.</p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Link href="/signup" className="btn-brand btn-lg">
              <span>ابدأ مجاناً</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link href="/login" className="btn-secondary btn-lg">تسجيل الدخول</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-200 py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-2xs text-ink-500">
          <span>© {new Date().getFullYear()} AqarFlow. جميع الحقوق محفوظة.</span>
          <span className="mono">v0.2.0</span>
        </div>
      </footer>
    </main>
  );
}

function PreviewKpi({ label, value, delta, suffix }: { label: string; value: string; delta?: string; suffix?: string }) {
  return (
    <div className="card p-3">
      <div className="text-2xs text-ink-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-semibold mono">{value}</span>
        {suffix && <span className="text-2xs text-ink-500">{suffix}</span>}
        {delta && <span className="pill-success ms-auto">{delta}</span>}
      </div>
    </div>
  );
}

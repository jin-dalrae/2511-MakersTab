import { Link } from 'react-router-dom';
import {
  Receipt,
  TrendingUp,
  CalendarDays,
  CreditCard,
  ShoppingBag,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Blobs, cls, LOGO_URL, ORDER_URL } from '@/lib/theme';

const features = [
  {
    icon: Receipt,
    title: 'Scan receipts',
    body: 'Snap. AI reads the items, prices, and balance.',
    bg: 'bg-orange-100',
    fg: 'text-orange-700',
  },
  {
    icon: TrendingUp,
    title: 'Track the curve',
    body: 'See exactly how fast (or slow) you’re burning through it.',
    bg: 'bg-emerald-100',
    fg: 'text-emerald-700',
  },
  {
    icon: CalendarDays,
    title: 'Today’s menu',
    body: 'Know what’s at the cafe before you walk over.',
    bg: 'bg-yellow-100',
    fg: 'text-yellow-800',
  },
  {
    icon: CreditCard,
    title: 'OneCard, live',
    body: 'Pull your CCA OneCard balance straight from TouchNet.',
    bg: 'bg-pink-100',
    fg: 'text-pink-700',
  },
];

const steps = [
  {
    n: '01',
    title: 'Sign up in 30 seconds.',
    body: 'Tell us your meal plan and which semester you’re on. That’s it.',
  },
  {
    n: '02',
    title: 'Snap a receipt, anytime.',
    body: 'Our AI does the typing. Categories, totals, balance — all of it.',
  },
  {
    n: '03',
    title: 'Glance at your dashboard.',
    body: 'On track, ahead, or behind? You’ll know in a second.',
  },
];

const Landing = () => {
  return (
    <div className={cls.pageBg}>
      <Blobs />

      <header className="relative z-10 max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover-wobble">
          <div className="w-11 h-11 rounded-2xl bg-white sticker-shadow flex items-center justify-center">
            <img src={LOGO_URL} alt="MakersTab" className="w-7 h-7" />
          </div>
          <span className="font-display text-3xl text-emerald-700">makerstab</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/auth" className={cls.btnTertiary}>
            Sign in
          </Link>
          <Link to="/auth" className={`${cls.btnPrimary} hidden sm:inline-flex`}>
            Get started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pt-8 pb-16 sm:pt-16 sm:pb-24">
        <div className="flex flex-col items-center text-center">
          <span className={`${cls.pill} bg-yellow-200/80 text-yellow-900 mb-6`}>
            <Sparkles className="w-4 h-4" />
            made for CCA · by CCA
          </span>
          <h1 className={cls.h1}>
            your meal plan
            <br />
            <span className="inline-block relative">
              has feelings too.
              <svg
                aria-hidden="true"
                viewBox="0 0 300 16"
                className="absolute -bottom-3 left-0 w-full text-orange-400"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 10 C 60 -2, 140 18, 298 4"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="mt-8 text-lg sm:text-xl text-gray-700 max-w-2xl">
            Track your CCA dining funds, scan receipts in a snap, and stop doing the
            mental math every time you order a latte.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" className={cls.btnPrimary}>
              Let’s go
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#how" className={cls.btnSecondary}>
              How it works
            </a>
          </div>

          {/* Sticker row */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <span className={`${cls.sticker} bg-emerald-100`}>🧾 scan</span>
            <span className={`${cls.sticker} bg-orange-100`}>📈 track</span>
            <span className={`${cls.sticker} bg-yellow-100`}>🔮 forecast</span>
            <span className={`${cls.sticker} bg-pink-100`}>💳 onecard</span>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-16">
        <h2 className={`${cls.h2} text-center mb-10`}>everything in one tab.</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, body, bg, fg }) => (
            <div
              key={title}
              className={`${cls.card} ${cls.cardPad} hover:-translate-y-1 transition-transform`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${bg}`}>
                <Icon className={`w-6 h-6 ${fg}`} />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hungry-right-now CTA — opens CCA dining ordering in a new tab */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-16">
        <a
          href={ORDER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${cls.card} flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-6 sm:p-7 hover:-translate-y-0.5 transition-transform group`}
        >
          <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6 text-violet-700" />
          </div>
          <div className="flex-1">
            <p className={cls.eyebrow}>shortcut · external</p>
            <h3 className="text-xl font-semibold text-gray-900 mt-1">Hungry right now?</h3>
            <p className="text-gray-600 mt-1">
              Open CCA online ordering. Same login you already use — straight through.
            </p>
          </div>
          <span className={`${cls.btnSecondary} group-hover:bg-violet-50`}>
            Order
            <ArrowRight className="w-4 h-4" />
          </span>
        </a>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 max-w-4xl mx-auto px-4 pb-20">
        <h2 className={`${cls.h2} text-center mb-12`}>how it works.</h2>
        <ol className="space-y-6">
          {steps.map(({ n, title, body }) => (
            <li key={n} className={`${cls.card} ${cls.cardPad} flex gap-5 items-start`}>
              <span className="font-display text-5xl text-orange-500 leading-none">{n}</span>
              <div>
                <h3 className="font-semibold text-gray-900 text-xl mb-1">{title}</h3>
                <p className="text-gray-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-4 pb-24">
        <div className={`${cls.card} ${cls.cardPad} text-center`}>
          <h2 className="font-display text-4xl sm:text-5xl text-emerald-700 mb-3">
            ready to relax about lunch?
          </h2>
          <p className="text-gray-600 mb-6">
            Free for every CCA student. Takes thirty seconds.
          </p>
          <Link to="/auth" className={cls.btnPrimary}>
            Make a tab
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 max-w-6xl mx-auto px-4 pb-10 text-center text-sm text-gray-500">
        <p>
          © {new Date().getFullYear()} MakersTab ·{' '}
          <Link to="/terms" className="hover:underline">Terms</Link>
          {' · '}
          <Link to="/privacy" className="hover:underline">Privacy</Link>
        </p>
      </footer>
    </div>
  );
};

export default Landing;

// Cafeteria design tokens — shared class strings so every page speaks the same language.

export const LOGO_URL =
  'https://customer-assets.emergentagent.com/job_cafe-wallet-2/artifacts/d2wwykae_makerstab.svg';

// External link to CCA's online ordering portal (Zipthru / Bon Appétit).
// Uses the same Okta SSO as MakersTab — student is already logged in in their browser.
export const ORDER_URL =
  'https://delivery.zipthruordering.com/cmp/?storeid=CCADNG01';

export const cls = {
  // Page wrappers
  pageBg: 'min-h-screen cafeteria-bg relative overflow-hidden',
  pageInner: 'relative z-10 max-w-6xl mx-auto px-4 py-6 sm:py-10',

  // Cards
  card: 'rounded-[2rem] bg-white sticker-shadow border border-white/60 backdrop-blur-sm',
  cardPad: 'p-6 sm:p-8',

  // Sticker / pill components
  pill: 'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium',
  sticker: 'inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-medium sticker-shadow border-2 border-black/5 bg-white hover-wobble cursor-default',

  // Buttons
  btnPrimary:
    'inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 text-white font-semibold px-6 py-3 sticker-shadow hover:bg-emerald-600 active:scale-[0.98] transition',
  btnSecondary:
    'inline-flex items-center justify-center gap-2 rounded-full bg-white text-emerald-700 font-semibold px-6 py-3 sticker-shadow border-2 border-emerald-200 hover:bg-emerald-50 active:scale-[0.98] transition',
  btnTertiary:
    'inline-flex items-center justify-center gap-2 rounded-full bg-orange-100 text-orange-700 font-semibold px-5 py-2 hover:bg-orange-200 transition',

  // Type
  display: 'font-display text-emerald-700',
  h1: 'font-display text-5xl sm:text-7xl text-emerald-700 leading-[0.95]',
  h2: 'font-display text-3xl sm:text-5xl text-emerald-700 leading-[1.05]',
  eyebrow: 'uppercase tracking-[0.18em] text-xs font-semibold text-orange-600',
  muted: 'text-gray-600',
};

// Background gradient blobs — drop these inside a relatively-positioned wrapper.
// Their parent should clip overflow if you don't want bleed.
export const blobs = [
  {
    className:
      'pointer-events-none absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-emerald-300/45 blur-3xl animate-blob',
  },
  {
    className:
      'pointer-events-none absolute -top-16 right-[-10rem] w-[34rem] h-[34rem] rounded-full bg-orange-300/45 blur-3xl animate-blob animation-delay-2000',
  },
  {
    className:
      'pointer-events-none absolute bottom-[-12rem] left-1/4 w-[40rem] h-[40rem] rounded-full bg-yellow-200/55 blur-3xl animate-blob animation-delay-4000',
  },
];

export function Blobs() {
  return (
    <>
      {blobs.map((b, i) => (
        <div key={i} className={b.className} aria-hidden="true" />
      ))}
    </>
  );
}

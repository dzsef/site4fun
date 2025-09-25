import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type PersonaKey = 'homeowner' | 'contractor' | 'subcontractor';

const personaRoutes: Record<PersonaKey, string> = {
  homeowner: '/login?role=homeowner',
  contractor: '/contractor',
  subcontractor: '/login?role=subcontractor',
};

const personaMeta: Array<{
  key: PersonaKey;
  gradient: string;
  accent: string;
  aura: string;
  icon: JSX.Element;
}> = [
  {
    key: 'homeowner',
    gradient: 'from-emerald-400 via-emerald-500 to-teal-500',
    accent: 'text-emerald-200',
    aura: 'bg-emerald-400/40',
    icon: (
      <svg
        aria-hidden="true"
        className="h-10 w-10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path
          d="M3 11.5 12 4l9 7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 10.5v8.25c0 .414.336.75.75.75h3.5v-4.5h5.5v4.5h3.5a.75.75 0 0 0 .75-.75V10.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: 'contractor',
    gradient: 'from-amber-400 via-orange-500 to-yellow-500',
    accent: 'text-amber-200',
    aura: 'bg-amber-400/40',
    icon: (
      <svg
        aria-hidden="true"
        className="h-10 w-10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path
          d="M4 18v2h16v-2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 18V7.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V18"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 7.5V5a3 3 0 1 1 6 0v2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: 'subcontractor',
    gradient: 'from-cyan-400 via-sky-500 to-blue-500',
    accent: 'text-cyan-200',
    aura: 'bg-cyan-400/40',
    icon: (
      <svg
        aria-hidden="true"
        className="h-10 w-10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path
          d="M9.75 6h4.5a1.75 1.75 0 0 1 1.553.957l3.056 6.112A1.75 1.75 0 0 1 17.306 16H6.694a1.75 1.75 0 0 1-1.553-2.931l3.055-6.112A1.75 1.75 0 0 1 9.75 6Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 10v4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 10H12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const Home: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden bg-dark-900 text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-12%] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/30 blur-3xl mix-blend-screen animate-orbit" />
        <div className="absolute right-[-10%] top-1/3 h-[22rem] w-[22rem] rounded-full bg-cyan-500/20 blur-3xl animate-orbit delay-[1200ms]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[26rem] w-[26rem] rounded-full bg-emerald-500/20 blur-3xl animate-orbit delay-[600ms]" />
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 pb-20 pt-32 text-center lg:pt-36">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-primary/80 shadow-[0_0_40px_rgba(245,184,0,0.2)]">
          {t('home.tagline')}
        </span>
        <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
          {t('home.hero.title')}
        </h1>
        <p className="max-w-3xl text-lg text-gray-300 md:text-xl">
          {t('home.hero.subtitle')}
        </p>

        <div className="grid w-full gap-6 md:grid-cols-3">
          {personaMeta.map(({ key, gradient, accent, aura, icon }) => (
            <Link
              key={key}
              to={personaRoutes[key]}
              className="group relative overflow-hidden rounded-3xl border border-white/5 bg-dark-800/80 p-8 text-left shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur transition-transform duration-500 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-3 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900"
            >
              <span
                className={`absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br ${gradient}`}
              />
              <span
                className={`absolute -left-10 top-10 h-28 w-28 rounded-full blur-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100 ${aura}`}
              />
              <div className="relative z-10 flex h-full flex-col gap-6">
                <span className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl shadow-inner transition-transform duration-500 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] group-hover:scale-110 ${accent}`}>
                  {icon}
                </span>
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-white">
                    {t(`home.personas.${key}.title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-300 md:text-base">
                    {t(`home.personas.${key}.description`)}
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-3 text-sm font-semibold text-primary transition-[gap,color] duration-500 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] group-hover:gap-4 group-hover:text-white">
                  <span>{t(`home.personas.${key}.cta`)}</span>
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 translate-x-0 transition-transform duration-500 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] group-hover:translate-x-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/5 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-lg md:p-12">
          <div className="pointer-events-none absolute -right-12 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-primary/20 blur-2xl animate-pulse-soft" />
          <div className="grid gap-8 md:grid-cols-3">
            {['trust', 'tools', 'network'].map((item) => (
              <div
                key={item}
                className="group flex flex-col gap-3 rounded-2xl border border-white/0 bg-white/0 p-4 transition-all duration-500 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] hover:border-white/10 hover:bg-white/5"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-dark-900/60 text-primary">
                  <svg
                    aria-hidden="true"
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={
                      item === 'trust'
                        ? 'M12 3 2 9l10 6 10-6-10-6Zm0 12v9'
                        : item === 'tools'
                        ? 'M7 7h10M7 12h4M7 17h10M17 3v18'
                        : 'M12 5c-4 0-7 2.5-7 6 0 3.4 2.7 6.5 7 9 4.3-2.5 7-5.6 7-9 0-3.5-3-6-7-6Z'
                    } />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white">
                  {t(`home.benefits.${item}.title`)}
                </h4>
                <p className="text-sm leading-relaxed text-gray-300">
                  {t(`home.benefits.${item}.description`)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-10 max-w-2xl text-sm text-gray-400 md:text-base">
            {t('home.benefits.footer')}
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;

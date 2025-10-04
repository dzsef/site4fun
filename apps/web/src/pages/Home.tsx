import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type PersonaKey = 'homeowner' | 'contractor' | 'subcontractor';
type FeatureKey = 'pipeline' | 'visibility' | 'handover' | 'compliance';
type WorkflowKey = 'discover' | 'assemble' | 'deliver';

const personaRoutes: Record<PersonaKey, string> = {
  homeowner: '/login?role=homeowner',
  contractor: '/contractor',
  subcontractor: '/login?role=subcontractor',
};

const personaMeta: Array<{
  key: PersonaKey;
  accent: string;
  aura: string;
  icon: JSX.Element;
}> = [
  {
    key: 'homeowner',
    accent: 'from-emerald-400 to-teal-400',
    aura: 'bg-emerald-400/30',
    icon: (
      <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
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
    accent: 'from-amber-400 via-orange-500 to-amber-500',
    aura: 'bg-amber-400/30',
    icon: (
      <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 18v2h16v-2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 18V7.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 7.5V5a3 3 0 1 1 6 0v2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'subcontractor',
    accent: 'from-sky-400 via-cyan-400 to-blue-500',
    aura: 'bg-cyan-400/30',
    icon: (
      <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
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

const featureMeta: Array<{
  key: FeatureKey;
  icon: JSX.Element;
}> = [
  {
    key: 'pipeline',
    icon: (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 6h16M4 12h10M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="18" cy="12" r="2" />
      </svg>
    ),
  },
  {
    key: 'visibility',
    icon: (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    key: 'handover',
    icon: (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 7h10l6 5-6 5H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m14 12-3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'compliance',
    icon: (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3 4.5 7v10L12 21l7.5-4V7L12 3Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m9.5 12 1.8 1.8 3.2-3.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const workflowMeta: Array<{
  key: WorkflowKey;
  figure: string;
}> = [
  { key: 'discover', figure: '01' },
  { key: 'assemble', figure: '02' },
  { key: 'deliver', figure: '03' },
];

const heroMetrics: Array<{ valueKey: string; labelKey: string }> = [
  { valueKey: 'home.hero.metrics.projects.value', labelKey: 'home.hero.metrics.projects.label' },
  { valueKey: 'home.hero.metrics.response.value', labelKey: 'home.hero.metrics.response.label' },
  { valueKey: 'home.hero.metrics.rating.value', labelKey: 'home.hero.metrics.rating.label' },
];

const Home: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#01030a] via-[#030820] to-[#040b1c] text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-20%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-primary/12 blur-[200px]" />
        <div className="absolute right-[-12%] top-1/4 h-[30rem] w-[30rem] rounded-full bg-emerald-500/10 blur-[210px]" />
        <div className="absolute bottom-[-22%] left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-sky-500/12 blur-[230px]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pb-32 pt-28 md:pt-32 lg:max-w-7xl lg:px-4 lg:pt-36 xl:max-w-[96rem] xl:px-6 2xl:max-w-[105rem] 2xl:px-8">
        <section className="flex flex-col gap-10 text-center lg:text-left">
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
            <div className="max-w-3xl space-y-6">
              <span className="inline-flex items-center gap-2 self-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.38em] text-primary/75 shadow-[0_0_44px_rgba(245,184,0,0.2)] lg:self-start">
                {t('home.tagline')}
              </span>
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
                {t('home.hero.title')}
              </h1>
              <p className="text-lg text-gray-300 md:text-xl">
                {t('home.hero.subtitle')}
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-tr from-primary via-amber-400 to-orange-500 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-dark-900 shadow-[0_24px_80px_rgba(245,184,0,0.4)] transition-transform duration-300 hover:scale-[1.02]"
                >
                  {t('home.hero.ctaPrimary')}
                </Link>
                <Link
                  to="/contractor"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-white/90 transition-all duration-300 hover:border-white/40 hover:text-white/100"
                >
                  {t('home.hero.ctaSecondary')}
                </Link>
              </div>
            </div>
            <div className="grid w-full max-w-sm gap-4 rounded-3xl border border-white/10 bg-[#0b1326]/90 p-6 text-left shadow-[0_36px_110px_rgba(2,6,16,0.65)] backdrop-blur">
              {heroMetrics.map(({ valueKey, labelKey }) => (
                <div key={valueKey} className="flex flex-col gap-1">
                  <span className="text-3xl font-semibold text-white tracking-tight">
                    {t(valueKey)}
                  </span>
                  <span className="text-xs uppercase tracking-[0.32em] text-white/60">
                    {t(labelKey)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <header className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-3xl font-semibold text-white md:text-4xl">
              {t('home.personaSection.title')}
            </h2>
            <p className="max-w-3xl text-base text-gray-300 md:text-lg">
              {t('home.personaSection.subtitle')}
            </p>
          </header>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8 xl:gap-10 2xl:gap-12">
            {personaMeta.map(({ key, accent, aura, icon }) => (
              <Link
                key={key}
                to={personaRoutes[key]}
                className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-dark-900/80 p-8 shadow-[0_36px_100px_rgba(3,8,20,0.65)] backdrop-blur-xl transition-transform duration-500 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-3 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
              >
                <span className={`absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br ${accent}`} />
                <span className={`absolute -left-12 top-14 h-32 w-32 rounded-full blur-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100 ${aura}`} />
                <div className="relative z-10 flex h-full flex-col gap-6">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#101a33]/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] group-hover:scale-105 transition-transform duration-500">
                    {icon}
                  </span>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-white">
                      {t(`home.personas.${key}.title`)}
                    </h3>
                    <p className="text-sm leading-relaxed text-white/80 md:text-base">
                      {t(`home.personas.${key}.description`)}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary transition-[gap,color] duration-500 group-hover:gap-4 group-hover:text-white">
                    <span>{t(`home.personas.${key}.cta`)}</span>
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 translate-x-0 transition-transform duration-500 group-hover:translate-x-2"
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

        <section className="space-y-10 rounded-[2.5rem] border border-white/10 bg-dark-900/80 p-8 shadow-[0_36px_100px_rgba(2,6,18,0.6)] backdrop-blur-xl md:p-12">
          <header className="flex flex-col gap-4 text-center md:text-left">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
              {t('home.features.tagline')}
            </span>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <h2 className="text-3xl font-semibold text-white md:text-4xl">
                {t('home.features.title')}
              </h2>
              <p className="max-w-xl text-base text-gray-300">
                {t('home.features.subtitle')}
              </p>
            </div>
          </header>
          <div className="grid gap-6 md:grid-cols-2">
            {featureMeta.map(({ key, icon }) => (
              <div
                key={key}
                className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#0c142b]/90 p-6 transition-transform duration-500 hover:-translate-y-2 hover:shadow-[0_36px_90px_rgba(7,13,26,0.6)]"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-primary">
                  {icon}
                </span>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    {t(`home.features.items.${key}.title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-300 md:text-base">
                    {t(`home.features.items.${key}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-white md:text-4xl">
              {t('home.workflow.title')}
            </h2>
            <p className="max-w-2xl text-base text-gray-300 md:text-lg">
              {t('home.workflow.subtitle')}
            </p>
            <div className="space-y-5">
              {workflowMeta.map(({ key, figure }) => (
                <div key={key} className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-[#0a1227]/90 p-5 md:flex-row md:items-center md:gap-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d152c]/90 text-sm font-semibold uppercase tracking-[0.35em] text-primary">
                    {figure}
                  </span>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">
                      {t(`home.workflow.steps.${key}.title`)}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-300 md:text-base">
                      {t(`home.workflow.steps.${key}.description`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#0b1326]/90 via-[#0a1020]/85 to-[#080e1b]/90 p-8 shadow-[0_38px_110px_rgba(2,6,18,0.6)]">
            <div className="pointer-events-none absolute -right-10 bottom-6 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative space-y-6">
              <svg aria-hidden="true" className="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="m5 11 4 4L19 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <blockquote className="space-y-4">
                <p className="text-lg leading-relaxed text-white/90 md:text-xl">
                  {t('home.testimonial.quote')}
                </p>
                <footer className="space-y-1 text-sm text-white/70">
                  <div className="font-semibold uppercase tracking-[0.3em] text-white/80">
                    {t('home.testimonial.author')}
                  </div>
                  <div className="text-xs uppercase tracking-[0.28em] text-white/50">
                    {t('home.testimonial.role')}
                  </div>
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        <section className="flex flex-col items-center gap-6 rounded-[2.5rem] border border-primary/30 bg-gradient-to-r from-[#0f172a] via-[#111b33] to-[#0f172a] px-6 py-14 text-center shadow-[0_48px_140px_rgba(8,12,26,0.75)] backdrop-blur-lg">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">
            {t('home.final.title')}
          </h2>
          <p className="max-w-2xl text-base text-white/80 md:text-lg">
            {t('home.final.subtitle')}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-tr from-primary via-amber-400 to-orange-500 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-dark-900 shadow-[0_26px_90px_rgba(245,184,0,0.45)] transition-transform duration-300 hover:scale-[1.02]"
            >
              {t('home.final.primaryCta')}
            </Link>
            <Link
              to="/messages"
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-white transition-all duration-300 hover:border-white"
            >
              {t('home.final.secondaryCta')}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;

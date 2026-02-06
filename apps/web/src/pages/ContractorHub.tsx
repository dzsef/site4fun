import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ProfileResponse } from '../types/profile';
import { PROFILE_CACHE_EVENT, readProfileCache } from '../utils/profileCache';

const ContractorHub: React.FC = () => {
  const { t } = useTranslation();
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem('token'));
  const [profile, setProfile] = React.useState<ProfileResponse | null>(() => readProfileCache());

  React.useEffect(() => {
    const updateToken = () => setToken(localStorage.getItem('token'));
    window.addEventListener('auth-changed', updateToken);
    window.addEventListener('storage', updateToken);
    return () => {
      window.removeEventListener('auth-changed', updateToken);
      window.removeEventListener('storage', updateToken);
    };
  }, []);

  React.useEffect(() => {
    const handleCacheUpdated = (event: Event) => {
      const custom = event as CustomEvent<ProfileResponse | null>;
      setProfile(custom.detail ?? null);
    };
    window.addEventListener(PROFILE_CACHE_EVENT, handleCacheUpdated);
    return () => window.removeEventListener(PROFILE_CACHE_EVENT, handleCacheUpdated);
  }, []);

  const isContractor = profile?.role === 'contractor';

  const cards: Array<{
    id: 'crew' | 'post' | 'messages' | 'academy';
    to: string;
    icon: JSX.Element;
    accent: string;
    shimmer: string;
    halo: string;
    requiresContractor?: boolean;
  }> = [
    {
      id: 'crew',
      to: '/contractor/crew',
      accent: 'from-sky-400/80 via-indigo-500/70 to-violet-500/70',
      shimmer: 'bg-sky-100/25',
      halo: 'bg-sky-300/25',
      requiresContractor: true,
      icon: (
        <svg
          aria-hidden="true"
          className="h-12 w-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M18 21a6 6 0 0 0-12 0" />
          <path d="m18.5 9.5 3 3" />
          <path d="m5.5 9.5-3 3" />
          <path d="M12 6V4" />
        </svg>
      ),
    },
    {
      id: 'post',
      to: '/contractor/postings',
      accent: 'from-emerald-400/80 via-teal-500/70 to-cyan-500/70',
      shimmer: 'bg-emerald-100/30',
      halo: 'bg-emerald-300/30',
      requiresContractor: true,
      icon: (
        <svg
          aria-hidden="true"
          className="h-12 w-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 5h14v14H5z" />
          <path d="M9 9h6v6H9z" />
          <path d="M12 15v4" />
          <path d="M12 5V3" />
        </svg>
      ),
    },
    {
      id: 'messages',
      to: '/messages',
      accent: 'from-amber-400/80 via-orange-500/70 to-rose-500/70',
      shimmer: 'bg-amber-100/25',
      halo: 'bg-amber-300/25',
      requiresContractor: true,
      icon: (
        <svg
          aria-hidden="true"
          className="h-12 w-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 1 1 17 0Z" />
        </svg>
      ),
    },
    {
      id: 'academy',
      to: '/academy',
      accent: 'from-fuchsia-500/80 via-purple-500/70 to-indigo-500/70',
      shimmer: 'bg-fuchsia-100/20',
      halo: 'bg-fuchsia-300/20',
      icon: (
        <svg
          aria-hidden="true"
          className="h-12 w-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19V6a2 2 0 0 1 2-2h11" />
          <path d="M8 5h12v14H8a2 2 0 0 0-2 2" />
          <path d="M12 9h6" />
          <path d="M12 13h6" />
        </svg>
      ),
    },
  ];

  const showLocked = Boolean(token) && !isContractor;

  return (
    <div className="relative overflow-hidden bg-dark-900 text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-1/4 h-[32rem] w-[32rem] rounded-full bg-amber-500/10 blur-3xl animate-float-slow" />
        <div className="absolute -right-24 top-12 h-[36rem] w-[36rem] rounded-full bg-indigo-500/10 blur-[160px] animate-float-medium" />
        <div className="absolute left-1/2 top-3/4 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[150px]" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-12 px-4 py-16 md:py-20">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-primary/80 shadow-[0_0_44px_rgba(245,184,0,0.18)]">
            {t('contractorHub.tagline')}
          </span>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">
            {t('contractorHub.title')}
          </h1>
          <p className="text-lg text-gray-300 md:text-xl">
            {t('contractorHub.subtitle')}
          </p>
        </div>

        {showLocked && (
          <div className="rounded-[2.5rem] border border-amber-500/30 bg-amber-500/10 px-6 py-5 text-sm text-amber-100 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            {t('contractorHub.lockedNotice')}
          </div>
        )}

        <div className="grid flex-1 gap-8 md:grid-cols-2">
          {cards.map(({ id, to, icon, accent, shimmer, halo, requiresContractor }) => {
            const locked = Boolean(requiresContractor) && Boolean(token) && !isContractor;
            const destination = token ? to : `/login?role=contractor&next=${encodeURIComponent(to)}`;

            return (
              <Link
                key={id}
                to={locked ? '/contractor' : destination}
                onClick={(event) => {
                  if (locked) {
                    event.preventDefault();
                  }
                }}
                aria-disabled={locked}
                className={`group relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-8 text-left shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-transform duration-[760ms] ease-[cubic-bezier(.22,1.61,.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900 md:p-12 ${
                  locked ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-4 hover:scale-[1.017]'
                }`}
              >
              <span
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-60 transition-opacity duration-700 group-hover:opacity-75`}
              />
              {locked && (
                <span className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end p-6">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-white/80">
                    🔒 {t('contractorHub.lockedBadge')}
                  </span>
                </span>
              )}
              <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
                <span className={`absolute -left-20 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full ${shimmer} blur-3xl`} />
                <span className="absolute right-[-18%] top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              </span>
              <span className="pointer-events-none absolute -top-1/4 right-[-35%] h-[160%] w-[38%] rounded-full bg-white/20 blur-3xl animate-sheen" />
              <span className={`pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full ${halo} blur-3xl opacity-0 transition-opacity duration-[780ms] group-hover:opacity-60`} />

              <div className="relative z-10 flex flex-1 flex-col gap-10">
                <div className="flex flex-col gap-6">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner transition-transform duration-700 group-hover:scale-110">
                    {icon}
                  </span>
                  <div className="space-y-4">
                    <h2 className="text-3xl font-semibold text-white">
                      {t(`contractorHub.cards.${id}.title`)}
                    </h2>
                    <p className="text-base leading-relaxed text-white/80 md:text-lg">
                      {t(`contractorHub.cards.${id}.description`)}
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.35em] text-white/80 transition-[gap,color] duration-[760ms] group-hover:gap-6 group-hover:text-white">
                  <span>{t(`contractorHub.cards.${id}.cta`)}</span>
                  <svg
                    aria-hidden="true"
                    className="h-6 w-6 rotate-[-8deg] text-white/80 transition-transform duration-700 group-hover:translate-x-1 group-hover:rotate-0 group-hover:text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </div>
              </div>
              <span className="pointer-events-none absolute inset-0 overflow-hidden">
                <span className="absolute left-6 top-6 h-6 w-6 rounded-full border border-white/40 opacity-0 transition-opacity duration-700 group-hover:opacity-60" />
                <span className="absolute left-6 top-6 h-6 w-6 rounded-full border border-white/40 opacity-0 transition-opacity duration-700 group-hover:opacity-0 group-hover:animate-ripple" />
              </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ContractorHub;

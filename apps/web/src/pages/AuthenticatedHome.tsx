import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { ProfileResponse } from '../types/profile';
import { PROFILE_CACHE_EVENT, readProfileCache } from '../utils/profileCache';

const safeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readWelcomeParts = (
  profile: ProfileResponse | null,
): { firstName: string | null; lastName: string | null; displayName: string | null } => {
  if (!profile) return { firstName: null, lastName: null, displayName: null };

  if (profile.role === 'contractor' || profile.role === 'specialist') {
    const firstName = safeString(profile.profile.first_name);
    const lastName = safeString(profile.profile.last_name);
    return { firstName, lastName, displayName: null };
  }

  // For roles that only expose a single `name` field in the profile response.
  if (profile.role === 'subcontractor' || profile.role === 'homeowner') {
    return { firstName: null, lastName: null, displayName: safeString(profile.profile.name) };
  }

  return { firstName: null, lastName: null, displayName: null };
};

const AuthenticatedHome: React.FC = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = React.useState<ProfileResponse | null>(() => readProfileCache());

  React.useEffect(() => {
    const handleCacheUpdated = (event: Event) => {
      const custom = event as CustomEvent<ProfileResponse | null>;
      setProfile(custom.detail ?? null);
    };
    window.addEventListener(PROFILE_CACHE_EVENT, handleCacheUpdated);
    return () => window.removeEventListener(PROFILE_CACHE_EVENT, handleCacheUpdated);
  }, []);

  const { firstName, lastName, displayName } = readWelcomeParts(profile);
  const welcomeText = firstName && lastName
    ? t('home.authed.welcomeBackNamed', { firstName, lastName })
    : displayName
      ? t('home.authed.welcomeBackWithName', { name: displayName })
      : t('home.authed.welcomeBackGeneric');

  const role = profile?.role ?? null;
  const isContractor = role === 'contractor';
  const isSubcontractor = role === 'subcontractor';

  const cards: Array<{
    id: 'crew' | 'postings' | 'messages' | 'academy' | 'marketplace' | 'profile';
    to: string;
    accent: string;
    requiresContractor?: boolean;
    requiresSubcontractor?: boolean;
  }> = [
    {
      id: 'crew',
      to: '/contractor/crew',
      accent: 'from-sky-400/80 via-indigo-500/70 to-violet-500/70',
      requiresContractor: true,
    },
    {
      id: 'postings',
      to: '/contractor/postings',
      accent: 'from-emerald-400/80 via-teal-500/70 to-cyan-500/70',
      requiresContractor: true,
    },
    {
      id: 'marketplace',
      to: '/subcontractor/marketplace',
      accent: 'from-amber-400/80 via-orange-500/70 to-rose-500/70',
      requiresSubcontractor: true,
    },
    {
      id: 'messages',
      to: '/messages',
      accent: 'from-fuchsia-500/80 via-purple-500/70 to-indigo-500/70',
    },
    {
      id: 'academy',
      to: '/academy',
      accent: 'from-rose-400/80 via-red-500/70 to-orange-500/70',
    },
    {
      id: 'profile',
      to: '/profile',
      accent: 'from-slate-400/70 via-zinc-500/60 to-neutral-600/60',
    },
  ].filter((card) => {
    if (card.requiresContractor) return isContractor;
    if (card.requiresSubcontractor) return isSubcontractor;
    // For other roles (specialist/homeowner), show only universal cards.
    return !card.requiresContractor && !card.requiresSubcontractor;
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#050810] via-[#050a18] to-[#070b14] text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-18%] top-[-14%] h-[30rem] w-[30rem] rounded-full bg-primary/12 blur-[190px]" />
        <div className="absolute right-[-16%] top-1/4 h-[34rem] w-[34rem] rounded-full bg-sky-500/10 blur-[210px]" />
        <div className="absolute bottom-[-22%] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[220px]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-28 pt-24 lg:max-w-7xl lg:px-4 lg:pt-28 xl:max-w-[96rem] xl:px-6 2xl:max-w-[105rem] 2xl:px-8">
        <header className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
            {welcomeText}
          </h1>
          <p className="max-w-3xl text-base text-white/70 md:text-lg">
            {isContractor
              ? t('home.authed.subtitleContractor')
              : isSubcontractor
                ? t('home.authed.subtitleSubcontractor')
                : t('home.authed.subtitleGeneric')}
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {cards.map((card) => (
            <Link
              key={card.id}
              to={card.to}
              className="group relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-dark-900/70 p-7 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-transform duration-[760ms] ease-[cubic-bezier(.22,1.61,.36,1)] hover:-translate-y-2 hover:scale-[1.012]"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} opacity-20 transition-opacity duration-700 group-hover:opacity-35`}
              />
              <div className="relative z-10 flex h-full flex-col gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  {t(`home.authed.cards.${card.id}.eyebrow`)}
                </p>
                <h2 className="text-2xl font-semibold text-white">
                  {t(`home.authed.cards.${card.id}.title`)}
                </h2>
                <p className="text-sm leading-relaxed text-white/70">
                  {t(`home.authed.cards.${card.id}.description`)}
                </p>
                <div className="mt-auto inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/80 transition-[gap,color] duration-700 group-hover:gap-5 group-hover:text-white">
                  <span>{t(`home.authed.cards.${card.id}.cta`)}</span>
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 text-white/70 transition-transform duration-700 group-hover:translate-x-1 group-hover:text-white"
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
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
};

export default AuthenticatedHome;


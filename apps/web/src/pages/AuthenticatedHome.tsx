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

  const showCrewPortal = profile?.role === 'contractor';

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
        </header>

        {showCrewPortal ? (
          <section className="grid gap-6 md:grid-cols-2 lg:gap-8">
            <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-dark-900/80 p-8 shadow-[0_36px_110px_rgba(2,6,18,0.6)] backdrop-blur-xl md:p-10">
              <div className="pointer-events-none absolute inset-0 opacity-70">
                <div className="absolute -right-16 top-8 h-56 w-56 rounded-full bg-primary/18 blur-3xl" />
                <div className="absolute -bottom-24 left-[-10%] h-60 w-60 rounded-full bg-amber-400/12 blur-3xl" />
              </div>
              <div className="relative z-10 flex h-full flex-col gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
                    {t('home.authed.crewPortalTitle')}
                  </p>
                </div>

                <div className="mt-auto flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Link
                    to="/contractor/crew"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-tr from-primary via-amber-400 to-orange-500 px-7 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-dark-900 shadow-[0_26px_90px_rgba(245,184,0,0.4)] transition-transform duration-300 hover:scale-[1.02]"
                  >
                    {t('home.authed.findCrew')}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
};

export default AuthenticatedHome;


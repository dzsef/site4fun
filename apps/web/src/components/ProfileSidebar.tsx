import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

type ProfileRole = 'homeowner' | 'contractor' | 'subcontractor';

type RawProfile = Record<string, unknown> | null | undefined;

type ProfileResponse = {
  role: ProfileRole;
  profile: RawProfile;
};

type ProfileSummary = {
  name: string;
  secondary?: string;
  role: ProfileRole;
};

const gradientByRole: Record<ProfileRole, string> = {
  homeowner: 'from-emerald-400/80 via-emerald-500/70 to-teal-500/70',
  contractor: 'from-amber-400/80 via-orange-500/70 to-yellow-500/70',
  subcontractor: 'from-sky-400/80 via-indigo-500/70 to-violet-600/70',
};

const safeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const deriveSummary = (
  payload: ProfileResponse,
  fallbackName: string,
): ProfileSummary => {
  const profile = (payload.profile ?? {}) as Record<string, unknown>;
  const nameCandidates: Array<string | null> = [
    safeString(profile['name']),
    safeString(profile['company_name']),
    safeString(profile['companyName']),
    safeString(profile['display_name']),
  ];
  const name = nameCandidates.find(Boolean) ?? fallbackName;

  const secondaryCandidates: Array<string | null> = [
    payload.role === 'homeowner' ? safeString(profile['city']) : null,
    payload.role === 'contractor' ? safeString(profile['company_name']) : null,
    payload.role === 'subcontractor' ? safeString(profile['area']) : null,
  ];
  const secondary = secondaryCandidates.find(Boolean) ?? undefined;

  return { name, secondary, role: payload.role };
};

const buildInitials = (name: string): string => {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const ProfileSidebar: React.FC = () => {
  const { t } = useTranslation();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [hovering, setHovering] = useState(false);

  const isOpen = pinnedOpen || hovering;

  const syncToken = useCallback(() => {
    setToken(localStorage.getItem('token'));
  }, []);

  useEffect(() => {
    const handleAuthChanged = () => {
      syncToken();
    };
    window.addEventListener('auth-changed', handleAuthChanged);
    window.addEventListener('storage', handleAuthChanged);
    return () => {
      window.removeEventListener('auth-changed', handleAuthChanged);
      window.removeEventListener('storage', handleAuthChanged);
    };
  }, [syncToken]);

  useEffect(() => {
    if (!token) {
      setSummary(null);
      setStatus('idle');
      return;
    }

    let cancelled = false;
    const fetchProfile = async () => {
      try {
        setStatus('loading');
        const response = await fetch(`${baseUrl}/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.dispatchEvent(new Event('auth-changed'));
          if (!cancelled) {
            setSummary(null);
            setStatus('idle');
          }
          return;
        }
        if (!response.ok) {
          throw new Error('failed');
        }
        const payload = (await response.json()) as ProfileResponse;
        if (!cancelled) {
          setSummary(deriveSummary(payload, t('profileSidebar.emptyName')));
          setStatus('idle');
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setSummary(null);
          setStatus('error');
        }
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [t, token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth-changed'));
    setSummary(null);
    setStatus('idle');
    setPinnedOpen(false);
  };

  if (!token) {
    return null;
  }

  const roleLabel = summary
    ? t(`profileSidebar.roles.${summary.role}`)
    : null;

  const initials = summary ? buildInitials(summary.name) : '??';
  const gradient = summary ? gradientByRole[summary.role] : gradientByRole.contractor;

  return (
    <div
      className="pointer-events-none fixed inset-y-6 right-6 z-40 flex"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className={`pointer-events-auto relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_26px_70px_rgba(0,0,0,0.35)] transition-[width] duration-500 ease-[cubic-bezier(.22,1.61,.36,1)] ${
          isOpen ? 'w-[20rem]' : 'w-[4.75rem]'
        }`}
      >
        <div className="absolute inset-0 opacity-70">
          <div className="absolute inset-0 bg-dark-900/40" />
          <div className="absolute -top-10 right-[-30%] h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute bottom-[-30%] left-[-10%] h-56 w-56 rounded-full bg-white/5 blur-3xl" />
        </div>

        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? t('profileSidebar.collapse') : t('profileSidebar.expand')}
          onClick={() => setPinnedOpen((prev) => !prev)}
          className={`absolute left-[-1.75rem] top-16 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-dark-900/80 text-white shadow-[0_15px_35px_rgba(0,0,0,0.4)] transition-transform duration-500 ${
            isOpen ? 'rotate-0' : 'rotate-180'
          }`}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div className={`relative mt-6 flex flex-col transition-[padding] duration-500 ${isOpen ? 'px-6' : 'px-3'}`}>
          <div
            className={`flex h-16 w-16 items-center justify-center self-center rounded-2xl bg-gradient-to-br text-lg font-semibold text-dark-900 shadow-[0_18px_40px_rgba(15,23,42,0.35)] transition-transform duration-500 ${
              gradient
            } ${isOpen ? '' : 'scale-90'}`}
          >
            {initials}
          </div>
          <span
            className={`mt-4 text-center text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-primary/80 transition-opacity duration-400 ${
              isOpen ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {t('profileSidebar.signedIn')}
          </span>
          <div
            className={`mt-2 flex flex-col items-center text-center transition-all duration-500 ${
              isOpen ? 'opacity-100 translate-y-0' : 'pointer-events-none translate-y-3 opacity-0'
            }`}
          >
            <span className="text-lg font-semibold text-white">{summary?.name ?? t('profileSidebar.emptyName')}</span>
            {summary?.secondary && (
              <span className="mt-1 text-sm text-gray-300/80">{summary.secondary}</span>
            )}
            {roleLabel && (
              <span className="mt-3 rounded-full border border-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gray-200/90">
                {roleLabel}
              </span>
            )}
          </div>

          {status === 'loading' && (
            <div
              className={`mt-5 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-gray-300/70 transition-opacity duration-500 ${
                isOpen ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
              {t('profileSidebar.loading')}
            </div>
          )}
          {status === 'error' && (
            <div
              className={`mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-200 transition-opacity duration-500 ${
                isOpen ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {t('profileSidebar.error')}
            </div>
          )}

          <div
            className={`mt-8 flex flex-col gap-3 transition-all duration-500 ${
              isOpen ? 'opacity-100 translate-y-0' : 'pointer-events-none translate-y-4 opacity-0'
            }`}
          >
            <Link
              to="/profile"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white/90 shadow-[0_14px_30px_rgba(0,0,0,0.35)] transition-transform duration-400 hover:scale-[1.02] hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6v1H4v-1Z" />
              </svg>
              {t('profileSidebar.viewProfile')}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500/80 via-rose-500/80 to-pink-500/80 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,0,94,0.35)] transition-transform duration-400 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 17v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
                <path d="M21 12H9" />
                <path d="m15 8 4 4-4 4" />
              </svg>
              {t('nav.logout')}
            </button>
          </div>
        </div>

        <div
          className={`absolute bottom-6 left-[50%] origin-bottom-left -rotate-90 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white/60 transition-opacity duration-400 ${
            isOpen ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {t('profileSidebar.collapsedLabel')}
        </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;

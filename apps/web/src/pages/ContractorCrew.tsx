import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiOrigin = (() => {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (configured && /^https?:\/\//i.test(configured)) {
    try {
      return new URL(configured).origin;
    } catch (error) {
      console.warn('Invalid VITE_API_BASE_URL value:', error);
    }
  }
  return null;
})();

const resolveImageUrl = (value: string | null): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && apiOrigin) {
    return `${apiOrigin}${value}`;
  }
  return value;
};

type CrewCard = {
  user_id: number;
  name: string | null;
  bio: string | null;
  area: string | null;
  years_of_experience: number | null;
  skills: string[];
  services: string[];
  image_url: string | null;
};

const maskDisplayName = (name: string | null): string | null => {
  if (!name) return null;
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first.trim() ? first.trim() : null;
};

const gradients = [
  'from-amber-400 via-orange-500 to-rose-500',
  'from-sky-400 via-indigo-500 to-blue-500',
  'from-emerald-400 via-teal-500 to-cyan-500',
  'from-fuchsia-500 via-purple-500 to-indigo-500',
];

const CrewAvatar: React.FC<{ imageUrl: string | null; name: string | null; paletteIndex: number }>
  = ({ imageUrl, name, paletteIndex }) => {
    const [errored, setErrored] = useState(false);
    const initials = useMemo(() => {
      if (!name) return '✨';
      const [first, second] = name.trim().split(/\s+/);
      if (!first) return '✨';
      return (first[0] + (second ? second[0] : '')).toUpperCase();
    }, [name]);

    if (imageUrl && !errored) {
      return (
        <img
          src={imageUrl}
          alt={name ?? 'Subcontractor avatar'}
          onError={() => setErrored(true)}
          className="h-24 w-24 rounded-3xl object-cover shadow-[0_18px_45px_rgba(0,0,0,0.4)]"
        />
      );
    }

    const palette = gradients[paletteIndex % gradients.length];

    return (
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${palette} text-2xl font-semibold text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition-transform duration-500 ease-[cubic-bezier(.22,1.61,.36,1)] group-hover:-rotate-3 group-hover:scale-[1.03]`}
      >
        <span>{initials}</span>
      </div>
    );
  };

type DetailPanelProps = {
  card: CrewCard;
  onClose: () => void;
  onMessage: (card: CrewCard) => void;
  messageBusy: boolean;
};

const DetailPanel: React.FC<DetailPanelProps> = ({ card, onClose, onMessage, messageBusy }) => {
  const { t } = useTranslation();
  const maskedName = maskDisplayName(card.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-[min(680px,90%)] overflow-hidden rounded-3xl border border-white/10 bg-dark-900/95 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.3em] text-white/70 transition-transform duration-300 hover:-translate-y-0.5 hover:text-white"
        >
          ✕
        </button>
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <CrewAvatar imageUrl={card.image_url} name={card.name} paletteIndex={card.user_id} />
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                {maskedName || t('contractorCrew.card.noName')}
              </h2>
              <p className="text-sm uppercase tracking-[0.35em] text-primary/80">
                {card.area || t('contractorCrew.card.areaUnknown')}
              </p>
            </div>
            {card.bio && <p className="text-base leading-relaxed text-gray-300">{card.bio}</p>}
            <dl className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <dt className="text-xs uppercase tracking-[0.4em] text-white/60">
                  {t('contractorCrew.card.experienceLabel')}
                </dt>
                <dd className="mt-2 text-lg font-semibold text-white">
                  {card.years_of_experience != null
                    ? t('contractorCrew.card.experienceValue', { count: card.years_of_experience })
                    : t('contractorCrew.card.experienceUnknown')}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <dt className="text-xs uppercase tracking-[0.4em] text-white/60">
                  {t('contractorCrew.card.servicesLabel')}
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {(card.services.length ? card.services : [t('contractorCrew.card.none')]).map((service) => (
                    <span
                      key={service}
                      className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary"
                    >
                      {service}
                    </span>
                  ))}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-2">
                <dt className="text-xs uppercase tracking-[0.4em] text-white/60">
                  {t('contractorCrew.card.skillsLabel')}
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {(card.skills.length ? card.skills : [t('contractorCrew.card.none')]).map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90"
                    >
                      {skill}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => onMessage(card)}
                disabled={messageBusy}
                className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-dark-900 shadow-[0_18px_60px_rgba(245,184,0,0.35)] transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {messageBusy ? t('profile.saving') : t('contractorCrew.card.message')}
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 1 1 17 0Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContractorCrew: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [crew, setCrew] = useState<CrewCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CrewCard | null>(null);
  const [restricted, setRestricted] = useState(false);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [unauthenticated, setUnauthenticated] = useState(() => !localStorage.getItem('token'));
  const [messageBusyId, setMessageBusyId] = useState<number | null>(null);
  const [outreachTarget, setOutreachTarget] = useState<CrewCard | null>(null);
  const [outreachDraft, setOutreachDraft] = useState('');
  const [outreachError, setOutreachError] = useState<string | null>(null);

  const isLocked = restricted || unauthenticated;

  const handleStartConversation = useCallback(
    async (card: CrewCard) => {
      if (!token) {
        const next = encodeURIComponent('/messages');
        navigate(`/login?role=contractor&next=${next}`);
        return;
      }

      setOutreachError(null);
      setOutreachDraft('');
      setOutreachTarget(card);
    },
    [navigate, t, token],
  );

  const closeOutreach = () => {
    setOutreachTarget(null);
    setOutreachDraft('');
    setOutreachError(null);
  };

  const sendOutreach = async () => {
    if (!outreachTarget) return;
    const trimmed = outreachDraft.trim();
    if (!trimmed) {
      setOutreachError(t('form.errors.message'));
      return;
    }
    if (trimmed.length > 200) {
      setOutreachError(t('messages.errors.tooLong'));
      return;
    }

    setMessageBusyId(outreachTarget.user_id);
    setSelected(null);
    try {
      sessionStorage.setItem(`chat:outreach:${outreachTarget.user_id}`, trimmed);
    } catch {
      // ignore
    }
    closeOutreach();
    navigate(`/messages?start=${outreachTarget.user_id}`);
  };

  useEffect(() => {
    if (!selected) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selected]);

  useEffect(() => {
    const updateToken = () => {
      const nextToken = localStorage.getItem('token');
      setToken(nextToken);
      setUnauthenticated(!nextToken);
    };

    window.addEventListener('auth-changed', updateToken);
    window.addEventListener('storage', updateToken);

    return () => {
      window.removeEventListener('auth-changed', updateToken);
      window.removeEventListener('storage', updateToken);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setCrew([]);
      setRestricted(false);
      setError(null);
      setLoading(false);
      setUnauthenticated(true);
      return;
    }

    const fetchCrew = async () => {
      try {
        setLoading(true);
        setRestricted(false);
        setUnauthenticated(false);
        const res = await fetch(`${baseUrl}/profile/subcontractors`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (res.status === 401) {
          localStorage.removeItem('token');
          window.dispatchEvent(new Event('auth-changed'));
          if (!cancelled) {
            setCrew([]);
            setRestricted(false);
            setError(null);
            setUnauthenticated(true);
            setLoading(false);
          }
          return;
        }
        if (res.status === 403) {
          if (!cancelled) {
            setCrew([]);
            setRestricted(true);
            setError(null);
            setLoading(false);
          }
          return;
        }
        if (!res.ok) {
          throw new Error(t('contractorCrew.errors.generic'));
        }
        const payload = (await res.json()) as CrewCard[];
        const normalized = payload.map((card) => ({
          ...card,
          image_url: resolveImageUrl(card.image_url),
        }));
        if (!cancelled) {
          setCrew(normalized);
          setError(null);
          setRestricted(false);
          setUnauthenticated(false);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCrew();

    return () => {
      cancelled = true;
    };
  }, [t, token]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-dark-900 text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-28 h-[38rem] w-[38rem] rounded-full bg-emerald-500/10 blur-3xl animate-float-slow" />
        <div className="absolute -right-24 top-12 h-[34rem] w-[34rem] rounded-full bg-purple-500/15 blur-[160px] animate-float-medium" />
        <div className="absolute left-1/2 bottom-[-20%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[150px]" />
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-24 pt-24">
        <header className="space-y-5">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition-colors duration-300 hover:border-primary/60 hover:text-white"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 19 8 12l7-7" />
            </svg>
            {t('contractorCrew.back')}
          </button>
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-primary/80 shadow-[0_0_44px_rgba(245,184,0,0.18)]">
              {t('contractorCrew.tagline')}
            </span>
            <h1 className="text-4xl font-semibold text-white md:text-5xl">
              {t('contractorCrew.title')}
            </h1>
            <p className="max-w-3xl text-lg text-gray-300 md:text-xl">
              {t('contractorCrew.subtitle')}
            </p>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {isLocked && (
          <div className="relative flex min-h-[22rem] items-center justify-center overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-12 text-center">
            <div className="pointer-events-none absolute inset-0 backdrop-blur-md" />
            <div className="relative z-10 flex max-w-xl flex-col items-center gap-6 text-white">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-2xl shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
                🔒
              </div>
              <h2 className="text-2xl font-semibold md:text-3xl">
                {t('contractorCrew.lockTitle')}
              </h2>
              <p className="text-base text-gray-200">
                {t('contractorCrew.lockSubtitle')}
              </p>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('token');
                  window.dispatchEvent(new Event('auth-changed'));
                  const next = encodeURIComponent(`${location.pathname}${location.search}`);
                  navigate(`/login?role=contractor&next=${next}`);
                }}
                className="inline-flex items-center gap-3 rounded-full bg-primary px-6 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-dark-900 shadow-[0_18px_60px_rgba(245,184,0,0.35)] transition-transform duration-300 ease-out hover:-translate-y-0.5"
              >
                {t('contractorCrew.lockCta')}
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 5h11v11" />
                  <path d="M5 19 18.5 5.5" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[18rem] animate-pulse rounded-[2.5rem] bg-white/5"
              />
            ))}
          </div>
        ) : isLocked ? null : crew.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-lg text-gray-300">
            {t('contractorCrew.empty')}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {crew.map((card, index) => (
              <article
                key={card.user_id}
                className="group relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-transform duration-[720ms] ease-[cubic-bezier(.22,1.61,.36,1)] hover:-translate-y-3 hover:scale-[1.015]"
              >
                <span className="pointer-events-none absolute -top-1/3 right-[-35%] h-[160%] w-[40%] rounded-full bg-white/15 blur-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-80" />
                <div className="flex flex-1 flex-col gap-6">
                  <div className="flex items-center gap-5">
                    <CrewAvatar imageUrl={card.image_url} name={card.name} paletteIndex={index} />
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-white">
                        {maskDisplayName(card.name) || t('contractorCrew.card.noName')}
                      </h2>
                      <p className="text-xs uppercase tracking-[0.35em] text-white/70">
                        {card.area || t('contractorCrew.card.areaUnknown')}
                      </p>
                      <p className="text-sm text-white/70">
                        {card.years_of_experience != null
                          ? t('contractorCrew.card.experienceValue', { count: card.years_of_experience })
                          : t('contractorCrew.card.experienceUnknown')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      {(card.skills.length ? card.skills.slice(0, 4) : [t('contractorCrew.card.none')]).map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <p
                      className="text-sm text-gray-300"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {card.bio || t('contractorCrew.card.bioPlaceholder')}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleStartConversation(card)}
                      disabled={messageBusyId === card.user_id}
                      className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-dark-900 shadow-[0_18px_60px_rgba(245,184,0,0.35)] transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {messageBusyId === card.user_id ? t('profile.saving') : t('contractorCrew.card.message')}
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 1 1 17 0Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected(card)}
                      className="inline-flex items-center justify-center gap-3 rounded-full border border-primary/50 bg-primary/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary transition-transform duration-500 ease-[cubic-bezier(.22,1.61,.36,1)] hover:-translate-y-0.5 hover:text-dark-900 hover:shadow-[0_18px_60px_rgba(245,184,0,0.35)]"
                    >
                      {t('contractorCrew.card.visit')}
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M8 5h11v11" />
                        <path d="M5 19 18.5 5.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <DetailPanel
          card={selected}
          onClose={() => setSelected(null)}
          onMessage={handleStartConversation}
          messageBusy={messageBusyId === selected.user_id}
        />
      )}

      {outreachTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-[min(720px,92%)] overflow-hidden rounded-3xl border border-white/10 bg-dark-900/95 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
            <button
              onClick={closeOutreach}
              className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.3em] text-white/70 transition-transform duration-300 hover:-translate-y-0.5 hover:text-white"
            >
              ✕
            </button>

            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/75">
                  {t('messages.title')}
                </p>
                <h2 className="text-2xl font-semibold text-white">
                  {t('contractorCrew.outreach.title', { name: maskDisplayName(outreachTarget.name) ?? t('contractorCrew.card.noName') })}
                </h2>
                <p className="text-sm text-white/70">
                  {t('contractorCrew.outreach.subtitle')}
                </p>
              </div>

              <div className="space-y-2">
                <textarea
                  value={outreachDraft}
                  onChange={(e) => setOutreachDraft(e.target.value)}
                  maxLength={200}
                  placeholder={t('contractorCrew.outreach.placeholder')}
                  className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/40 shadow-[0_15px_50px_rgba(3,7,18,0.55)] focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.32em] text-white/45">
                  <span>{t('contractorCrew.outreach.limit')}</span>
                  <span>{outreachDraft.length}/200</span>
                </div>
                {outreachError && (
                  <p className="text-xs font-medium text-rose-300">{outreachError}</p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeOutreach}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-white/75 transition hover:border-white/25 hover:text-white"
                >
                  {t('contractorCrew.outreach.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void sendOutreach()}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-dark-900 shadow-[0_28px_70px_rgba(245,184,0,0.45)] transition-transform duration-300 hover:scale-[1.02]"
                >
                  {t('contractorCrew.outreach.send')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractorCrew;

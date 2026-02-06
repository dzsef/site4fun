import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
// We avoid useMutation here to prevent version-related errors
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Validation schema for login
const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
});

type LoginData = z.infer<typeof loginSchema>;

type HighlightKey = 'craft' | 'clarity' | 'momentum';
const highlightKeys: HighlightKey[] = ['craft', 'clarity', 'momentum'];

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawRole = searchParams.get('role');
  const selectedRole =
    rawRole === 'homeowner' || rawRole === 'contractor' || rawRole === 'specialist' || rawRole === 'subcontractor'
      ? rawRole
      : null;
  const selectedRoleLabel = selectedRole ? t(`home.personas.${selectedRole}.title`) : null;
  const nextParam = searchParams.get('next');
  const redirectTarget =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  const {
    register: registerField,
    handleSubmit,
    formState,
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });
  const { errors } = formState;

  // Custom submit handler since React Query caused issues
  const onSubmit = async (data: LoginData) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const formData = new URLSearchParams();
      formData.append('username', data.identifier);
      formData.append('password', data.password);
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Invalid credentials');
      }
      const result = await res.json();
      localStorage.setItem('token', result.access_token);
      window.dispatchEvent(new Event('auth-changed'));
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Login failed');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#050810] via-[#050810] to-[#080C16] text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-6 h-[32rem] w-[32rem] rounded-full bg-primary/12 blur-[150px]" />
        <div className="absolute right-[-20rem] top-1/4 h-[44rem] w-[44rem] rounded-full bg-sky-500/12 blur-[220px]" />
        <div className="absolute left-1/2 top-2/3 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-emerald-500/12 blur-[200px]" />
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-20 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-xl flex-col gap-10">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.42em] text-primary/70 shadow-[0_0_44px_rgba(245,184,0,0.18)]">
            {t('login.tagline')}
          </span>
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold text-white md:text-5xl">
              {t('login.title')}
            </h1>
            <p className="text-lg text-gray-300/85 md:text-xl">
              {t('login.subtitle')}
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {highlightKeys.map((key, index) => (
              <li
                key={key}
                className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#0C111F] p-5 shadow-[0_28px_80px_rgba(3,7,18,0.65)] backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(.22,1.61,.36,1)] hover:-translate-y-2 hover:scale-[1.015]"
              >
                <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span
                    className={`absolute -left-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full blur-3xl ${
                      index === 0
                        ? 'bg-primary/25'
                        : index === 1
                        ? 'bg-sky-400/20'
                        : 'bg-emerald-400/20'
                    }`}
                  />
                </span>
                <div className="relative z-10 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/65">
                    {t(`login.highlights.${key}.title`)}
                  </p>
                  <p className="text-sm text-white/75">
                    {t(`login.highlights.${key}.description`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative w-full max-w-xl">
          <div className="absolute inset-0 -translate-y-6 scale-105 rounded-[2.75rem] bg-gradient-to-br from-primary/15 via-transparent to-transparent blur-3xl opacity-70" />
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/8 bg-[#0B111E]/95 p-8 shadow-[0_55px_150px_rgba(2,5,14,0.9)] backdrop-blur-2xl md:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="absolute -top-24 right-[-18%] h-56 w-56 rounded-full bg-primary/18 blur-3xl" />
              <div className="absolute -bottom-28 left-[-12%] h-60 w-60 rounded-full bg-sky-500/12 blur-3xl" />
            </div>
            <div className="relative z-10 space-y-8">
              {selectedRoleLabel ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 shadow-[0_24px_60px_rgba(4,8,20,0.6)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <span className="text-sm font-medium">
                      {t('login.roleContext', { role: selectedRoleLabel })}
                    </span>
                    <Link
                      to="/"
                      className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-primary transition-colors duration-300 hover:bg-white/10"
                    >
                      {t('login.changeRole')}
                    </Link>
                  </div>
                </div>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
                  {t('profileSidebar.collapsedLabel')}
                </span>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    {t('form.emailOrUsername')}
                  </label>
                  <input
                    {...registerField('identifier')}
                    autoComplete="username"
                    placeholder={t('login.emailOrUsernamePlaceholder')}
                    className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-base text-white placeholder-white/40 shadow-[0_24px_70px_rgba(2,5,14,0.7)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                  />
                  {errors.identifier && (
                    <p className="text-xs font-medium text-rose-300">
                      {errors.identifier.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    {t('form.password')}
                  </label>
                  <input
                    type="password"
                    {...registerField('password')}
                    className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-base text-white placeholder-white/40 shadow-[0_24px_70px_rgba(2,5,14,0.7)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                  />
                  {errors.password && (
                    <p className="text-xs font-medium text-rose-300">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={formState.isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-dark-900 shadow-[0_28px_70px_rgba(245,184,0,0.45)] transition-transform duration-300 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {formState.isSubmitting ? t('form.sending') : t('login.submit')}
                </button>
              </form>

              <p className="text-center text-xs text-white/55">
                {t('login.noAccount')}{' '}
                <Link
                  to="/register"
                  className="font-semibold text-primary transition hover:text-white"
                >
                  {t('login.registerLink')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;

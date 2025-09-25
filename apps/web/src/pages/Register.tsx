import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
// We avoid useMutation here to prevent version-related errors
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Validation schema for registration
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['homeowner', 'contractor', 'subcontractor']),
});

type RegisterData = z.infer<typeof registerSchema>;

type RoleOption = {
  key: RegisterData['role'];
  hue: string;
  accent: string;
  captionKey: string;
};

type HighlightKey = 'trust' | 'control' | 'velocity';
const highlightKeys: HighlightKey[] = ['trust', 'control', 'velocity'];

const roleOptions: RoleOption[] = [
  {
    key: 'homeowner',
    hue: 'from-emerald-400/45 via-emerald-500/35 to-teal-500/45',
    accent: 'text-emerald-200',
    captionKey: 'homeowner',
  },
  {
    key: 'contractor',
    hue: 'from-amber-400/45 via-orange-500/35 to-rose-500/45',
    accent: 'text-amber-200',
    captionKey: 'contractor',
  },
  {
    key: 'subcontractor',
    hue: 'from-sky-400/45 via-indigo-500/35 to-violet-500/45',
    accent: 'text-sky-200',
    captionKey: 'subcontractor',
  },
];

const Register: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    register: registerField,
    handleSubmit,
    formState,
    setValue,
    watch,
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'homeowner' },
  });
  const { errors } = formState;
  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterData) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Registration failed');
      }
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Registration failed');
    }
  };

  const setRole = (role: RegisterData['role']) => {
    setValue('role', role, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#04070F] via-[#050912] to-[#070C18] text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-24 h-[32rem] w-[32rem] rounded-full bg-emerald-500/12 blur-[170px]" />
        <div className="absolute right-[-20rem] top-0 h-[46rem] w-[46rem] rounded-full bg-rose-500/12 blur-[230px]" />
        <div className="absolute left-1/2 bottom-[-14rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-sky-500/12 blur-[210px]" />
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-20 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex max-w-xl flex-col gap-10">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.42em] text-primary/70 shadow-[0_0_44px_rgba(245,184,0,0.18)]">
            {t('register.tagline')}
          </span>
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold text-white md:text-5xl">
              {t('register.title')}
            </h1>
            <p className="text-lg text-gray-300/85 md:text-xl">
              {t('register.subtitle')}
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {highlightKeys.map((key, index) => (
              <li
                key={key}
                className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#0B101C] p-5 shadow-[0_32px_90px_rgba(3,7,18,0.65)] backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(.22,1.61,.36,1)] hover:-translate-y-2 hover:scale-[1.015]"
              >
                <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span
                    className={`absolute -left-12 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full blur-3xl ${
                      index === 0
                        ? 'bg-emerald-400/22'
                        : index === 1
                        ? 'bg-rose-400/22'
                        : 'bg-sky-400/22'
                    }`}
                  />
                </span>
                <div className="relative z-10 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/65">
                    {t(`register.highlights.${key}.title`)}
                  </p>
                  <p className="text-sm text-white/75">
                    {t(`register.highlights.${key}.description`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative w-full max-w-xl">
          <div className="absolute inset-0 -translate-y-6 scale-105 rounded-[2.75rem] bg-gradient-to-br from-primary/15 via-transparent to-transparent blur-3xl opacity-65" />
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/8 bg-[#0A0F1B]/95 p-8 shadow-[0_55px_150px_rgba(3,7,18,0.9)] backdrop-blur-2xl md:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="absolute -top-28 right-[-18%] h-56 w-56 rounded-full bg-rose-400/18 blur-3xl" />
              <div className="absolute -bottom-30 left-[-14%] h-64 w-64 rounded-full bg-emerald-400/14 blur-3xl" />
            </div>
            <div className="relative z-10 space-y-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
                <input type="hidden" value={selectedRole} readOnly {...registerField('role')} />

                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/55">
                    {t('register.role')}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {roleOptions.map(({ key, hue, accent, captionKey }) => {
                      const active = selectedRole === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setRole(key)}
                          className={`group relative overflow-hidden rounded-3xl border border-white/12 px-4 py-5 text-left shadow-[0_26px_70px_rgba(3,7,18,0.55)] transition-all duration-500 ease-[cubic-bezier(.22,1.61,.36,1)] hover:-translate-y-1 hover:scale-[1.01] ${
                            active ? 'bg-white/10' : 'bg-[#0D1423]'
                          }`}
                        >
                          <span
                            className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 ${
                              active ? 'opacity-100' : 'group-hover:opacity-70'
                            } ${hue}`}
                          />
                          <span className="pointer-events-none absolute -left-12 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
                          <div className="relative z-10 space-y-2">
                            <span className={`text-[0.65rem] font-semibold uppercase tracking-[0.32em] ${accent}`}>
                              {t(`register.${key}`)}
                            </span>
                            <p className="text-xs text-white/70">
                              {t(`register.roles.${captionKey}.caption`)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6 rounded-3xl border border-white/10 bg-[#0B121F] p-6 shadow-[0_26px_80px_rgba(3,7,18,0.6)]">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                      {t('form.email')}
                    </label>
                    <input
                      {...registerField('email')}
                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-base text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                    />
                    {errors.email && (
                      <p className="text-xs font-medium text-rose-300">{errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                      {t('form.password')}
                    </label>
                    <input
                      type="password"
                      {...registerField('password')}
                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-base text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                    />
                    {errors.password && (
                      <p className="text-xs font-medium text-rose-300">{errors.password.message}</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formState.isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-primary to-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-dark-900 shadow-[0_28px_70px_rgba(245,184,0,0.45)] transition-transform duration-300 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {formState.isSubmitting ? t('form.sending') : t('register.submit')}
                </button>
              </form>

              <p className="text-center text-xs text-white/55">
                {t('register.haveAccount')} {' '}
                <Link to="/login" className="font-semibold text-primary transition hover:text-white">
                  {t('register.loginLink')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Register;

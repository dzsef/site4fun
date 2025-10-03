import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
// We avoid useMutation here to prevent version-related errors
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Validation schema for registration
const contractorProfileSchema = z.object({
  username: z.string().min(3).max(64),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  business_name: z.string().min(1),
  business_country: z.string().min(1),
  business_province: z.string().optional(),
  business_cities: z.array(z.string().min(1)).min(1),
  birthday: z.string().optional(),
  gender: z.string().optional(),
  years_in_business: z.string().optional(),
});

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['homeowner', 'contractor', 'subcontractor']),
    contractor_profile: contractorProfileSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'contractor') {
      if (!data.contractor_profile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Provide your contractor details.',
          path: ['contractor_profile'],
        });
        return;
      }
      const profile = data.contractor_profile;
      const years = profile.years_in_business?.trim();
      if (years) {
        const parsed = Number(years);
        if (Number.isNaN(parsed) || parsed < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Years in business must be a non-negative number.',
            path: ['contractor_profile', 'years_in_business'],
          });
        }
      }
      if (!profile.business_cities || profile.business_cities.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Add at least one city.',
          path: ['contractor_profile', 'business_cities'],
        });
      }
      if (profile.birthday && profile.birthday.trim()) {
        const value = profile.birthday.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid date format.',
            path: ['contractor_profile', 'birthday'],
          });
        } else {
          const today = new Date().toISOString().slice(0, 10);
          if (value >= today) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Birthday must be in the past.',
              path: ['contractor_profile', 'birthday'],
            });
          }
        }
      }
    }
  });

type RegisterData = z.infer<typeof registerSchema>;

type ContractorRegistrationProfile = z.infer<typeof contractorProfileSchema>;

const createEmptyContractorProfile = (): ContractorRegistrationProfile => ({
  username: '',
  first_name: '',
  last_name: '',
  business_name: '',
  business_country: '',
  business_province: '',
  business_cities: [],
  birthday: '',
  gender: '',
  years_in_business: '',
});

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
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const {
    register: registerField,
    handleSubmit,
    formState,
    setValue,
    watch,
    reset,
    clearErrors,
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'homeowner',
      contractor_profile: createEmptyContractorProfile(),
    },
  });
  const { errors } = formState;
  const selectedRole = watch('role');
  const contractorCities = watch('contractor_profile.business_cities') ?? [];
  const [cityDraft, setCityDraft] = React.useState('');
  const genderOptions = React.useMemo(
    () => [
      { value: '', label: t('profile.contractor.genderOptions.undefined') },
      { value: 'female', label: t('profile.contractor.genderOptions.female') },
      { value: 'male', label: t('profile.contractor.genderOptions.male') },
      { value: 'non-binary', label: t('profile.contractor.genderOptions.nonBinary') },
      { value: 'prefer-not-to-say', label: t('profile.contractor.genderOptions.noAnswer') },
    ],
    [t],
  );
  const maxBirthday = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const addCity = () => {
    if (selectedRole !== 'contractor') return;
    const normalized = cityDraft.trim();
    if (!normalized) return;
    const exists = contractorCities.some((city) => city.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setCityDraft('');
      return;
    }
    const updated = [...contractorCities, normalized];
    setValue('contractor_profile.business_cities', updated, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    clearErrors('contractor_profile.business_cities');
    setCityDraft('');
  };

  const removeCity = (index: number) => {
    if (selectedRole !== 'contractor') return;
    const updated = contractorCities.filter((_, idx) => idx !== index);
    setValue('contractor_profile.business_cities', updated, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
  };

  const handleCityKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addCity();
      return;
    }
    if (event.key === 'Backspace' && !cityDraft && contractorCities.length > 0) {
      event.preventDefault();
      removeCity(contractorCities.length - 1);
    }
  };

  const contractorProfileError =
    errors.contractor_profile && 'message' in errors.contractor_profile
      ? (errors.contractor_profile.message as string | undefined)
      : null;

  const onSubmit = async (data: RegisterData) => {
    try {
      setErrorMessage(null);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const payload: Record<string, unknown> = {
        email: data.email,
        password: data.password,
        role: data.role,
      };

      if (data.role === 'contractor' && data.contractor_profile) {
        const profile = data.contractor_profile;
        const trimmedCities = (profile.business_cities ?? [])
          .map((city) => city.trim())
          .filter((city) => city.length > 0);
        payload.contractor_profile = {
          username: profile.username.trim(),
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          business_name: profile.business_name.trim(),
          business_location: {
            country: profile.business_country.trim(),
            province: profile.business_province?.trim() || undefined,
            cities: trimmedCities,
          },
          birthday: profile.birthday?.trim() ? profile.birthday.trim() : undefined,
          gender: profile.gender?.trim() ? profile.gender.trim() : undefined,
          years_in_business: profile.years_in_business?.trim()
            ? Number(profile.years_in_business.trim())
            : undefined,
        };
      }

      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || t('register.errors.generic'));
      }
      const responsePayload = await res.json().catch(() => null);
      setSuccessMessage(responsePayload?.message || t('register.successFallback'));
      reset({
        email: '',
        password: '',
        role: selectedRole,
        contractor_profile: createEmptyContractorProfile(),
      });
      setCityDraft('');
    } catch (err) {
      console.error(err);
      setErrorMessage((err as Error).message || t('register.errors.generic'));
    }
  };

  const setRole = (role: RegisterData['role']) => {
    setValue('role', role, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    if (role !== 'contractor') {
      setValue('contractor_profile', createEmptyContractorProfile(), {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      setCityDraft('');
      clearErrors('contractor_profile');
    } else {
      setValue('contractor_profile', createEmptyContractorProfile(), {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      setCityDraft('');
    }
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
              {successMessage ? (
                <div className="space-y-8 text-center">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300/80">
                      {t('register.successTitle')}
                    </p>
                    <p className="text-base text-white/80">{successMessage}</p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-white/65">{t('register.successHint')}</p>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-dark-900 transition hover:bg-white"
                    >
                      {t('register.goToLogin')}
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessMessage(null);
                      setErrorMessage(null);
                      reset({
                        email: '',
                        password: '',
                        role: 'homeowner',
                        contractor_profile: createEmptyContractorProfile(),
                      });
                      setCityDraft('');
                    }}
                    className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60 underline underline-offset-4 transition hover:text-white"
                  >
                    {t('register.registerAgain')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
                  <input type="hidden" value={selectedRole} readOnly {...registerField('role')} />

                  {errorMessage && (
                    <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                      {errorMessage}
                    </div>
                  )}

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

                    {selectedRole === 'contractor' && (
                      <div className="space-y-6 rounded-3xl border border-white/8 bg-[#0C1322] p-6 shadow-[0_32px_90px_rgba(3,7,18,0.7)]">
                        <div className="space-y-3">
                          <span className="text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-primary/70">
                            {t('register.contractorExtra.label')}
                          </span>
                          <h3 className="text-lg font-semibold text-white md:text-xl">
                            {t('register.contractorExtra.title')}
                          </h3>
                          <p className="text-sm text-white/70">
                            {t('register.contractorExtra.subtitle')}
                          </p>
                          {contractorProfileError && (
                            <div className="rounded-2xl border border-rose-500/45 bg-rose-500/15 px-4 py-3 text-xs text-rose-200">
                              {contractorProfileError}
                            </div>
                          )}
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-3">
                            <span className="text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                              {t('register.contractorExtra.identity')}
                            </span>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                  {t('form.username')}
                                </label>
                                <input
                                  {...registerField('contractor_profile.username')}
                                  autoComplete="username"
                                  placeholder={t('register.contractorExtra.usernamePlaceholder')}
                                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                />
                                {errors.contractor_profile?.username && (
                                  <p className="text-xs font-medium text-rose-300">
                                    {errors.contractor_profile.username.message as string}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                  {t('profile.contractor.personal.firstName')}
                                </label>
                                <input
                                  {...registerField('contractor_profile.first_name')}
                                  autoComplete="given-name"
                                  placeholder={t('profile.contractor.personal.firstNamePlaceholder')}
                                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                />
                                {errors.contractor_profile?.first_name && (
                                  <p className="text-xs font-medium text-rose-300">
                                    {errors.contractor_profile.first_name.message as string}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                  {t('profile.contractor.personal.lastName')}
                                </label>
                                <input
                                  {...registerField('contractor_profile.last_name')}
                                  autoComplete="family-name"
                                  placeholder={t('profile.contractor.personal.lastNamePlaceholder')}
                                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                />
                                {errors.contractor_profile?.last_name && (
                                  <p className="text-xs font-medium text-rose-300">
                                    {errors.contractor_profile.last_name.message as string}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <span className="text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                              {t('register.contractorExtra.business')}
                            </span>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                  {t('profile.contractor.business.name')}
                                </label>
                                <input
                                  {...registerField('contractor_profile.business_name')}
                                  autoComplete="organization"
                                  placeholder={t('profile.contractor.business.namePlaceholder')}
                                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                />
                                {errors.contractor_profile?.business_name && (
                                  <p className="text-xs font-medium text-rose-300">
                                    {errors.contractor_profile.business_name.message as string}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                  {t('profile.contractor.business.country')}
                                </label>
                                <input
                                  {...registerField('contractor_profile.business_country')}
                                  autoComplete="country-name"
                                  placeholder={t('profile.contractor.business.countryPlaceholder')}
                                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                />
                                {errors.contractor_profile?.business_country && (
                                  <p className="text-xs font-medium text-rose-300">
                                    {errors.contractor_profile.business_country.message as string}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                  {t('profile.contractor.business.province')}
                                </label>
                                <input
                                  {...registerField('contractor_profile.business_province')}
                                  autoComplete="address-level1"
                                  placeholder={t('profile.contractor.business.provincePlaceholder')}
                                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                  {t('profile.contractor.business.years')}
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  inputMode="numeric"
                                  {...registerField('contractor_profile.years_in_business')}
                                  placeholder={t('profile.contractor.business.yearsPlaceholder')}
                                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                />
                                {errors.contractor_profile?.years_in_business && (
                                  <p className="text-xs font-medium text-rose-300">
                                    {errors.contractor_profile.years_in_business.message as string}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <span className="text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                                {t('profile.contractor.business.cities')}
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {contractorCities.length === 0 ? (
                                  <span className="rounded-full border border-dashed border-white/15 px-3 py-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                                    {t('profile.contractor.business.citiesEmpty')}
                                  </span>
                                ) : (
                                  contractorCities.map((city, index) => (
                                    <span
                                      key={`${city}-${index.toString()}`}
                                      className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-xs text-white"
                                    >
                                      {city}
                                      <button
                                        type="button"
                                        onClick={() => removeCity(index)}
                                        className="text-white/70 transition hover:text-rose-300"
                                        aria-label={t('profile.contractor.business.removeCity', { city })}
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))
                                )}
                              </div>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <input
                                  value={cityDraft}
                                  onChange={(event) => setCityDraft(event.target.value)}
                                  onKeyDown={handleCityKeyDown}
                                  placeholder={t('profile.contractor.business.cityPlaceholder')}
                                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                />
                                <button
                                  type="button"
                                  onClick={addCity}
                                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-primary/60 hover:text-primary"
                                >
                                  {t('register.contractorExtra.addCity')}
                                </button>
                              </div>
                              <p className="text-[0.6rem] uppercase tracking-[0.26em] text-white/45">
                                {t('register.contractorExtra.cityHelper')}
                              </p>
                              {errors.contractor_profile?.business_cities && (
                                <p className="text-xs font-medium text-rose-300">
                                  {errors.contractor_profile.business_cities.message as string}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <span className="text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                              {t('register.contractorExtra.optional')}
                            </span>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                  {t('profile.contractor.personal.birthday')}
                                </label>
                                <input
                                  type="date"
                                  max={maxBirthday}
                                  {...registerField('contractor_profile.birthday')}
                                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                />
                                {errors.contractor_profile?.birthday && (
                                  <p className="text-xs font-medium text-rose-300">
                                    {errors.contractor_profile.birthday.message as string}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                  {t('profile.contractor.personal.gender')}
                                </label>
                                <div className="relative">
                                  <select
                                    {...registerField('contractor_profile.gender')}
                                    className="w-full appearance-none rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                  >
                                    {genderOptions.map((option) => (
                                      <option key={option.value || 'empty'} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-white/40">
                                    ▾
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={formState.isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-primary to-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-dark-900 shadow-[0_28px_70px_rgba(245,184,0,0.45)] transition-transform duration-300 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {formState.isSubmitting ? t('form.sending') : t('register.submit')}
                  </button>
                </form>
              )}

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

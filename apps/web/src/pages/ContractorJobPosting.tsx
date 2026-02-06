import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const jobPostingSchema = z
  .object({
    title: z.string().min(5).max(200),
    description: z.string().min(30),
    requirements: z.string().max(4000).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    location: z.string().max(160).optional(),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true;
      return data.end_date >= data.start_date;
    },
    {
      message: 'contractorJobPosting.errors.invalidTimeframe',
      path: ['end_date'],
    },
  );

type JobPostingFormValues = z.infer<typeof jobPostingSchema>;

type ProfileRoleResponse = {
  role: 'contractor' | 'specialist' | 'subcontractor' | 'homeowner';
};

const ContractorJobPosting: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [skills, setSkills] = React.useState<string[]>([]);
  const [skillDraft, setSkillDraft] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [loadingRole, setLoadingRole] = React.useState(true);
  const [roleError, setRoleError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const token = React.useMemo(() => localStorage.getItem('token'), []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<JobPostingFormValues>({
    resolver: zodResolver(jobPostingSchema),
    defaultValues: {
      title: '',
      description: '',
      requirements: '',
      start_date: '',
      end_date: '',
      location: '',
    },
  });

  React.useEffect(() => {
    const title = searchParams.get('title')?.trim() ?? '';
    const location = searchParams.get('location')?.trim() ?? '';
    const start_date = searchParams.get('start_date')?.trim() ?? '';
    const end_date = searchParams.get('end_date')?.trim() ?? '';
    const trade = searchParams.get('trade')?.trim() ?? '';
    const budgetRange = searchParams.get('budget_range')?.trim() ?? '';

    if (title || location || start_date || end_date || trade || budgetRange) {
      reset({
        title: title || '',
        location: location || '',
        start_date: start_date || '',
        end_date: end_date || '',
        description: title
          ? `Scope: ${title}\n\nTiming: ${start_date || 'TBD'} → ${end_date || 'TBD'}\nLocation: ${location || 'TBD'}\nTrade: ${trade || 'TBD'}\nBudget: ${budgetRange || 'TBD'}\n\nDetails:\n- `
          : '',
        requirements: budgetRange ? `Budget range: ${budgetRange}` : '',
      });
      if (trade) {
        setSkills([trade]);
      }
    }
    // We intentionally only apply prefill once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const verifyRole = async () => {
      if (!token) {
        setRoleError(t('contractorJobPosting.errors.authRequired'));
        setLoadingRole(false);
        return;
      }
      try {
        const response = await fetch(`${baseUrl}/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (response.status === 401) {
          setRoleError(t('contractorJobPosting.errors.authRequired'));
          setLoadingRole(false);
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to verify role');
        }
        const payload = (await response.json()) as ProfileRoleResponse;
        if (payload.role !== 'contractor') {
          setRoleError(t('contractorJobPosting.errors.notContractor'));
        }
      } catch (error) {
        console.error(error);
        setRoleError(t('contractorJobPosting.errors.generic'));
      } finally {
        setLoadingRole(false);
      }
    };

    verifyRole();
  }, [t, token]);

  const addSkill = React.useCallback(() => {
    const normalized = skillDraft.trim();
    if (!normalized) return;
    setSkills((prev) => {
      if (prev.some((skill) => skill.toLowerCase() === normalized.toLowerCase())) {
        return prev;
      }
      return [...prev, normalized];
    });
    setSkillDraft('');
    setErrorMessage(null);
  }, [skillDraft]);

  const removeSkill = React.useCallback((index: number) => {
    setSkills((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleSkillKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSkill();
      return;
    }
    if (event.key === 'Backspace' && !skillDraft && skills.length > 0) {
      event.preventDefault();
      removeSkill(skills.length - 1);
    }
  };

  const onSubmit = async (values: JobPostingFormValues) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      if (!token) {
        setErrorMessage(t('contractorJobPosting.errors.authRequired'));
        return;
      }
      if (skills.length === 0) {
        setErrorMessage(t('contractorJobPosting.errors.skillsRequired'));
        return;
      }
      setIsSubmitting(true);

      const payload = {
        title: values.title.trim(),
        description: values.description.trim(),
        requirements: values.requirements?.trim() ? values.requirements.trim() : undefined,
        required_skills: skills,
        start_date: values.start_date || undefined,
        end_date: values.end_date || undefined,
        location: values.location?.trim() ? values.location.trim() : undefined,
      };

      const response = await fetch(`${baseUrl}/job-postings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        setErrorMessage(t('contractorJobPosting.errors.authRequired'));
        return;
      }

      if (response.status === 403) {
        setErrorMessage(t('contractorJobPosting.errors.notContractor'));
        return;
      }

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        setErrorMessage(errorPayload?.detail || t('contractorJobPosting.errors.generic'));
        return;
      }

      setSuccessMessage(t('contractorJobPosting.success'));
      reset();
      setSkills([]);
      setSkillDraft('');
      setTimeout(() => {
        navigate('/contractor');
      }, 1600);
    } catch (error) {
      console.error(error);
      setErrorMessage(t('contractorJobPosting.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#04070F] via-[#050912] to-[#070C18] text-gray-100">
        <div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-[0_40px_120px_rgba(3,7,18,0.7)]">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/15 border-t-primary" />
        </div>
      </div>
    );
  }

  if (roleError) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-[#04070F] via-[#050912] to-[#070C18] px-4 text-gray-100">
        <div className="max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_36px_110px_rgba(3,7,18,0.65)] backdrop-blur-xl">
          <h1 className="text-2xl font-semibold text-white">{t('contractorJobPosting.accessDenied.title')}</h1>
          <p className="text-sm text-white/70">{roleError}</p>
          <button
            type="button"
            onClick={() => navigate('/login?role=contractor')}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-dark-900 shadow-[0_24px_80px_rgba(245,184,0,0.4)] transition-transform duration-300 hover:scale-[1.03]"
          >
            {t('contractorJobPosting.accessDenied.cta')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#04070F] via-[#050912] to-[#070C18] text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-[32rem] w-[32rem] rounded-full bg-primary/12 blur-[200px]" />
        <div className="absolute right-[-18rem] top-1/4 h-[36rem] w-[36rem] rounded-full bg-emerald-500/12 blur-[220px]" />
        <div className="absolute left-1/2 bottom-[-18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[240px]" />
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-16 md:py-20">
        <header className="space-y-5 text-center md:text-left">
          <span className="inline-flex items-center gap-2 self-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-primary/70 shadow-[0_0_44px_rgba(245,184,0,0.18)] md:self-start">
            {t('contractorJobPosting.tagline')}
          </span>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            {t('contractorJobPosting.title')}
          </h1>
          <p className="max-w-3xl text-base text-white/75 md:text-lg">
            {t('contractorJobPosting.subtitle')}
          </p>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0B111F]/90 p-8 shadow-[0_36px_110px_rgba(3,7,18,0.75)] backdrop-blur-2xl md:p-12"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),transparent_65%)] opacity-80" />
          <div className="relative z-10 space-y-10">
            {errorMessage && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {successMessage}
              </div>
            )}
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                {t('contractorJobPosting.fields.title')}
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                  placeholder={t('contractorJobPosting.placeholders.title')}
                  {...register('title')}
                />
                {errors.title && (
                  <span className="text-[0.6rem] font-medium uppercase tracking-[0.24em] text-rose-300">
                    {t('contractorJobPosting.errors.title')}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                {t('contractorJobPosting.fields.location')}
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                  placeholder={t('contractorJobPosting.placeholders.location')}
                  {...register('location')}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
              {t('contractorJobPosting.fields.description')}
              <textarea
                rows={6}
                className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                placeholder={t('contractorJobPosting.placeholders.description')}
                {...register('description')}
              />
              {errors.description && (
                <span className="text-[0.6rem] font-medium uppercase tracking-[0.24em] text-rose-300">
                  {t('contractorJobPosting.errors.description')}
                </span>
              )}
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                {t('contractorJobPosting.fields.startDate')}
                <input
                  type="date"
                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                  {...register('start_date')}
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                {t('contractorJobPosting.fields.endDate')}
                <input
                  type="date"
                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                  {...register('end_date')}
                />
                {errors.end_date && (
                  <span className="text-[0.6rem] font-medium uppercase tracking-[0.24em] text-rose-300">
                    {t('contractorJobPosting.errors.invalidTimeframe')}
                  </span>
                )}
              </label>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                {t('contractorJobPosting.fields.skills')}
              </span>
              <div className="flex flex-wrap gap-2">
                {skills.length === 0 ? (
                  <span className="rounded-full border border-dashed border-white/15 px-3 py-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                    {t('contractorJobPosting.placeholders.skillsEmpty')}
                  </span>
                ) : (
                  skills.map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-xs text-white"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="text-white/70 transition hover:text-rose-300"
                        aria-label={t('contractorJobPosting.actions.removeSkill', { skill })}
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={skillDraft}
                  onChange={(event) => setSkillDraft(event.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder={t('contractorJobPosting.placeholders.skillInput')}
                  className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-primary/60 hover:text-primary"
                >
                  {t('contractorJobPosting.actions.addSkill')}
                </button>
              </div>
            </div>

            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
              {t('contractorJobPosting.fields.requirements')}
              <textarea
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                placeholder={t('contractorJobPosting.placeholders.requirements')}
                {...register('requirements')}
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-dark-900 shadow-[0_26px_80px_rgba(245,184,0,0.45)] transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? t('contractorJobPosting.actions.submitting') : t('contractorJobPosting.actions.submit')}
                {!isSubmitting && (
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
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ContractorJobPosting;

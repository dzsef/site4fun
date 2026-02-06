import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type JobPosting = {
    id: number;
    contractor_id: number;
    title: string;
    description: string;
    required_skills: string[];
    requirements?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    location?: string | null;
    created_at: string;
    updated_at: string;
};

type JobCardDraft = {
    title: string;
    location: string;
    start_date: string;
    end_date: string;
    trade: string;
    budget_range: string;
};

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const readJobCardDraft = (): JobCardDraft | null => {
    try {
        const raw = localStorage.getItem('jobcard:last');
        if (!raw) return null;
        return JSON.parse(raw) as JobCardDraft;
    } catch {
        return null;
    }
};

const ContractorPostingsDashboard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const token = React.useMemo(() => localStorage.getItem('token'), []);

    const [items, setItems] = React.useState<JobPosting[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [jobCardDraft, setJobCardDraft] = React.useState<JobCardDraft | null>(() => readJobCardDraft());

    React.useEffect(() => {
        const handler = () => setJobCardDraft(readJobCardDraft());
        window.addEventListener('storage', handler);
        window.addEventListener('auth-changed', handler);
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('auth-changed', handler);
        };
    }, []);

    React.useEffect(() => {
        if (!token) {
            const next = encodeURIComponent('/contractor/postings');
            navigate(`/login?role=contractor&next=${next}`, { replace: true });
            return;
        }

        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${baseUrl}/job-postings/mine`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                });
                if (res.status === 401) {
                    localStorage.removeItem('token');
                    window.dispatchEvent(new Event('auth-changed'));
                    return;
                }
                if (!res.ok) {
                    throw new Error('Failed to load job postings');
                }
                const payload = (await res.json()) as JobPosting[];
                if (!cancelled) setItems(payload);
            } catch (e) {
                if (!cancelled) setError((e as Error).message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [navigate, token]);

    const draftPrefillLink = jobCardDraft
        ? `/contractor/job-postings/new?title=${encodeURIComponent(jobCardDraft.title)}&location=${encodeURIComponent(jobCardDraft.location)}&start_date=${encodeURIComponent(jobCardDraft.start_date)}&end_date=${encodeURIComponent(jobCardDraft.end_date)}&trade=${encodeURIComponent(jobCardDraft.trade)}&budget_range=${encodeURIComponent(jobCardDraft.budget_range)}`
        : null;

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#050810] via-[#050A12] to-[#070C18] px-4 pb-24 pt-24 text-gray-100">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-32 top-16 h-[34rem] w-[34rem] rounded-full bg-emerald-500/10 blur-[170px]" />
                <div className="absolute right-[-26rem] top-10 h-[42rem] w-[42rem] rounded-full bg-cyan-500/10 blur-[200px]" />
            </div>

            <section className="relative z-10 mx-auto w-full max-w-6xl space-y-10">
                <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-4">
                        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.42em] text-primary/70 shadow-[0_0_44px_rgba(245,184,0,0.18)]">
                            {t('contractorJobPosting.tagline')}
                        </span>
                        <h1 className="text-4xl font-semibold text-white md:text-5xl">
                            {t('contractorHub.cards.post.title')}
                        </h1>
                        <p className="max-w-3xl text-lg text-white/70 md:text-xl">
                            {t('contractorHub.cards.post.description')}
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            to="/contractor/job-postings/new"
                            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-dark-900 shadow-[0_28px_70px_rgba(245,184,0,0.45)] transition-transform duration-300 hover:scale-[1.02]"
                        >
                            {t('contractorJobPosting.actions.submit')}
                        </Link>
                    </div>
                </header>

                {draftPrefillLink && (
                    <div className="rounded-[2.25rem] border border-primary/30 bg-primary/10 p-6 shadow-[0_30px_120px_rgba(5,9,18,0.6)] backdrop-blur-xl">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
                                    Brief ready
                                </p>
                                <p className="text-sm text-white/75">
                                    Turn your latest job card into a public posting in one click.
                                </p>
                            </div>
                            <Link
                                to={draftPrefillLink}
                                className="inline-flex items-center justify-center rounded-full bg-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-white transition hover:bg-white/15"
                            >
                                Start from job card
                            </Link>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="h-[14rem] animate-pulse rounded-[2.25rem] bg-white/5" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-10 text-center text-white/70 shadow-[0_30px_120px_rgba(5,9,18,0.65)] backdrop-blur-xl">
                        No postings yet.
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {items.map((posting) => (
                            <article
                                key={posting.id}
                                className="group relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(5,9,18,0.65)] backdrop-blur-xl"
                            >
                                <h2 className="text-lg font-semibold text-white">{posting.title}</h2>
                                <p className="mt-2 text-sm text-white/70 line-clamp-3">
                                    {posting.description}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {posting.required_skills.slice(0, 4).map((skill) => (
                                        <span
                                            key={skill}
                                            className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default ContractorPostingsDashboard;


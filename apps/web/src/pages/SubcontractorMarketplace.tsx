import React from 'react';
import { useNavigate } from 'react-router-dom';
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

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const SubcontractorMarketplace: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const token = React.useMemo(() => localStorage.getItem('token'), []);

    const [items, setItems] = React.useState<JobPosting[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const [applyTarget, setApplyTarget] = React.useState<JobPosting | null>(null);
    const [applyDraft, setApplyDraft] = React.useState('');
    const [applyError, setApplyError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${baseUrl}/job-postings`, { headers: { Accept: 'application/json' } });
                if (!res.ok) throw new Error('Failed to load job postings');
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
    }, []);

    const openApply = (posting: JobPosting) => {
        setApplyTarget(posting);
        setApplyDraft('');
        setApplyError(null);
    };

    const closeApply = () => {
        setApplyTarget(null);
        setApplyDraft('');
        setApplyError(null);
    };

    const sendApply = () => {
        if (!applyTarget) return;
        if (!token) {
            const next = encodeURIComponent('/jobs');
            navigate(`/login?role=subcontractor&next=${next}`, { replace: true });
            return;
        }
        const trimmed = applyDraft.trim();
        if (!trimmed) {
            setApplyError(t('form.errors.message'));
            return;
        }
        if (trimmed.length > 200) {
            setApplyError(t('messages.errors.tooLong'));
            return;
        }
        try {
            sessionStorage.setItem(`chat:outreach:${applyTarget.contractor_id}`, trimmed);
        } catch {
            // ignore
        }
        closeApply();
        navigate(`/messages?start=${applyTarget.contractor_id}`);
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#050810] via-[#050A12] to-[#070C18] px-4 pb-24 pt-24 text-gray-100">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-32 top-16 h-[34rem] w-[34rem] rounded-full bg-sky-500/10 blur-[170px]" />
                <div className="absolute right-[-26rem] top-10 h-[42rem] w-[42rem] rounded-full bg-indigo-500/14 blur-[200px]" />
            </div>

            <section className="relative z-10 mx-auto w-full max-w-6xl space-y-10">
                <header className="space-y-4">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.42em] text-primary/70 shadow-[0_0_44px_rgba(245,184,0,0.18)]">
                        {t('marketplace.tagline')}
                    </span>
                    <h1 className="text-4xl font-semibold text-white md:text-5xl">
                        {t('marketplace.title')}
                    </h1>
                    <p className="max-w-3xl text-lg text-white/70 md:text-xl">
                        {t('marketplace.subtitle')}
                    </p>
                </header>

                {error && (
                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="h-[16rem] animate-pulse rounded-[2.25rem] bg-white/5" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-10 text-center text-white/70 shadow-[0_30px_120px_rgba(5,9,18,0.65)] backdrop-blur-xl">
                        {t('marketplace.empty')}
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {items.map((posting) => (
                            <article
                                key={posting.id}
                                className="group relative flex h-full flex-col overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(5,9,18,0.65)] backdrop-blur-xl"
                            >
                                <h2 className="text-lg font-semibold text-white">{posting.title}</h2>
                                <p className="mt-2 text-sm text-white/70 line-clamp-3">{posting.description}</p>
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
                                <div className="mt-auto pt-6">
                                    <button
                                        type="button"
                                        onClick={() => openApply(posting)}
                                        className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-dark-900 shadow-[0_28px_70px_rgba(245,184,0,0.45)] transition-transform duration-300 hover:scale-[1.02]"
                                    >
                                        {t('marketplace.apply')}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {applyTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="relative w-[min(720px,92%)] overflow-hidden rounded-3xl border border-white/10 bg-dark-900/95 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
                        <button
                            onClick={closeApply}
                            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold uppercase tracking-[0.3em] text-white/70 transition-transform duration-300 hover:-translate-y-0.5 hover:text-white"
                        >
                            ✕
                        </button>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/75">
                                    {t('marketplace.apply')}
                                </p>
                                <h2 className="text-2xl font-semibold text-white">
                                    {applyTarget.title}
                                </h2>
                                <p className="text-sm text-white/70">
                                    {t('marketplace.applySubtitle')}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <textarea
                                    value={applyDraft}
                                    onChange={(e) => setApplyDraft(e.target.value)}
                                    maxLength={200}
                                    placeholder={t('marketplace.applyPlaceholder')}
                                    className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder-white/40 shadow-[0_15px_50px_rgba(3,7,18,0.55)] focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                                <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.32em] text-white/45">
                                    <span>{t('contractorCrew.outreach.limit')}</span>
                                    <span>{applyDraft.length}/200</span>
                                </div>
                                {applyError && <p className="text-xs font-medium text-rose-300">{applyError}</p>}
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeApply}
                                    className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-white/75 transition hover:border-white/25 hover:text-white"
                                >
                                    {t('contractorCrew.outreach.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={sendApply}
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

export default SubcontractorMarketplace;


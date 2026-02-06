import React from 'react';
import { useTranslation } from 'react-i18next';

const Academy: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#050810] via-[#050A12] to-[#070C18] px-4 pb-24 pt-24 text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-16 h-[34rem] w-[34rem] rounded-full bg-fuchsia-500/10 blur-[170px]" />
        <div className="absolute right-[-26rem] top-10 h-[42rem] w-[42rem] rounded-full bg-indigo-500/14 blur-[200px]" />
      </div>

      <section className="relative z-10 mx-auto w-full max-w-4xl space-y-6">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.42em] text-primary/70 shadow-[0_0_44px_rgba(245,184,0,0.18)]">
          {t('contractorHub.cards.academy.title')}
        </span>
        <h1 className="text-4xl font-semibold text-white md:text-5xl">
          {t('contractorHub.cards.academy.title')}
        </h1>
        <p className="text-lg text-white/70 md:text-xl">
          {t('contractorHub.cards.academy.description')}
        </p>

        <div className="rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-8 text-sm text-white/70 shadow-[0_30px_120px_rgba(5,9,18,0.65)] backdrop-blur-xl">
          Coming soon.
        </div>
      </section>
    </div>
  );
};

export default Academy;


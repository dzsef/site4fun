import React from 'react';
import { useTranslation } from 'react-i18next';

const References: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">{t('references.title')}</h1>
      <p className="mb-6">{t('references.description')}</p>
      {/* You can add a grid of reference projects or testimonials here */}
    </section>
  );
};

export default References;